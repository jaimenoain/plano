import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { slugifyPersonName } from "@/features/credits/api/people";
import { supabase } from "@/integrations/supabase/client";
import type {
  BuildingCreditWithEntities,
  BuildingSummaryForPersonCredit,
  Company,
  CompanyCreditWithBuilding,
  CompanyPortfolioByTier,
  CompanyPortfolioItem,
  CompanySteward,
  CompanyStewardWithProfile,
  CompanySummary,
  CompanyWithCredits,
  CreditRole,
  CreditStatus,
  CreditTier,
  FlagReason,
} from "@/features/credits/types";

/** Company slugs use the same SQL helper as people: `public.slugify_person_name`. */
export const slugifyCompanyName = slugifyPersonName;

/** TanStack Query key for `getCompany(slug)` payloads (`CompanyWithCredits`). */
export function companyQueryKey(slug: string) {
  return ["company", slug] as const;
}

/** TanStack Query key for steward list with profiles (stewards / admins only under RLS). */
export function companyStewardsQueryKey(companyId: string) {
  return ["company-stewards", companyId] as const;
}

const CreateCompanySchema = z.object({
  name: z.string().min(1).max(500).trim(),
  bio: z.string().max(10000).nullable().optional(),
  country: z.string().max(200).nullable().optional(),
  foundedYear: z.number().int().min(0).max(3000).nullable().optional(),
  dissolvedYear: z.number().int().min(0).max(3000).nullable().optional(),
  logoUrl: z.string().max(2000).nullable().optional(),
  website: z.string().max(2000).nullable().optional(),
  verifiedDomain: z.string().max(500).nullable().optional(),
});

export type CreateCompanyInput = z.infer<typeof CreateCompanySchema>;

const UpdateCompanySchema = z
  .object({
    name: z.string().min(1).max(500).trim().optional(),
    bio: z.string().max(10000).nullable().optional(),
    country: z.string().max(200).nullable().optional(),
    foundedYear: z.number().int().min(0).max(3000).nullable().optional(),
    dissolvedYear: z.number().int().min(0).max(3000).nullable().optional(),
    logoUrl: z.string().max(2000).nullable().optional(),
    website: z.string().max(2000).nullable().optional(),
    verifiedDomain: z.string().max(500).nullable().optional(),
  })
  .strict();

export type UpdateCompanyInput = z.infer<typeof UpdateCompanySchema>;

type CompanyRow = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  country: string | null;
  founded_year: number | null;
  dissolved_year: number | null;
  logo_url: string | null;
  website: string | null;
  verified_domain: string | null;
  claim_status: string;
  created_at: string;
  updated_at: string;
};

type PersonEmbed = { id: string; name: string; slug: string } | null;
type CompanyEmbed = { id: string; name: string; slug: string } | null;
type BuildingEmbed = {
  id: string;
  name: string;
  slug: string | null;
  short_id: number | null;
  city: string | null;
  country: string | null;
  year_completed: number | null;
  hero_image_url: string | null;
  main_image_url: string | null;
  community_preview_url: string | null;
} | null;

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
  building: BuildingEmbed;
};

type StewardRow = {
  id: string;
  company_id: string;
  user_id: string;
  role: string;
  invited_by: string | null;
  created_at: string;
};

function mapCompany(row: CompanyRow): Company {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    bio: row.bio,
    country: row.country,
    foundedYear: row.founded_year,
    dissolvedYear: row.dissolved_year,
    logoUrl: row.logo_url,
    website: row.website,
    verifiedDomain: row.verified_domain,
    claimStatus: row.claim_status as Company["claimStatus"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBuildingSummary(b: BuildingEmbed): BuildingSummaryForPersonCredit | null {
  if (!b) return null;
  return {
    id: b.id,
    name: b.name,
    slug: b.slug,
    shortId: b.short_id,
    city: b.city,
    country: b.country,
    yearCompleted: b.year_completed,
    heroImageUrl: b.hero_image_url,
    mainImageUrl: b.main_image_url,
    communityPreviewUrl: b.community_preview_url,
  };
}

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

const TIER_SORT: Record<CreditTier, number> = {
  primary: 0,
  contributor: 1,
  ancillary: 2,
};

function sortCreditsForCompany<T extends { creditTier: CreditTier; displayOrder: number; isLead: boolean }>(
  rows: T[]
): T[] {
  return [...rows].sort((a, b) => {
    const td = TIER_SORT[a.creditTier] - TIER_SORT[b.creditTier];
    if (td !== 0) return td;
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    return (b.isLead ? 1 : 0) - (a.isLead ? 1 : 0);
  });
}

function sortCreditRows(rows: CreditRow[]): CreditRow[] {
  return [...rows].sort((a, b) => {
    const ta = a.credit_tier as CreditTier;
    const tb = b.credit_tier as CreditTier;
    const td = TIER_SORT[ta] - TIER_SORT[tb];
    if (td !== 0) return td;
    if (a.display_order !== b.display_order) return a.display_order - b.display_order;
    return (b.is_lead ? 1 : 0) - (a.is_lead ? 1 : 0);
  });
}

async function allocateUniqueCompanySlug(name: string): Promise<string> {
  const base = slugifyCompanyName(name) ?? "company";
  let candidate = base;
  let n = 2;
  for (;;) {
    const { data, error } = await supabase.from("companies").select("id").eq("slug", candidate).maybeSingle();
    if (error) throw error;
    if (!data) return candidate;
    candidate = `${base}-${n}`;
    n += 1;
  }
}

function mapSteward(row: StewardRow): CompanySteward {
  return {
    id: row.id,
    companyId: row.company_id,
    userId: row.user_id,
    role: row.role as CompanySteward["role"],
    invitedBy: row.invited_by,
    createdAt: row.created_at,
  };
}

const creditSelectWithJoins = `
  *,
  person:people(id, name, slug),
  company:companies(id, name, slug),
  building:buildings(id, name, slug, short_id, city, country, year_completed, hero_image_url, main_image_url, community_preview_url)
`;

/**
 * Company by slug with all credits visible under RLS, each joined to a building summary.
 * Returns `null` if no row matches.
 */
export async function getCompanyWithClient(
  client: SupabaseClient,
  slug: string
): Promise<CompanyWithCredits | null> {
  const { data: companyRow, error: cErr } = await client
    .from("companies")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (cErr) throw cErr;
  if (!companyRow) return null;

  const company = mapCompany(companyRow as CompanyRow);
  const companySummary = { id: company.id, name: company.name, slug: company.slug };

  const { data: creditRows, error: crErr } = await client
    .from("building_credits")
    .select(creditSelectWithJoins)
    .eq("company_id", company.id);

  if (crErr) throw crErr;

  const credits: CompanyCreditWithBuilding[] = sortCreditsForCompany(
    (creditRows || []).map((raw) => {
      const row = raw as CreditRow;
      const building = mapBuildingSummary(row.building);
      if (!building) {
        throw new Error(`building_credits ${row.id} missing building join`);
      }
      const credit = mapCreditRow(row);
      return {
        ...credit,
        company: credit.company ?? companySummary,
        building,
      };
    })
  );

  return { company, credits };
}

/**
 * Company by slug (browser Supabase client).
 */
export async function getCompany(slug: string): Promise<CompanyWithCredits | null> {
  return getCompanyWithClient(supabase, slug);
}

/**
 * Fuzzy name search; returns `CompanySummary` rows.
 */
export async function searchCompanies(query: string): Promise<CompanySummary[]> {
  const q = query.trim().replace(/[%_]/g, "").slice(0, 200);
  if (!q) return [];

  const { data: rows, error } = await supabase
    .from("companies")
    .select("id, name, slug, claim_status, country, logo_url")
    .ilike("name", `%${q}%`)
    .limit(25);

  if (error) throw error;
  if (!rows?.length) return [];

  const ids = rows.map((r) => r.id as string);
  const countResults = await Promise.all(
    ids.map(async (companyId) => {
      const { count, error: cErr } = await supabase
        .from("building_credits")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId);
      if (cErr) throw cErr;
      return [companyId, count ?? 0] as const;
    }),
  );
  const countById = new Map(countResults);

  return rows.map((r) => {
    const id = r.id as string;
    return {
      id,
      name: r.name as string,
      slug: r.slug as string,
      claimStatus: r.claim_status as CompanySummary["claimStatus"],
      country: r.country as string | null,
      logoUrl: r.logo_url as string | null,
      creditCount: countById.get(id) ?? 0,
    };
  });
}

/**
 * Insert a company; slug is generated with `-2`, `-3`, … suffixes on collision.
 */
export async function createCompany(input: CreateCompanyInput): Promise<Company> {
  const data = CreateCompanySchema.parse(input);
  const slug = await allocateUniqueCompanySlug(data.name);

  const insertRow = {
    id: crypto.randomUUID(),
    name: data.name,
    slug,
    bio: data.bio ?? null,
    country: data.country ?? null,
    founded_year: data.foundedYear ?? null,
    dissolved_year: data.dissolvedYear ?? null,
    logo_url: data.logoUrl ?? null,
    website: data.website ?? null,
    verified_domain: data.verifiedDomain ?? null,
  };

  const { data: row, error } = await supabase.from("companies").insert(insertRow).select("*").single();

  if (error) throw error;
  return mapCompany(row as CompanyRow);
}

/**
 * Partial update; RLS restricts to stewards or admin.
 */
export async function updateCompany(id: string, input: UpdateCompanyInput): Promise<Company | null> {
  const data = UpdateCompanySchema.parse(input);
  if (Object.keys(data).length === 0) {
    const { data: row, error } = await supabase.from("companies").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return row ? mapCompany(row as CompanyRow) : null;
  }

  const patch: Record<string, unknown> = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.bio !== undefined) patch.bio = data.bio;
  if (data.country !== undefined) patch.country = data.country;
  if (data.foundedYear !== undefined) patch.founded_year = data.foundedYear;
  if (data.dissolvedYear !== undefined) patch.dissolved_year = data.dissolvedYear;
  if (data.logoUrl !== undefined) patch.logo_url = data.logoUrl;
  if (data.website !== undefined) patch.website = data.website;
  if (data.verifiedDomain !== undefined) patch.verified_domain = data.verifiedDomain;

  const { data: row, error } = await supabase.from("companies").update(patch).eq("id", id).select("*").maybeSingle();

  if (error) throw error;
  return row ? mapCompany(row as CompanyRow) : null;
}

/**
 * All credits for the company with building summaries, grouped by `credit_tier`.
 * When `roleFilter` is set, only credits with that `role` are included.
 */
export async function getCompanyPortfolio(
  companyId: string,
  roleFilter?: CreditRole
): Promise<CompanyPortfolioByTier> {
  const empty: CompanyPortfolioByTier = { primary: [], contributor: [], ancillary: [] };

  const { data: companyRow, error: coErr } = await supabase
    .from("companies")
    .select("id, name, slug")
    .eq("id", companyId)
    .maybeSingle();

  if (coErr) throw coErr;
  if (!companyRow) return empty;

  const companySummary = {
    id: companyRow.id as string,
    name: companyRow.name as string,
    slug: companyRow.slug as string,
  };

  let creditsQuery = supabase.from("building_credits").select(creditSelectWithJoins).eq("company_id", companyId);
  if (roleFilter !== undefined) {
    creditsQuery = creditsQuery.eq("role", roleFilter);
  }

  const { data: creditRows, error: crErr } = await creditsQuery;

  if (crErr) throw crErr;

  const sorted = sortCreditRows((creditRows || []) as CreditRow[]);

  for (const row of sorted) {
    const building = mapBuildingSummary(row.building);
    if (!building) continue;

    const baseCredit = mapCreditRow(row);
    const credit = { ...baseCredit, company: baseCredit.company ?? companySummary };

    const item: CompanyPortfolioItem = { credit, building };
    const tier = credit.creditTier;
    if (tier === "primary") empty.primary.push(item);
    else if (tier === "contributor") empty.contributor.push(item);
    else empty.ancillary.push(item);
  }

  return empty;
}

/**
 * Stewards for a company. RLS returns no rows unless the current user is admin, a steward of this company, or listed on a row.
 */
export async function getCompanyStewards(companyId: string): Promise<CompanySteward[]> {
  const { data: rows, error } = await supabase
    .from("company_stewards")
    .select("id, company_id, user_id, role, invited_by, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (rows || []).map((r) => mapSteward(r as StewardRow));
}

type StewardProfileEmbed = { username: string | null; avatar_url: string | null } | null;

type StewardRowWithProfile = StewardRow & { profile: StewardProfileEmbed };

function mapStewardWithProfile(row: StewardRowWithProfile): CompanyStewardWithProfile {
  const base = mapSteward(row);
  const p = row.profile;
  return {
    ...base,
    username: p?.username ?? null,
    avatarUrl: p?.avatar_url ?? null,
  };
}

/**
 * Stewards with `profiles` username/avatar for display. RLS returns rows only for stewards of this company (or self).
 */
export async function getCompanyStewardsWithProfiles(companyId: string): Promise<CompanyStewardWithProfile[]> {
  const { data: rows, error } = await supabase
    .from("company_stewards")
    .select(
      "id, company_id, user_id, role, invited_by, created_at, profile:profiles!company_stewards_user_id_fkey(username, avatar_url)"
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (rows || []).map((r) => mapStewardWithProfile(r as StewardRowWithProfile));
}

/**
 * Remove a steward row. RLS: owners may remove `steward` role rows; any user may remove their own row.
 */
export async function removeCompanySteward(stewardRowId: string): Promise<void> {
  const { error } = await supabase.from("company_stewards").delete().eq("id", stewardRowId);
  if (error) throw error;
}

/**
 * Owner-only: creates a pending invite and emails the recipient when `RESEND_API_KEY` is configured on the function.
 */
export async function inviteCompanySteward(companyId: string, email: string): Promise<{ ok: true; inviteId: string }> {
  const { data, error } = await supabase.functions.invoke("invite-company-steward", {
    body: { companyId, email: email.trim() },
  });

  const body = data as { ok?: boolean; inviteId?: string; error?: string } | null;

  if (error) {
    throw new Error(body?.error ?? error.message);
  }

  if (!body?.ok || !body.inviteId) {
    throw new Error(body?.error ?? "Invite failed");
  }

  return { ok: true, inviteId: body.inviteId };
}

export type RedeemCompanyStewardInviteResult =
  | { ok: true; companySlug: string }
  | { ok: false; error: string };

/**
 * Logged-in user accepts invite from email link (`redeem_company_steward_invite` RPC).
 */
export async function redeemCompanyStewardInvite(tokenHex: string): Promise<RedeemCompanyStewardInviteResult> {
  const trimmed = tokenHex.trim();
  const { data, error } = await supabase.rpc("redeem_company_steward_invite", {
    p_token_hex: trimmed,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const raw = data as { ok?: boolean; error?: string; company_slug?: string } | null;
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "unknown_response" };
  }
  if (raw.ok === true && typeof raw.company_slug === "string") {
    return { ok: true, companySlug: raw.company_slug };
  }
  const err = typeof raw.error === "string" ? raw.error : "redeem_failed";
  return { ok: false, error: err };
}

/** 64-char hex secret for `company_claim_verification_tokens` (same shape as steward invites). */
export function isValidCompanyClaimTokenFormat(token: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(token.trim());
}

export type RedeemCompanyClaimTokenError =
  | "not_authenticated"
  | "invalid_token"
  | "unknown_token"
  | "expired"
  | "already_used"
  | "wrong_user"
  | "not_claimable"
  | "rpc_error";

export type RedeemCompanyClaimTokenResult =
  | { ok: true; companySlug: string }
  | { ok: false; error: RedeemCompanyClaimTokenError };

export function parseRedeemCompanyClaimRpcPayload(data: unknown): RedeemCompanyClaimTokenResult {
  if (!data || typeof data !== "object") return { ok: false, error: "rpc_error" };
  const o = data as Record<string, unknown>;
  if (o.ok === true && typeof o.company_slug === "string") {
    return { ok: true, companySlug: o.company_slug };
  }
  const err = o.error;
  if (
    err === "not_authenticated" ||
    err === "invalid_token" ||
    err === "unknown_token" ||
    err === "expired" ||
    err === "already_used" ||
    err === "wrong_user" ||
    err === "not_claimable"
  ) {
    return { ok: false, error: err };
  }
  return { ok: false, error: "rpc_error" };
}

/**
 * Completes first company claim from email link (`redeem_company_claim_token` RPC, migration `20270829`).
 */
export async function redeemCompanyClaimTokenWithClient(
  client: Pick<SupabaseClient, "rpc" | "auth">,
  token: string
): Promise<RedeemCompanyClaimTokenResult> {
  const t = token.trim().toLowerCase();
  if (!isValidCompanyClaimTokenFormat(t)) return { ok: false, error: "invalid_token" };

  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  const { data, error } = await client.rpc("redeem_company_claim_token", {
    p_token_hex: t,
  });

  if (error) return { ok: false, error: "rpc_error" };
  return parseRedeemCompanyClaimRpcPayload(data);
}

export type RequestCompanyClaimVerificationResult =
  | { ok: true }
  | { action: "dispute"; companySlug: string };

/**
 * Starts work-email verification for claiming an unclaimed company (`verify-company-claim` Edge Function).
 * When the company is already claimed and `verified_domain` does not match the email domain, returns `action: "dispute"`.
 */
export async function requestCompanyClaimVerification(
  companyId: string,
  email: string
): Promise<RequestCompanyClaimVerificationResult> {
  const parsed = z.string().email().max(320).safeParse(email.trim().toLowerCase());
  if (!parsed.success) {
    throw new Error("Enter a valid work email address.");
  }

  const { data, error } = await supabase.functions.invoke("verify-company-claim", {
    body: { companyId, email: parsed.data },
  });

  const body = data as {
    ok?: boolean;
    action?: string;
    companySlug?: string;
    error?: string;
  } | null;

  if (!error && body?.action === "dispute" && typeof body.companySlug === "string") {
    return { action: "dispute", companySlug: body.companySlug };
  }

  if (error) {
    const code = body?.error;
    if (code === "already_claimed") {
      throw new Error("This company is already managed on Plano.");
    }
    if (code === "already_member") {
      throw new Error("You already have access to this company.");
    }
    throw new Error(typeof code === "string" ? code : error.message);
  }

  if (body?.ok === true) {
    return { ok: true };
  }

  throw new Error(body?.error ?? "Verification could not be started.");
}

const StewardRequestMessageSchema = z.string().max(2000).transform((s) => s.trim());

/** TanStack Query key: current user’s pending steward request for a company (or null). */
export function companyStewardRequestPendingQueryKey(companyId: string) {
  return ["company-steward-request-pending", companyId] as const;
}

export async function getMyPendingCompanyStewardRequestId(companyId: string): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("company_steward_requests")
    .select("id")
    .eq("company_id", companyId)
    .eq("requester_user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (error || !data) return null;
  return data.id;
}

/**
 * Inserts a pending request and notifies company owners (`notify-steward-request` Edge Function).
 */
export async function submitCompanyStewardRequest(companyId: string, messageRaw: string): Promise<void> {
  const message = StewardRequestMessageSchema.parse(messageRaw ?? "");
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    throw new Error("Sign in to request access.");
  }

  const { data, error } = await supabase
    .from("company_steward_requests")
    .insert({
      company_id: companyId,
      requester_user_id: user.id,
      message,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("You already have a pending request for this company.");
    }
    throw new Error(error.message || "Could not submit request.");
  }

  const { error: fnErr, data: fnBody } = await supabase.functions.invoke("notify-steward-request", {
    body: { requestId: data.id },
  });

  const fnJson = fnBody as { ok?: boolean; error?: string } | null;
  if (fnErr) {
    throw new Error(fnJson?.error ?? fnErr.message ?? "Could not notify company owners.");
  }
  if (!fnJson?.ok) {
    throw new Error(fnJson?.error ?? "Could not notify company owners.");
  }
}

export type ApproveCompanyStewardRequestError =
  | "not_authenticated"
  | "invalid_token"
  | "unknown_token"
  | "expired"
  | "already_used"
  | "not_owner"
  | "not_pending"
  | "rpc_error";

export type ApproveCompanyStewardRequestResult =
  | { ok: true; companySlug: string; requestId: string; alreadyProcessed: boolean }
  | { ok: false; error: ApproveCompanyStewardRequestError };

export function parseApproveCompanyStewardRequestRpcPayload(data: unknown): ApproveCompanyStewardRequestResult {
  if (!data || typeof data !== "object") return { ok: false, error: "rpc_error" };
  const o = data as Record<string, unknown>;
  if (o.ok === true && typeof o.company_slug === "string" && typeof o.request_id === "string") {
    return {
      ok: true,
      companySlug: o.company_slug,
      requestId: o.request_id,
      alreadyProcessed: o.already_processed === true,
    };
  }
  const err = o.error;
  if (
    err === "not_authenticated" ||
    err === "invalid_token" ||
    err === "unknown_token" ||
    err === "expired" ||
    err === "already_used" ||
    err === "not_owner" ||
    err === "not_pending"
  ) {
    return { ok: false, error: err };
  }
  return { ok: false, error: "rpc_error" };
}

export async function approveCompanyStewardRequestWithClient(
  client: Pick<SupabaseClient, "rpc" | "auth">,
  token: string
): Promise<ApproveCompanyStewardRequestResult> {
  const t = token.trim().toLowerCase();
  if (!isValidCompanyClaimTokenFormat(t)) {
    return { ok: false, error: "invalid_token" };
  }

  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    return { ok: false, error: "not_authenticated" };
  }

  const { data, error } = await client.rpc("approve_company_steward_request", {
    p_token_hex: t,
  });

  if (error) {
    return { ok: false, error: "rpc_error" };
  }

  return parseApproveCompanyStewardRequestRpcPayload(data);
}

/**
 * Emails the requester after approval (idempotent on the server). Failures are ignored so approval still counts.
 */
export async function notifyStewardRequestApprovedWithClient(
  client: Pick<SupabaseClient, "functions">,
  requestId: string
): Promise<void> {
  await client.functions.invoke("notify-steward-request-approved", {
    body: { requestId },
  });
}
