import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getKidSession, saveKidSession, type KidUser } from '@/lib/kidAuth';
import { READING_BANDS } from '@/lib/curriculum';
import { setPreferredVoice } from '@/lib/speech';

interface KidAuthCtx {
  kid: KidUser | null;
  setKid: (u: KidUser | null) => void;
  updateTheme: (t: KidUser['theme']) => void;
  updateAvatar: (data: string) => void;
  updateBand: (b: KidUser['band']) => void;
  /** Clamped to the child's own band — they cannot race past it. */
  updateWcpm: (wcpm: number) => void;
  updateVoice: (voiceURI: string | null) => void;
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

  const updateBand = (band: KidUser['band']) => {
    setKid(kid ? { ...kid, band, wcpm: READING_BANDS[band].targetWcpm } : null);
  };

  const updateWcpm = (wcpm: number) => {
    if (!kid) return;
    const b = READING_BANDS[kid.band];
    setKid({ ...kid, wcpm: Math.min(b.maxWcpm, Math.max(b.minWcpm, wcpm)) });
  };

  const updateVoice = (voiceURI: string | null) => {
    if (!kid) return;
    const next = { ...kid };
    if (voiceURI) next.voiceURI = voiceURI; else delete next.voiceURI;
    setKid(next);
  };

  // The speech engine follows the saved choice
  useEffect(() => {
    setPreferredVoice(kid?.voiceURI ?? null);
  }, [kid?.voiceURI]);

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', kid?.theme ?? 'cream');
  }, [kid?.theme]);

  return (
    <Ctx.Provider value={{ kid, setKid, updateTheme, updateAvatar, updateBand, updateWcpm, updateVoice }}>
      {children}
    </Ctx.Provider>
  );
}

export function useKidAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useKidAuth must be used within KidAuthProvider');
  return ctx;
}
