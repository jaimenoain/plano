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
  "design_architecture",
  "architecture_of_record",
  "executive_architecture",
  "interior_architecture",
  "landscape_architecture",
  "urban_design",
  "conservation_architecture",
  "structural_engineering",
  "mep_engineering",
  "civil_engineering",
  "geotechnical_engineering",
  "facade_engineering",
  "wind_consultancy",
  "acoustic_consultancy",
  "fire_engineering",
  "lighting_design",
  "development",
  "main_contracting",
  "project_management",
  "cost_consultancy",
  "planning_consultancy",
  "graphic_wayfinding_design",
  "art_consultancy",
  "sustainability_consultancy",
  "heritage_consultancy",
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

const UpdateBuildingCreditSchema = z
  .object({
    role: z.enum(CREDIT_ROLES).optional(),
    roleCustom: z.string().max(500).nullable().optional(),
    creditTier: z.enum(CREDIT_TIERS).optional(),
    isLead: z.boolean().optional(),
    contributionNotes: z.string().max(500).nullable().optional(),
    yearFrom: z.number().int().min(1000).max(2100).nullable().optional(),
    yearTo: z.number().int().min(1000).max(2100).nullable().optional(),
    projectUrl: z.string().max(2000).nullable().optional(),
    companyPortfolioRank: z.number().int().min(0).max(1_000_000).nullable().optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update", path: ["role"] })
  .refine(
    (d) =>
      d.role === undefined ||
      d.role !== "other" ||
      (typeof d.roleCustom === "string" && d.roleCustom.trim().length > 0),
    { message: "Describe the role when selecting Other", path: ["roleCustom"] },
  );

export type UpdateBuildingCreditInput = z.infer<typeof UpdateBuildingCreditSchema>;

const UpdateCreditStatusSchema = z.object({
  status: z.enum(CREDIT_STATUSES),
});

export type UpdateCreditStatusInput = z.infer<typeof UpdateCreditStatusSchema>;

type PersonEmbed = { id: string; name: string; slug: string; avatar_url: string | null } | null;
type CompanyEmbed = { id: string; name: string; slug: string; logo_url: string | null } | null;

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
  company_portfolio_rank: number | null;
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
    companyPortfolioRank: row.company_portfolio_rank,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    person: row.person
      ? { id: row.person.id, name: row.person.name, slug: row.person.slug, avatarUrl: row.person.avatar_url }
      : null,
    company: row.company
      ? { id: row.company.id, name: row.company.name, slug: row.company.slug, logoUrl: row.company.logo_url }
      : null,
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

export async function getBuildingCreditsWithClient(
  client: SupabaseClient,
  buildingId: string,
): Promise<BuildingCreditWithEntities[]> {
  const { data: rows, error } = await client
    .from("building_credits")
    .select(
      `
      *,
      person:people(id, name, slug, avatar_url),
      company:companies(id, name, slug, logo_url)
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

  console.log("addBuildingCredit: inserting", insertRow);

  const { data: row, error } = await supabase
    .from("building_credits")
    .insert(insertRow)
    .select(
      `
      *,
      person:people(id, name, slug, avatar_url),
      company:companies(id, name, slug, logo_url)
    `
    )
    .single();

  if (error) {
    console.error("addBuildingCredit: error", error);
    throw error;
  }
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

export async function updateBuildingCredit(
  creditId: string,
  input: UpdateBuildingCreditInput,
): Promise<BuildingCreditWithEntities> {
  const data = UpdateBuildingCreditSchema.parse(input);

  const patch: Record<string, unknown> = {};
  if (data.role !== undefined) patch.role = data.role;
  if (data.roleCustom !== undefined) patch.role_custom = data.roleCustom;
  if (data.creditTier !== undefined) patch.credit_tier = data.creditTier;
  if (data.isLead !== undefined) patch.is_lead = data.isLead;
  if (data.contributionNotes !== undefined) patch.contribution_notes = data.contributionNotes;
  if (data.yearFrom !== undefined) patch.year_from = data.yearFrom;
  if (data.yearTo !== undefined) patch.year_to = data.yearTo;
  if (data.projectUrl !== undefined) patch.project_url = data.projectUrl;
  if (data.companyPortfolioRank !== undefined) patch.company_portfolio_rank = data.companyPortfolioRank;

  const { data: row, error } = await supabase
    .from("building_credits")
    .update(patch)
    .eq("id", creditId)
    .select(
      `
      *,
      person:people(id, name, slug, avatar_url),
      company:companies(id, name, slug, logo_url)
    `,
    )
    .maybeSingle();

  if (error) throw error;
  if (!row) throw new Error("Credit not found or not permitted to update");

  return mapCreditRow(row as CreditRow);
}

export type PrimaryCreditFormEntity = { kind: "person" | "company"; id: string };

/** Embedded `building_credits` row shape from PostgREST selects (person/company joins). */
export type BuildingCreditEmbed = {
  credit_tier?: string | null;
  status?: string | null;
  person?: { id: string; name: string } | null;
  company?: { id: string; name: string } | null;
};

/** All non-hidden credits from an embedded `building_credits` select (profile, review detail, post preview). */
export function visibleCreditSummariesFromEmbed(
  rows: BuildingCreditEmbed[] | null | undefined,
): { id: string; name: string }[] {
  return (rows ?? [])
    .filter((c) => c.status !== "hidden")
    .map((c) => {
      const p = c.person;
      const co = c.company;
      if (p && co) return { id: p.id, name: `${p.name} @ ${co.name}` };
      if (p) return { id: p.id, name: p.name };
      if (co) return { id: co.id, name: co.name };
      return null;
    })
    .filter((x): x is { id: string; name: string } => x != null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

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

/** Row from PostgREST when selecting `building_credits` with `id` + `display_order`. */
export type BuildingCreditEmbedRow = BuildingCreditEmbed & {
  id: string;
  display_order?: number | null;
};

/** For admin merge / edit: primary design credits as tags + row ids for `replacePrimaryDesignCredits`. */
export function primaryDesignCreditRowsToTagsAndRowIds(
  rows: BuildingCreditEmbedRow[] | null | undefined,
): {
  rowIds: string[];
  tags: { id: string; name: string; kind: "person" | "company" }[];
} {
  const raw = rows ?? [];
  const primaryVisible = raw.filter(
    (c) =>
      c.credit_tier === "primary" && (c.status === "active" || c.status === "verified"),
  );
  primaryVisible.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  const rowIds: string[] = [];
  const tags: { id: string; name: string; kind: "person" | "company" }[] = [];
  for (const row of primaryVisible) {
    rowIds.push(row.id);
    const p = row.person;
    const co = row.company;
    if (p && co) tags.push({ id: p.id, name: `${p.name} @ ${co.name}`, kind: "person" });
    else if (p) tags.push({ id: p.id, name: p.name, kind: "person" });
    else if (co) tags.push({ id: co.id, name: co.name, kind: "company" });
  }
  return { rowIds, tags };
}

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
      role: "design_architecture",
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
    p_notes: cleanNotes ?? "",
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
      buildingId?: string;
      buildingName?: string;
      buildingSlug?: string | null;
      buildingShortId?: number | null;
    }
  | { ok: false; error: RemoveCreditByTokenError };

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
    const buildingShortId =
      o.building_short_id === null
        ? null
        : typeof o.building_short_id === "number"
          ? o.building_short_id
          : undefined;
    return {
      ok: true,
      creditId: o.credit_id,
      ...(buildingId !== undefined ? { buildingId, buildingName, buildingSlug, buildingShortId } : {}),
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

export const NotifyCreditedEntitiesSchema = z
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

export async function notifyCreditedEntities(input: NotifyCreditedEntitiesInput): Promise<{ ok: true }> {
  const body = NotifyCreditedEntitiesSchema.parse(input);
  console.log("notifyCreditedEntities: invoking with", body);

  const { data, error } = await supabase.functions.invoke("notify-credited-entities", { body });

  if (error) {
    console.error("Edge Function invocation failed:", error);
    // @ts-ignore
    const payload = error.context?.body;
    if (payload) {
      try {
        const parsed = typeof payload === "string" ? JSON.parse(payload) : payload;
        throw new Error(parsed?.error || error.message);
      } catch {
        throw new Error(error.message);
      }
    }
    throw new Error(error.message);
  }

  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) {
    throw new Error(payload?.error || "Failed to notify entities");
  }

  return { ok: true };
}
