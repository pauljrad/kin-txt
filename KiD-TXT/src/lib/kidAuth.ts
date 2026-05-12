// ─── KiD-TXT Auth ───────────────────────────────────────────────
// Simple local school auth. No password — just first name + pupil ID.
// In production this would validate against a school database.
// ──────────────────────────────────────────────────────────────────

export interface KidUser {
  name: string;
  pupilId: string;
  avatarData?: string; // base64 drawing
  theme: 'cream' | 'blue' | 'green' | 'pink';
}

const SESSION_KEY = 'kid_txt_session';

// Hardcoded school pupils (demo). Add more as needed.
const REGISTERED_PUPILS: { name: string; pupilId: string }[] = [
  { name: 'RUGRAT', pupilId: '12345' },
];

export function loginKid(name: string, pupilId: string): KidUser | null {
  const normalizedName = name.trim().toUpperCase();
  const normalizedId = pupilId.trim();

  const match = REGISTERED_PUPILS.find(
    (p) => p.name === normalizedName && p.pupilId === normalizedId
  );

  if (!match) return null;

  // Load existing saved profile if it exists
  const existing = getKidSession();
  if (existing && existing.pupilId === normalizedId) {
    return existing;
  }

  const user: KidUser = {
    name: match.name,
    pupilId: match.pupilId,
    theme: 'cream',
  };

  saveKidSession(user);
  return user;
}

export function getKidSession(): KidUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
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
