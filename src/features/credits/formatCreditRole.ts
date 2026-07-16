import type { CreditRole } from "@/features/credits/types";
import { Constants } from "@/integrations/supabase/types";

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

/** Lowercase a free-text role and collapse separators so near-identical spellings compare equal. */
function normalizeRoleText(text: string): string {
  return text.trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

/**
 * Common free-text wordings of standard roles, mapped to the canonical enum value.
 * Exact-string lookup on the normalized text only — no fuzzy matching.
 */
const CUSTOM_ROLE_ALIASES: Record<string, Exclude<CreditRole, "other">> = {
  "design architect": "design_architecture",
  "architect of record": "architecture_of_record",
  "executive architect": "executive_architecture",
  "interior architect": "interior_architecture",
  "interior design": "interior_architecture",
  "interior designer": "interior_architecture",
  "landscape architect": "landscape_architecture",
  "urban designer": "urban_design",
  "conservation architect": "conservation_architecture",
  "structural engineer": "structural_engineering",
  "mep engineer": "mep_engineering",
  "civil engineer": "civil_engineering",
  "geotechnical engineer": "geotechnical_engineering",
  "facade engineer": "facade_engineering",
  "wind consultant": "wind_consultancy",
  "acoustic consultant": "acoustic_consultancy",
  "fire engineer": "fire_engineering",
  "lighting designer": "lighting_design",
  "developer": "development",
  "main contractor": "main_contracting",
  "general contractor": "main_contracting",
  "contractor": "main_contracting",
  "project manager": "project_management",
  "cost consultant": "cost_consultancy",
  "quantity surveyor": "cost_consultancy",
  "planning consultant": "planning_consultancy",
  "art consultant": "art_consultancy",
  "sustainability consultant": "sustainability_consultancy",
  "heritage consultant": "heritage_consultancy",
};

/** Normalized enum label ("structural engineering") → enum value, built once. */
const ENUM_LABEL_LOOKUP: ReadonlyMap<string, Exclude<CreditRole, "other">> = new Map(
  Constants.public.Enums.credit_role_enum
    .filter((r): r is Exclude<CreditRole, "other"> => r !== "other")
    .map((r) => [normalizeRoleText(formatCreditRoleLabel(r, null)), r]),
);

export interface CreditRoleGroupRef {
  /** Stable grouping key: `role:<enum>` for standard roles, `custom:<normalized>` otherwise. */
  key: string;
  /** Display label for the group — enum casing when the role resolves to a standard one. */
  label: string;
}

/**
 * Resolve the display group for a credit's role. Custom roles that match a standard
 * role's label (case-insensitively) or a known alias merge into the standard group,
 * so "Structural Engineer" and `structural_engineering` share one heading.
 */
export function creditRoleGroup(role: CreditRole, roleCustom: string | null | undefined): CreditRoleGroupRef {
  let resolved: Exclude<CreditRole, "other"> | null = role !== "other" ? role : null;
  if (!resolved && roleCustom?.trim()) {
    const normalized = normalizeRoleText(roleCustom);
    resolved = CUSTOM_ROLE_ALIASES[normalized] ?? ENUM_LABEL_LOOKUP.get(normalized) ?? null;
  }
  if (resolved) {
    return { key: `role:${resolved}`, label: formatCreditRoleLabel(resolved, null) };
  }
  const label = formatCreditRoleLabel(role, roleCustom);
  return { key: `custom:${normalizeRoleText(label)}`, label };
}
