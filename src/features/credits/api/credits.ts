import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type {
  BuildingCreditWithEntities,
  CreditRole,
  CreditStatus,
  CreditTier,
  FlagReason,
} from "@/features/credits/types";

const CREDIT_ROLES = [
  "design_architect",
  "architect_of_record",
  "executive_architect",
  "interior_architect",
  "landscape_architect",
  "urban_designer",
  "conservation_architect",
  "structural_engineer",
  "mep_engineer",
  "civil_engineer",
  "geotechnical_engineer",
  "facade_engineer",
  "wind_consultant",
  "acoustic_consultant",
  "fire_engineer",
  "lighting_designer",
  "developer",
  "main_contractor",
  "project_manager",
  "cost_consultant",
  "planning_consultant",
  "graphic_wayfinding_designer",
  "art_consultant",
  "sustainability_consultant",
  "heritage_consultant",
  "other",
] as const satisfies readonly CreditRole[];

const CREDIT_STATUSES = ["active", "verified", "flagged", "hidden"] as const satisfies readonly CreditStatus[];

const FLAG_REASONS = ["wrong_person", "never_involved", "wrong_role", "other"] as const satisfies readonly FlagReason[];

const CREDIT_TIERS = ["primary", "contributor", "ancillary"] as const satisfies readonly CreditTier[];

const AddBuildingCreditSchema = z
  .object({
    buildingId: z.string().uuid(),
    personId: z.string().uuid().nullable().optional(),
    companyId: z.string().uuid().nullable().optional(),
    role: z.enum(CREDIT_ROLES),
    roleCustom: z.string().max(500).nullable().optional(),
    creditTier: z.enum(CREDIT_TIERS).optional(),
    isLead: z.boolean().optional(),
    contributionNotes: z.string().max(10000).nullable().optional(),
    yearFrom: z.number().int().min(1000).max(2100).nullable().optional(),
    yearTo: z.number().int().min(1000).max(2100).nullable().optional(),
    projectUrl: z.string().max(2000).nullable().optional(),
  })
  .strict()
  .refine((d) => d.personId != null || d.companyId != null, {
    message: "At least one of personId or companyId is required",
    path: ["personId"],
  });

export type AddBuildingCreditInput = z.infer<typeof AddBuildingCreditSchema>;

const UpdateCreditStatusSchema = z.object({
  status: z.enum(CREDIT_STATUSES),
});

export type UpdateCreditStatusInput = z.infer<typeof UpdateCreditStatusSchema>;

type PersonEmbed = { id: string; name: string; slug: string } | null;
type CompanyEmbed = { id: string; name: string; slug: string } | null;

type CreditRow = {
  id: string;
  building_id: string;
  person_id: string | null;
  company_id: string | null;
  role: string;
  role_custom: string | null;
  credit_tier: string;
  is_lead: boolean;
  contribution_notes: string | null;
  year_from: number | null;
  year_to: number | null;
  project_url: string | null;
  status: string;
  flag_reason: string | null;
  flag_notes: string | null;
  flagged_at: string | null;
  flagged_by_user_id: string | null;
  added_by_user_id: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  person: PersonEmbed;
  company: CompanyEmbed;
};

const TIER_SORT: Record<CreditTier, number> = {
  primary: 0,
  contributor: 1,
  ancillary: 2,
};

function mapCreditRow(row: CreditRow): BuildingCreditWithEntities {
  return {
    id: row.id,
    buildingId: row.building_id,
    personId: row.person_id,
    companyId: row.company_id,
    role: row.role as CreditRole,
    roleCustom: row.role_custom,
    creditTier: row.credit_tier as CreditTier,
    isLead: row.is_lead,
    contributionNotes: row.contribution_notes,
    yearFrom: row.year_from,
    yearTo: row.year_to,
    projectUrl: row.project_url,
    status: row.status as CreditStatus,
    flagReason: row.flag_reason as FlagReason | null,
    flagNotes: row.flag_notes,
    flaggedAt: row.flagged_at,
    flaggedByUserId: row.flagged_by_user_id,
    addedByUserId: row.added_by_user_id,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    person: row.person,
    company: row.company,
  };
}

function sortCreditsForBuilding(rows: CreditRow[]): CreditRow[] {
  return [...rows].sort((a, b) => {
    const ta = a.credit_tier as CreditTier;
    const tb = b.credit_tier as CreditTier;
    const td = TIER_SORT[ta] - TIER_SORT[tb];
    if (td !== 0) return td;
    if (a.display_order !== b.display_order) return a.display_order - b.display_order;
    return (b.is_lead ? 1 : 0) - (a.is_lead ? 1 : 0);
  });
}

/**
 * Credits for a building: RLS hides `hidden` rows for non-admins.
 * Ordered by `credit_tier`, `display_order`, `is_lead` descending.
 */
export async function getBuildingCredits(buildingId: string): Promise<BuildingCreditWithEntities[]> {
  const { data: rows, error } = await supabase
    .from("building_credits")
    .select(
      `
      *,
      person:people(id, name, slug),
      company:companies(id, name, slug)
    `
    )
    .eq("building_id", buildingId);

  if (error) throw error;
  return sortCreditsForBuilding((rows || []) as CreditRow[]).map(mapCreditRow);
}

/**
 * Insert a credit; requires auth. `personId` / `companyId` validated in Zod (at least one).
 * `added_by_user_id` is set from the session (not the client payload).
 */
export async function addBuildingCredit(input: AddBuildingCreditInput): Promise<BuildingCreditWithEntities> {
  const data = AddBuildingCreditSchema.parse(input);
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  if (!user) throw new Error("Authentication required to add a building credit");

  const { data: topRow, error: orderErr } = await supabase
    .from("building_credits")
    .select("display_order")
    .eq("building_id", data.buildingId)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (orderErr) throw orderErr;
  const displayOrder = (topRow?.display_order != null ? topRow.display_order : -1) + 1;

  const insertRow = {
    building_id: data.buildingId,
    person_id: data.personId ?? null,
    company_id: data.companyId ?? null,
    role: data.role,
    role_custom: data.roleCustom ?? null,
    credit_tier: data.creditTier ?? "contributor",
    is_lead: data.isLead ?? false,
    contribution_notes: data.contributionNotes ?? null,
    year_from: data.yearFrom ?? null,
    year_to: data.yearTo ?? null,
    project_url: data.projectUrl ?? null,
    display_order: displayOrder,
    added_by_user_id: user.id,
  };

  const { data: row, error } = await supabase
    .from("building_credits")
    .insert(insertRow)
    .select(
      `
      *,
      person:people(id, name, slug),
      company:companies(id, name, slug)
    `
    )
    .single();

  if (error) throw error;
  return mapCreditRow(row as CreditRow);
}

/**
 * Sets `status = flagged` with reason, notes, and timestamps.
 * `flagged_by_user_id` is always the authenticated user (`profiles.id`); do not pass a client-supplied user id.
 */
export async function flagCredit(
  creditId: string,
  reason: FlagReason,
  notes: string | null
): Promise<BuildingCreditWithEntities> {
  z.enum(FLAG_REASONS).parse(reason);

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  if (!user) throw new Error("Authentication required to flag a credit");

  const { data: row, error } = await supabase
    .from("building_credits")
    .update({
      status: "flagged",
      flag_reason: reason,
      flag_notes: notes,
      flagged_at: new Date().toISOString(),
      flagged_by_user_id: user.id,
    })
    .eq("id", creditId)
    .select(
      `
      *,
      person:people(id, name, slug),
      company:companies(id, name, slug)
    `
    )
    .maybeSingle();

  if (error) throw error;
  if (!row) throw new Error("Credit not found or not permitted to flag");
  return mapCreditRow(row as CreditRow);
}

/**
 * Updates credit status. RLS restricts who may update; admins (and entity stewards per policy) can succeed.
 */
export async function updateCreditStatus(
  creditId: string,
  input: UpdateCreditStatusInput
): Promise<BuildingCreditWithEntities> {
  const { status } = UpdateCreditStatusSchema.parse(input);

  const { data: row, error } = await supabase
    .from("building_credits")
    .update({ status })
    .eq("id", creditId)
    .select(
      `
      *,
      person:people(id, name, slug),
      company:companies(id, name, slug)
    `
    )
    .maybeSingle();

  if (error) throw error;
  if (!row) throw new Error("Credit not found or not permitted to update");
  return mapCreditRow(row as CreditRow);
}

export type RemoveCreditByTokenError =
  | "invalid_token"
  | "unknown_token"
  | "expired"
  | "already_used"
  | "rpc_error";

export type RemoveCreditByTokenResult =
  | { ok: true; creditId: string }
  | { ok: false; error: RemoveCreditByTokenError };

/** True if the string is exactly 64 hex characters (raw secret from `generate_credit_removal_token`). */
export function isValidRemovalTokenFormat(token: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(token.trim());
}

export function parseRedeemCreditRemovalRpcPayload(data: unknown): RemoveCreditByTokenResult {
  if (!data || typeof data !== "object") return { ok: false, error: "rpc_error" };
  const o = data as Record<string, unknown>;
  if (o.ok === true && typeof o.credit_id === "string") {
    return { ok: true, creditId: o.credit_id };
  }
  const err = o.error;
  if (
    err === "expired" ||
    err === "already_used" ||
    err === "unknown_token" ||
    err === "invalid_token"
  ) {
    return { ok: false, error: err };
  }
  return { ok: false, error: "rpc_error" };
}

/**
 * Redeem a one-time removal link. Calls `redeem_credit_removal_token` (after migration 20270824).
 * Works for signed-out users (`anon`).
 */
export async function removeCreditByToken(token: string): Promise<RemoveCreditByTokenResult> {
  const t = token.trim();
  if (!isValidRemovalTokenFormat(t)) return { ok: false, error: "invalid_token" };

  const { data, error } = await supabase.rpc("redeem_credit_removal_token", {
    p_token_hex: t.toLowerCase(),
  });

  if (error) return { ok: false, error: "rpc_error" };
  return parseRedeemCreditRemovalRpcPayload(data);
}
