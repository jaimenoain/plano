import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { insertEntityAuditLog } from "@/features/credits/api/entity-audit-log";
import type {
  BuildingCreditWithEntities,
  CreditRole,
  CreditStatus,
  CreditTier,
  FlagReason,
  FlaggedCreditModerationItem,
  PersonClaimStatus,
} from "@/features/credits/types";

/** Ordered list for role dropdowns; matches `credit_role_enum` / `CreditRole`. */
export const CREDIT_ROLES = [
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

export const CREDIT_TIERS = ["primary", "contributor", "ancillary"] as const satisfies readonly CreditTier[];

const AddBuildingCreditSchema = z
  .object({
    buildingId: z.string().uuid(),
    personId: z.string().uuid().nullable().optional(),
    companyId: z.string().uuid().nullable().optional(),
    role: z.enum(CREDIT_ROLES),
    roleCustom: z.string().max(500).nullable().optional(),
    creditTier: z.enum(CREDIT_TIERS).optional(),
    isLead: z.boolean().optional(),
    contributionNotes: z.string().max(500).nullable().optional(),
    yearFrom: z.number().int().min(1000).max(2100).nullable().optional(),
    yearTo: z.number().int().min(1000).max(2100).nullable().optional(),
    projectUrl: z.string().max(2000).nullable().optional(),
  })
  .strict()
  .refine((d) => d.personId != null || d.companyId != null, {
    message: "At least one of personId or companyId is required",
    path: ["personId"],
  })
  .refine(
    (d) =>
      d.role !== "other" ||
      (typeof d.roleCustom === "string" && d.roleCustom.trim().length > 0),
    {
      message: "Describe the role when selecting Other",
      path: ["roleCustom"],
    },
  );

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
  flagged_from_status?: string | null;
  flagged_by_user_id: string | null;
  added_by_user_id: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  person: PersonEmbed;
  company: CompanyEmbed;
};

type ModerationPersonEmbed = {
  id: string;
  name: string;
  slug: string;
  claim_status: string;
} | null;

type ModerationCompanyEmbed = {
  id: string;
  name: string;
  slug: string;
  claim_status: string;
} | null;

type ModerationBuildingEmbed = {
  id: string;
  name: string;
  slug: string | null;
  short_id: number | null;
} | null;

type ModerationAddedByEmbed = { username: string | null } | null;

type ModerationCreditRow = CreditRow & {
  person: ModerationPersonEmbed;
  company: ModerationCompanyEmbed;
  building: ModerationBuildingEmbed;
  added_by: ModerationAddedByEmbed;
};

function mapFlaggedFromStatus(
  v: string | null | undefined,
): Extract<CreditStatus, "active" | "verified"> | null {
  return v === "active" || v === "verified" ? v : null;
}

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
    flaggedFromStatus: mapFlaggedFromStatus(row.flagged_from_status),
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

export function buildingCreditsQueryKey(buildingId: string) {
  return ["building-credits", buildingId] as const;
}

export function adminFlaggedCreditsQueryKey() {
  return ["admin", "flagged-credits"] as const;
}

function mapFlaggedModerationRow(row: ModerationCreditRow): FlaggedCreditModerationItem {
  const base = mapCreditRow(row as CreditRow);
  const building = row.building;
  if (!building) {
    throw new Error("Flagged credit missing building join");
  }
  return {
    ...base,
    person: row.person
      ? {
          id: row.person.id,
          name: row.person.name,
          slug: row.person.slug,
          claimStatus: row.person.claim_status as PersonClaimStatus,
        }
      : null,
    company: row.company
      ? {
          id: row.company.id,
          name: row.company.name,
          slug: row.company.slug,
          claimStatus: row.company.claim_status as PersonClaimStatus,
        }
      : null,
    building: {
      id: building.id,
      name: building.name,
      slug: building.slug,
      shortId: building.short_id,
    },
    addedByUsername: row.added_by?.username ?? null,
  };
}

/**
 * All `status = flagged` credits for the admin moderation queue (admin RLS).
 * Joins building, entities with `claim_status`, and submitter username.
 */
export async function getFlaggedCreditsForAdmin(): Promise<FlaggedCreditModerationItem[]> {
  const { data: rows, error } = await supabase
    .from("building_credits")
    .select(
      `
      *,
      person:people(id, name, slug, claim_status),
      company:companies(id, name, slug, claim_status),
      building:buildings!building_credits_building_id_fkey(id, name, slug, short_id),
      added_by:profiles!building_credits_added_by_user_id_fkey(username)
    `,
    )
    .eq("status", "flagged")
    .order("flagged_at", { ascending: false, nullsFirst: false });

  if (error) throw error;
  return ((rows ?? []) as ModerationCreditRow[]).map(mapFlaggedModerationRow);
}

const NotifyCreditOutcomeSchema = z
  .object({
    creditId: z.string().uuid(),
    outcome: z.enum(["verified", "hidden"]),
  })
  .strict();

export type NotifyCreditOutcomeInput = z.infer<typeof NotifyCreditOutcomeSchema>;

/**
 * Emails `added_by_user_id` after Verify or Hide (Edge Function `notify-credit-outcome`).
 * Caller must have already updated the credit to `verified` or `hidden`.
 */
export async function notifyCreditOutcome(input: NotifyCreditOutcomeInput): Promise<{ ok: true }> {
  const body = NotifyCreditOutcomeSchema.parse(input);
  const { data, error } = await supabase.functions.invoke("notify-credit-outcome", { body });

  const payload = data as { ok?: boolean; error?: string } | null;

  if (error) {
    throw new Error(payload?.error ?? error.message);
  }

  if (!payload?.ok) {
    throw new Error(payload?.error ?? "Notification request failed");
  }

  return { ok: true };
}

/**
 * Credits for a building: RLS hides `hidden` rows for non-admins.
 * Ordered by `credit_tier`, `display_order`, `is_lead` descending.
 */
export async function getBuildingCreditsWithClient(
  client: SupabaseClient,
  buildingId: string,
): Promise<BuildingCreditWithEntities[]> {
  const { data: rows, error } = await client
    .from("building_credits")
    .select(
      `
      *,
      person:people(id, name, slug),
      company:companies(id, name, slug)
    `,
    )
    .eq("building_id", buildingId);

  if (error) throw error;
  return sortCreditsForBuilding((rows || []) as CreditRow[]).map(mapCreditRow);
}

export async function getBuildingCredits(
  buildingId: string,
): Promise<BuildingCreditWithEntities[]> {
  return getBuildingCreditsWithClient(supabase, buildingId);
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
  const mapped = mapCreditRow(row as CreditRow);
  await insertEntityAuditLog({
    actionType: "credit_added",
    targetType: "credit",
    targetId: mapped.id,
    details: {
      building_id: data.buildingId,
      role: data.role,
      credit_tier: mapped.creditTier,
      person_id: mapped.personId,
      company_id: mapped.companyId,
    },
  });
  return mapped;
}

export type PrimaryCreditFormEntity = { kind: "person" | "company"; id: string };

/** Embedded `building_credits` row shape from PostgREST selects (person/company joins). */
export type BuildingCreditEmbed = {
  credit_tier?: string | null;
  status?: string | null;
  person?: { id: string; name: string } | null;
  company?: { id: string; name: string } | null;
};

/** Primary tier, active/verified only — for lists and map cards. */
export function primaryBuildingCreditsToSummaries(
  rows: BuildingCreditEmbed[] | null | undefined,
): { id: string; name: string }[] {
  const raw = rows ?? [];
  const primaryVisible = raw.filter(
    (c) =>
      c.credit_tier === "primary" && (c.status === "active" || c.status === "verified"),
  );
  return primaryVisible
    .map((c) => {
      const p = c.person;
      const co = c.company;
      if (p && co) return { id: p.id, name: `${p.name} @ ${co.name}` };
      if (p) return { id: p.id, name: p.name };
      if (co) return { id: co.id, name: co.name };
      return null;
    })
    .filter((x): x is { id: string; name: string } => x != null);
}

/**
 * Replace primary `design_architect` credits from building edit forms (deletes prior row ids, then inserts via `addBuildingCredit`).
 */
export async function replacePrimaryDesignCredits(
  buildingId: string,
  previousRowIds: string[],
  entities: PrimaryCreditFormEntity[],
): Promise<void> {
  if (previousRowIds.length > 0) {
    const { error: delErr } = await supabase.from("building_credits").delete().in("id", previousRowIds);
    if (delErr) throw delErr;
  }
  for (let i = 0; i < entities.length; i++) {
    const e = entities[i];
    await addBuildingCredit({
      buildingId,
      personId: e.kind === "person" ? e.id : undefined,
      companyId: e.kind === "company" ? e.id : undefined,
      role: "design_architect",
      creditTier: "primary",
      isLead: i === 0,
    });
  }
}

export type FlagCreditRpcError = "not_found_or_not_flaggable" | "notes_too_long" | "rpc_error";

function parseFlagBuildingCreditRpcPayload(data: unknown): { ok: true } | { ok: false; error: FlagCreditRpcError } {
  if (!data || typeof data !== "object") return { ok: false, error: "rpc_error" };
  const o = data as Record<string, unknown>;
  if (o.ok === true) return { ok: true };
  const err = o.error;
  if (err === "not_found_or_not_flaggable" || err === "notes_too_long") {
    return { ok: false, error: err };
  }
  return { ok: false, error: "rpc_error" };
}

/**
 * Sets `status = flagged` with reason, notes, and timestamps via `flag_building_credit` RPC.
 * Works when signed out (`flagged_by_user_id` null). Authenticated users get `flagged_by_user_id` from JWT.
 */
export async function flagCredit(
  creditId: string,
  reason: FlagReason,
  notes: string | null
): Promise<BuildingCreditWithEntities> {
  z.enum(FLAG_REASONS).parse(reason);
  const trimmed = notes?.trim() ?? "";
  const cleanNotes = trimmed.length > 0 ? trimmed.slice(0, 10000) : null;

  const { data, error } = await supabase.rpc("flag_building_credit", {
    p_credit_id: creditId,
    p_reason: reason,
    p_notes: cleanNotes,
  });

  if (error) throw error;

  const parsed = parseFlagBuildingCreditRpcPayload(data);
  if (!parsed.ok) {
    if (parsed.error === "notes_too_long") throw new Error("Notes are too long");
    throw new Error("Could not report this credit");
  }

  const { data: row, error: fetchErr } = await supabase
    .from("building_credits")
    .select(
      `
      *,
      person:people(id, name, slug),
      company:companies(id, name, slug)
    `
    )
    .eq("id", creditId)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!row) throw new Error("Credit not found after report");
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

  const { data: before, error: beforeErr } = await supabase
    .from("building_credits")
    .select("id, building_id, status")
    .eq("id", creditId)
    .maybeSingle();

  if (beforeErr) throw beforeErr;

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
  const mapped = mapCreditRow(row as CreditRow);
  if (before && before.status !== status) {
    await insertEntityAuditLog({
      actionType: "credit_status_changed",
      targetType: "credit",
      targetId: creditId,
      details: {
        building_id: before.building_id,
        old_value: before.status,
        new_value: status,
      },
    });
  }
  return mapped;
}

export type RemoveCreditByTokenError =
  | "invalid_token"
  | "unknown_token"
  | "expired"
  | "already_used"
  | "rpc_error";

export type RemoveCreditByTokenResult =
  | {
      ok: true;
      creditId: string;
      /** Present when RPC returns building fields (migration `20270827000000`). */
      buildingId?: string;
      buildingName?: string;
      buildingSlug?: string | null;
    }
  | { ok: false; error: RemoveCreditByTokenError };

/** True if the string is exactly 64 hex characters (raw secret from `generate_credit_removal_token`). */
export function isValidRemovalTokenFormat(token: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(token.trim());
}

export function parseRedeemCreditRemovalRpcPayload(data: unknown): RemoveCreditByTokenResult {
  if (!data || typeof data !== "object") return { ok: false, error: "rpc_error" };
  const o = data as Record<string, unknown>;
  if (o.ok === true && typeof o.credit_id === "string") {
    const buildingId = typeof o.building_id === "string" ? o.building_id : undefined;
    const buildingName = typeof o.building_name === "string" ? o.building_name : undefined;
    const buildingSlug =
      o.building_slug === null
        ? null
        : typeof o.building_slug === "string"
          ? o.building_slug
          : undefined;
    return {
      ok: true,
      creditId: o.credit_id,
      ...(buildingId !== undefined ? { buildingId, buildingName, buildingSlug } : {}),
    };
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
 * Works for signed-out users (`anon`). Use {@link removeCreditByTokenWithClient} in SSR loaders.
 */
export async function removeCreditByTokenWithClient(
  client: Pick<SupabaseClient, "rpc">,
  token: string
): Promise<RemoveCreditByTokenResult> {
  const t = token.trim();
  if (!isValidRemovalTokenFormat(t)) return { ok: false, error: "invalid_token" };

  const { data, error } = await client.rpc("redeem_credit_removal_token", {
    p_token_hex: t.toLowerCase(),
  });

  if (error) return { ok: false, error: "rpc_error" };
  return parseRedeemCreditRemovalRpcPayload(data);
}

export async function removeCreditByToken(token: string): Promise<RemoveCreditByTokenResult> {
  return removeCreditByTokenWithClient(supabase, token);
}

const NotifyCreditedEntitiesSchema = z
  .object({
    creditIds: z
      .array(z.string().uuid())
      .min(1)
      .max(50)
      .refine((ids) => new Set(ids).size === ids.length, { message: "Duplicate credit id" }),
    emails: z.array(z.string().email()).min(1).max(15),
  })
  .strict();

export type NotifyCreditedEntitiesInput = z.infer<typeof NotifyCreditedEntitiesSchema>;

/**
 * After adding credits, sends one email per recipient via Edge Function `notify-credited-entities`
 * (manual JWT verification; mints removal tokens server-side; logs hashes only to `credit_notification_log`).
 */
export async function notifyCreditedEntities(input: NotifyCreditedEntitiesInput): Promise<{ ok: true }> {
  const body = NotifyCreditedEntitiesSchema.parse(input);
  const { data, error } = await supabase.functions.invoke("notify-credited-entities", { body });

  const payload = data as { ok?: boolean; error?: string } | null;

  if (error) {
    throw new Error(payload?.error ?? error.message);
  }

  if (!payload?.ok) {
    throw new Error(payload?.error ?? "Notification request failed");
  }

  return { ok: true };
}
