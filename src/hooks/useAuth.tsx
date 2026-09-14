import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, SUPABASE_FUNCTIONS_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
import { configureRevenueCat, logoutRevenueCatUser } from '@/lib/revenuecat';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ user: User | null; error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  /** `reload` asks the caller to hard-reload, resetting all in-memory auth state. */
  deleteAccount: () => Promise<{ error: Error | null; reload?: boolean }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** supabase-js stores the session under `sb-<project-ref>-auth-token`. */
function findAuthStorageKey(): string | null {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && /^sb-.*-auth-token$/.test(key)) return key;
  }
  return null;
}

/**
 * Read the access token from storage without going through supabase.auth.
 * Deliberately lock-free — see the note in deleteAccount.
 */
function readStoredAccessToken(): string | null {
  try {
    const key = findAuthStorageKey();
    if (!key) return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.access_token ?? parsed?.currentSession?.access_token ?? null;
  } catch {
    return null;
  }
}

/** Drop the stored session without going through supabase.auth. */
function clearStoredSession(): void {
  try {
    const key = findAuthStorageKey();
    if (key) localStorage.removeItem(key);
  } catch {
    // Storage unavailable — the reload below still resets in-memory state.
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);

        // Keep RevenueCat (native IAP) identity in sync with the signed-in user.
        if (event === 'SIGNED_OUT') {
          logoutRevenueCatUser();
        } else if (session?.user) {
          configureRevenueCat(session.user.id);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      // Configure RevenueCat with the existing user (or anonymously if none).
      configureRevenueCat(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    const redirectUrl = "https://kin-txt.com/login?verified=true";

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName,
        },
      },
    });
    return { user: data.user, error: error as Error | null };
  };

  const signOut = async () => {
    await logoutRevenueCatUser();
    await supabase.auth.signOut();
  };

  // Permanently delete the user's account (Apple Guideline 5.1.1(v)).
  // Calls a service-role edge function; related rows cascade via FK constraints.
  const deleteAccount = async () => {
    try {
      // Nothing here may hang: this runs behind a modal, so a promise that
      // never settles leaves the whole app frozen with no way out.
      const guard = <T,>(p: Promise<T>, ms: number, label: string): Promise<T> =>
        Promise.race([
          p,
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timed out. Check your connection and try again.`)), ms),
          ),
        ]);

      // Read the token straight out of storage rather than via getSession():
      // every supabase.auth.* call serialises on a shared lock.
      const accessToken = readStoredAccessToken();
      if (!accessToken) {
        return { error: new Error('You appear to be signed out. Sign in again, then retry.') };
      }

      // Plain fetch, NOT supabase.functions.invoke. invoke() routes through
      // SupabaseClient.fetch -> _getAccessToken() -> auth.getSession(), so it
      // takes the auth lock even when the Authorization header is supplied by
      // hand. onAuthStateChange calls into the RevenueCat native bridge while
      // that lock is held, and the two together wedge this flow behind the
      // modal with no error. A direct fetch touches none of it.
      const res = await guard(
        fetch(`${SUPABASE_FUNCTIONS_URL}/delete-account`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
        }),
        20000,
        'Deleting your account',
      );

      if (!res.ok) {
        let message = `Delete failed (HTTP ${res.status})`;
        try {
          const body = await res.json();
          if (body?.error) message = body.error;
        } catch {
          // Body was not JSON — keep the status-based message.
        }
        console.error('delete-account failed:', message);
        return { error: new Error(message) };
      }

      // Deleted server-side, so the token is dead and there is no session left
      // to sign out of. Clear the stored session directly — calling
      // supabase.auth.signOut() here would take the auth lock and fire the
      // native RevenueCat call from inside it, which is exactly the hang this
      // flow has to avoid. A hard reload then drops all in-memory auth state.
      clearStoredSession();
      return { error: null, reload: true };
    } catch (err) {
      console.error('delete-account threw:', err);
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error as Error | null };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password: password
    });
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signIn, signUp, signOut, resetPassword, updatePassword, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
