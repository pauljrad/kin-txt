// ─── KiD-TXT Auth ───────────────────────────────────────────────
// Simple local school auth. No password — just first name + pupil ID.
// In production this would validate against a school database.
// ──────────────────────────────────────────────────────────────────

export interface KidUser {
  name: string;
  pupilId: string;
  avatarData?: string; // base64 drawing
  theme: 'cream' | 'blue' | 'green' | 'pink';
  /** Reading band. Gemstone-named so the child cannot read off a year group. */
  band: BandKey;
  /** Words per minute the child currently reads at, within their band. */
  wcpm: number;
  /** voiceURI of the chosen device voice; unset means the best available. */
  voiceURI?: string;
  /** A realistic cloud voice. When set it is used instead of any device voice. */
  cloudVoice?: string;
}

import { READING_BANDS, type BandKey } from './curriculum';

const SESSION_KEY = 'kid_txt_session';

// Hardcoded school pupils (demo). A real deployment reads the band
// from the school's assessment data, not from the child.
const REGISTERED_PUPILS: { name: string; pupilId: string; band: BandKey }[] = [
  { name: 'RUGRAT', pupilId: '12345', band: 'topaz' },
];

export function loginKid(name: string, pupilId: string): KidUser | null {
  const normalizedName = name.trim().toUpperCase();
  const normalizedId = pupilId.trim();

  const match = REGISTERED_PUPILS.find(
    (p) => p.name === normalizedName && p.pupilId === normalizedId
  );

  if (!match) return null;

  // The teacher may have moved this child since they last logged in
  let override: BandKey | undefined;
  try {
    override = (JSON.parse(localStorage.getItem('kid_txt_band_overrides') ?? '{}') as Record<string, BandKey>)[normalizedId];
  } catch { /* none */ }

  // Load existing saved profile if it exists
  const existing = getKidSession();
  if (existing && existing.pupilId === normalizedId) {
    if (override && existing.band !== override) {
      const moved = { ...existing, band: override, wcpm: READING_BANDS[override].targetWcpm };
      saveKidSession(moved);
      return moved;
    }
    return existing;
  }

  const band = override ?? match.band;
  const user: KidUser = {
    name: match.name,
    pupilId: match.pupilId,
    theme: 'cream',
    band,
    wcpm: READING_BANDS[band].targetWcpm,
  };

  saveKidSession(user);
  return user;
}

export function getKidSession(): KidUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as KidUser & { aiVoiceId?: string };
    // An earlier build stored an AI voice choice; it must not linger.
    if ('aiVoiceId' in user) { delete user.aiVoiceId; saveKidSession(user); }
    // Profiles saved before bands existed need defaults.
    if (!user.band || !READING_BANDS[user.band]) user.band = 'topaz';
    if (typeof user.wcpm !== 'number') user.wcpm = READING_BANDS[user.band].targetWcpm;
    return user;
  } catch {
    return null;
  }
}

export function saveKidSession(user: KidUser): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function logoutKid(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function updateKidTheme(theme: KidUser['theme']): void {
  const session = getKidSession();
  if (session) {
    saveKidSession({ ...session, theme });
  }
}

export function updateKidAvatar(avatarData: string): void {
  const session = getKidSession();
  if (session) {
    saveKidSession({ ...session, avatarData });
  }
}

export function updateKidBand(band: KidUser['band']): void {
  const session = getKidSession();
  if (session) {
    // Moving band resets speed to that band's target.
    saveKidSession({ ...session, band, wcpm: READING_BANDS[band].targetWcpm });
  }
}

/** Clamp a requested speed to the child's own band. */
export function updateKidWcpm(wcpm: number): void {
  const session = getKidSession();
  if (session) {
    const b = READING_BANDS[session.band];
    saveKidSession({ ...session, wcpm: Math.min(b.maxWcpm, Math.max(b.minWcpm, wcpm)) });
  }
}

export function updateKidVoice(voiceURI: string | null): void {
  const session = getKidSession();
  if (session) {
    const next = { ...session };
    if (voiceURI) next.voiceURI = voiceURI; else delete next.voiceURI;
    saveKidSession(next);
  }
}

export function updateKidCloudVoice(cloudVoice: string | null): void {
  const session = getKidSession();
  if (session) {
    const next = { ...session };
    if (cloudVoice) next.cloudVoice = cloudVoice; else delete next.cloudVoice;
    saveKidSession(next);
  }
}
