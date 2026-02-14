import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
export const AVATAR_COLORS = [
  "#FFD600", // Kin Yellow
  "#F97316", // Orange
  "#0EA5E9", // Sky Blue
  "#D946EF", // Magenta
  "#10B981", // Emerald
  "#6366F1", // Indigo
  "#F43F5E", // Rose
  "#8B5CF6", // Violet
];

export function getAvatarColor(userId: string | null | undefined, customColor: string | null | undefined): string {
  if (customColor) return customColor;
  if (!userId) return AVATAR_COLORS[0];

  // Simple deterministic hash based on userId
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}
