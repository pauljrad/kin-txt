import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getKidSession, saveKidSession, type KidUser } from '@/lib/kidAuth';

interface KidAuthCtx {
  kid: KidUser | null;
  setKid: (u: KidUser | null) => void;
  updateTheme: (t: KidUser['theme']) => void;
  updateAvatar: (data: string) => void;
}

const Ctx = createContext<KidAuthCtx | undefined>(undefined);

export function KidAuthProvider({ children }: { children: ReactNode }) {
  const [kid, setKidState] = useState<KidUser | null>(() => getKidSession());

  const setKid = (u: KidUser | null) => {
    setKidState(u);
    if (u) saveKidSession(u); 
  };

  const updateTheme = (theme: KidUser['theme']) => {
    setKid(kid ? { ...kid, theme } : null);
  };

  const updateAvatar = (avatarData: string) => {
    setKid(kid ? { ...kid, avatarData } : null);
  };

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', kid?.theme ?? 'cream');
  }, [kid?.theme]);

  return (
    <Ctx.Provider value={{ kid, setKid, updateTheme, updateAvatar }}>
      {children}
    </Ctx.Provider>
  );
}

export function useKidAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useKidAuth must be used within KidAuthProvider');
  return ctx;
}
