// ─── Teacher login ───────────────────────────────────────────────
// Separate from the pupil login. In production this is a school
// account; for the demo it is a name and a passcode.
// ──────────────────────────────────────────────────────────────────

export interface Teacher {
  name: string;
  display: string;
  className: string;
}

const SESSION_KEY = 'kid_txt_teacher';

const TEACHERS: { name: string; code: string; display: string; className: string }[] = [
  { name: 'PATEL', code: '1234', display: 'Mrs Patel', className: 'Class 4P' },
];

export function loginTeacher(name: string, code: string): Teacher | null {
  const n = name.trim().toUpperCase().replace(/^(MR|MRS|MS|MISS)\s+/, '');
  const match = TEACHERS.find((t) => t.name === n && t.code === code.trim());
  if (!match) return null;
  const teacher: Teacher = { name: match.name, display: match.display, className: match.className };
  localStorage.setItem(SESSION_KEY, JSON.stringify(teacher));
  return teacher;
}

export function getTeacherSession(): Teacher | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Teacher) : null;
  } catch {
    return null;
  }
}

export function logoutTeacher(): void {
  localStorage.removeItem(SESSION_KEY);
}
