import type { CreditRole } from "@/features/credits/types";

/** Human-readable label for credit role enums; uses `roleCustom` when role is `other`. */
export function formatCreditRoleLabel(role: CreditRole, roleCustom: string | null | undefined): string {
  if (role === "other" && roleCustom?.trim()) return roleCustom.trim();
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
