import type { UserProfile } from "@/features/profile/hooks/useUserProfile";

function normalizeEmailList(raw: string | undefined): string[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Superadmin card playground and similar tools: app admins, or emails listed in
 * `VITE_SUPERADMIN_EMAILS` (comma-separated, case-insensitive).
 */
export function isSuperadminAccess(
  profile: UserProfile | null,
  authEmail: string | null | undefined,
): boolean {
  if (profile?.role === "admin" || profile?.role === "app_admin") return true;
  const email = authEmail?.trim().toLowerCase();
  if (!email) return false;
  const allow = normalizeEmailList(import.meta.env.VITE_SUPERADMIN_EMAILS);
  return allow.includes(email);
}
