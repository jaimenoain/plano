import type { CreditRole } from "@/features/credits/types";

/** Human-readable label for credit role enums; uses `roleCustom` when role is `other`. */
export function formatCreditRoleLabel(role: CreditRole, roleCustom: string | null | undefined): string {
  if (role === "other" && roleCustom?.trim()) {
    const v = roleCustom.trim();
    // Capitalize each word for display
    return v
      .split(/[\s_-]+/)
      .map((part) => (part.length === 0 ? "" : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()))
      .join(" ");
  }
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
