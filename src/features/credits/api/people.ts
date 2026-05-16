import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getDistanceFromLatLonInM } from "@/utils/map";
import type {
  BuildingCreditWithEntities,
  BuildingSummaryForPersonCredit,
  CreditRole,
  CreditStatus,
  CreditTier,
  FlagReason,
  Person,
  PersonCreditWithBuilding,
  PersonPortfolioByTier,
  PersonPortfolioItem,
  PersonSummary,
  PersonWithCredits,
} from "@/features/credits/types";

/** TanStack Query key for `getPerson(slug)` payloads (`PersonWithCredits`). */
export function personQueryKey(slug: string) {
  return ["person", slug] as const;
}

/**
 * For the signed-in user’s profile: linked `people` row (claim owner) and a visible credit count.
 * Returns `null` if this user has not claimed a person profile.
 */
export async function getClaimedPersonSummaryForProfile(userId: string): Promise<{
  id: string;
  name: string;
  slug: string;
  creditCount: number;
} | null> {
  const { data: personRow, error: pErr } = await supabase
    .from("people")
    .select("id, name, slug")
    .eq("claimed_by_user_id", userId)
    .maybeSingle();

  if (pErr) throw pErr;
  if (!personRow) return null;

  const { count, error: cErr } = await supabase
    .from("building_credits")
    .select("id", { count: "exact", head: true })
    .eq("person_id", personRow.id as string);

  if (cErr) throw cErr;

  return {
    id: personRow.id as string,
    name: personRow.name as string,
    slug: personRow.slug as string,
    creditCount: count ?? 0,
  };
}

/** Mirrors `public.slugify_person_name` in migrations (§9a). */
export function slugifyPersonName(raw: string): string | null {
  const lower = raw.trim().toLowerCase();
  const dashed = lower.replace(/[^a-z0-9]+/gi, "-");
  const collapsed = dashed.replace(/-+/g, "-").replace(/^-|-$/g, "");
  return collapsed.length > 0 ? collapsed : null;
}

const CreatePersonSchema = z.object({
  name: z.string().min(1).max(500).trim(),
  bio: z.string().max(10000).nullable().optional(),
  nationality: z.string().max(200).nullable().optional(),
  birthYear: z.number().int().min(0).max(3000).nullable().optional(),
  deathYear: z.number().int().min(0).max(3000).nullable().optional(),
  website: z.string().max(2000).nullable().optional(),
  locationNote: z.string().max(1000).nullable().optional(),
  avatarUrl: z.string().max(2000).nullable().optional(),
});

export type CreatePersonInput = z.infer<typeof CreatePersonSchema>;

const UpdatePersonSchema = z
  .object({
    name: z.string().min(1).max(500).trim().optional(),
    bio: z.string().max(10000).nullable().optional(),
    nationality: z.string().max(200).nullable().optional(),
    birthYear: z.number().int().min(0).max(3000).nullable().optional(),
    deathYear: z.number().int().min(0).max(3000).nullable().optional(),
    website: z.string().max(2000).nullable().optional(),
    locationNote: z.string().max(1000).nullable().optional(),
    avatarUrl: z.string().max(2000).nullable().optional(),
  })
  .strict();

export type UpdatePersonInput = z.infer<typeof UpdatePersonSchema>;

const ClaimPersonReasonSchema = z.enum(["self", "representative"]);
export type ClaimPersonReason = z.infer<typeof ClaimPersonReasonSchema>;

export type ClaimPersonErrorCode =
  | "not_authenticated"
  | "not_found"
  | "not_claimable"
  | "already_claimed_other"
  | "rpc_error";

export class ClaimPersonError extends Error {
  readonly code: ClaimPersonErrorCode;

  constructor(code: ClaimPersonErrorCode, message?: string) {
    super(message ?? code);
    this.name = "ClaimPersonError";
    this.code = code;
  }
}

function parseClaimPersonRpcPayload(raw: unknown): {
  ok: boolean;
  error?: string;
} {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "rpc_error" };
  }
  const o = raw as Record<string, unknown>;
  if (o.ok === true) return { ok: true };
  const err = o.error;
  if (typeof err === "string") return { ok: false, error: err };
  return { ok: false, error: "rpc_error" };
}

/**
 * Claim an unclaimed person profile for the signed-in user (`claim_person` RPC), refresh by slug,
 * then notify credit contributors via `notify-entity-claimed` (best-effort).
 * `reason` is validated for the form contract; the RPC does not persist it (moderation backstop is Phase 8).
 */
export async function claimPerson(
  personId: string,
  slug: string,
  reason: ClaimPersonReason
): Promise<Person> {
  ClaimPersonReasonSchema.parse(reason);

  const { data: rpcRaw, error: rpcError } = await supabase.rpc("claim_person", {
    p_person_id: personId,
  });

  if (rpcError) {
    throw new ClaimPersonError("rpc_error", rpcError.message);
  }

  const parsed = parseClaimPersonRpcPayload(rpcRaw);
  if (!parsed.ok) {
    const e = parsed.error ?? "rpc_error";
    if (e === "not_authenticated") throw new ClaimPersonError("not_authenticated");
    if (e === "not_found") throw new ClaimPersonError("not_found");
    if (e === "not_claimable") throw new ClaimPersonError("not_claimable");
    if (e === "already_claimed_other") throw new ClaimPersonError("already_claimed_other");
    throw new ClaimPersonError("rpc_error", e);
  }

  const fresh = await getPerson(slug);
  if (!fresh || fresh.person.claimedByUserId == null || fresh.person.claimStatus !== "claimed") {
    throw new ClaimPersonError("rpc_error", "claim_not_reflected");
  }

  const { error: notifyErr } = await supabase.functions.invoke("notify-entity-claimed", {
    body: { personId },
  });
  if (notifyErr) {
    /* claim succeeded; notification is best-effort */
  }

  return fresh.person;
}

/** Fire-and-forget notification to `added_by_user_id` on active credits (after claim). Prefer `claimPerson`. */
export async function notifyEntityClaimed(personId: string): Promise<void> {
  await supabase.functions.invoke("notify-entity-claimed", { body: { personId } });
}

type PersonRow = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  nationality: string | null;
  birth_year: number | null;
  death_year: number | null;
  avatar_url: string | null;
  website: string | null;
  location_note: string | null;
  claimed_by_user_id: string | null;
  claim_status: string;
  created_at: string;
  updated_at: string;
};

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
  flagged_from_status?: string | null;
  flagged_by_user_id: string | null;
  added_by_user_id: string | null;
  display_order: number;
  company_portfolio_rank?: number | null;
  created_at: string;
  updated_at: string;
  company: CompanyEmbed;
  building: BuildingEmbed;
};

function mapPerson(row: PersonRow): Person {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    bio: row.bio,
    nationality: row.nationality,
    birthYear: row.birth_year,
    deathYear: row.death_year,
    avatarUrl: row.avatar_url,
    website: row.website,
    locationNote: row.location_note,
    claimedByUserId: row.claimed_by_user_id,
    claimStatus: row.claim_status as Person["claimStatus"],
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
    mainImageUrl: b.hero_image_url,
    communityPreviewUrl: b.community_preview_url,
  };
}

function mapCreditRow(
  row: CreditRow,
  personSummary: { id: string; name: string; slug: string } | null
): BuildingCreditWithEntities {
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
    flaggedFromStatus:
      row.flagged_from_status === "active" || row.flagged_from_status === "verified"
        ? row.flagged_from_status
        : null,
    flaggedByUserId: row.flagged_by_user_id,
    addedByUserId: row.added_by_user_id,
    displayOrder: row.display_order,
    companyPortfolioRank: row.company_portfolio_rank ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    person: personSummary,
    company: row.company,
    note: null,
  };
}

const TIER_SORT: Record<CreditTier, number> = {
  primary: 0,
  contributor: 1,
  ancillary: 2,
};

function sortCreditsForPerson<
  T extends { creditTier: CreditTier; companyPortfolioRank: number | null; displayOrder: number; isLead: boolean },
>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const td = TIER_SORT[a.creditTier] - TIER_SORT[b.creditTier];
    if (td !== 0) return td;
    const ra = a.companyPortfolioRank;
    const rb = b.companyPortfolioRank;
    const aRanked = ra != null;
    const bRanked = rb != null;
    if (aRanked && bRanked && ra !== rb) return ra - rb;
    if (aRanked !== bRanked) return aRanked ? -1 : 1;
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
    const ra = a.company_portfolio_rank;
    const rb = b.company_portfolio_rank;
    const aRanked = ra != null;
    const bRanked = rb != null;
    if (aRanked && bRanked && ra !== rb) return ra - rb;
    if (aRanked !== bRanked) return aRanked ? -1 : 1;
    if (a.display_order !== b.display_order) return a.display_order - b.display_order;
    return (b.is_lead ? 1 : 0) - (a.is_lead ? 1 : 0);
  });
}

async function allocateUniquePeopleSlug(name: string): Promise<string> {
  const base = slugifyPersonName(name) ?? "person";
  let candidate = base;
  let n = 2;
  for (;;) {
    const { data, error } = await supabase.from("people").select("id").eq("slug", candidate).maybeSingle();
    if (error) throw error;
    if (!data) return candidate;
    candidate = `${base}-${n}`;
    n += 1;
  }
}

const PERSON_BUILDING_CREDIT_SELECT = `
      *,
      company:companies(id, name, slug),
      building:buildings(id, name, slug, short_id, city, country, year_completed, hero_image_url, community_preview_url)
    `;

/**
 * Person by slug with all credits visible under RLS, each joined to a building summary.
 * Use in SSR loaders with `createSupabaseServerClient`; use `getPerson` in the browser.
 * Returns `null` if no row matches.
 */
export async function getPersonWithClient(
  client: SupabaseClient,
  slug: string
): Promise<PersonWithCredits | null> {
  const { data: personRow, error: pErr } = await client
    .from("people")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (pErr) throw pErr;
  if (!personRow) return null;

  const person = mapPerson(personRow as PersonRow);
  const personSummary = { id: person.id, name: person.name, slug: person.slug };

  const { data: creditRows, error: cErr } = await client
    .from("building_credits")
    .select(PERSON_BUILDING_CREDIT_SELECT)
    .eq("person_id", person.id);

  if (cErr) throw cErr;

  const credits: PersonCreditWithBuilding[] = sortCreditsForPerson(
    (creditRows || []).map((raw) => {
      const row = raw as CreditRow;
      const building = mapBuildingSummary(row.building);
      if (!building) {
        throw new Error(`building_credits ${row.id} missing building join`);
      }
      return {
        ...mapCreditRow(row, personSummary),
        building,
      };
    })
  );

  return { person, credits };
}

/**
 * Person by slug (browser Supabase client).
 */
export async function getPerson(slug: string): Promise<PersonWithCredits | null> {
  return getPersonWithClient(supabase, slug);
}

/**
 * Fuzzy name search — thin wrapper around search_people_v2 RPC.
 * Replaced the previous 3-round-trip ilike + affiliations + credits pattern.
 */
export async function searchPeople(query: string): Promise<PersonSummary[]> {
  const { searchPeopleV2 } = await import("@/features/search/api/searchPeopleV2");
  return searchPeopleV2(query, { limit: 25 });
}

/**
 * Discovery browse — returns people relevant to the given map bounds (or globally),
 * sorted by credit count descending. Used when there is no active search query.
 */
export async function discoverPeople(
  bounds?: { south: number; north: number; west: number; east: number } | null,
  limit = 30
): Promise<PersonSummary[]> {
  let personIds: string[] | null = null;

  if (bounds) {
    const centerLat = (bounds.north + bounds.south) / 2;
    const centerLng = (bounds.west + bounds.east) / 2;
    const radiusMeters = getDistanceFromLatLonInM(
      centerLat,
      centerLng,
      bounds.north,
      bounds.east,
    );

    const { data: buildingRows, error: bErr } = await supabase.rpc(
      "find_nearby_buildings",
      { lat: centerLat, long: centerLng, radius_meters: radiusMeters },
    );

    if (bErr) throw bErr;
    if (!buildingRows?.length) return [];

    const buildingIds = (buildingRows as Array<{ id: string }>)
      .slice(0, 300)
      .map((r) => r.id);
    const { data: creditRows, error: cErr } = await supabase
      .from("building_credits")
      .select("person_id")
      .in("building_id", buildingIds)
      .not("person_id", "is", null);

    if (cErr) throw cErr;
    personIds = [...new Set((creditRows || []).map((r) => r.person_id as string))];
    if (personIds.length === 0) return [];
  }

  let baseQuery = supabase
    .from("people")
    .select("id, name, slug, claim_status, nationality, avatar_url");

  if (personIds !== null) {
    baseQuery = baseQuery.in("id", personIds);
  }

  const { data: peopleRows, error: pErr } = await baseQuery.limit(limit * 3);
  if (pErr) throw pErr;
  if (!peopleRows?.length) return [];

  const ids = (peopleRows as Array<{ id: string }>).map((r) => r.id);

  // Fetch all credit counts in a single query and tally client-side
  const { data: countRows, error: cntErr } = await supabase
    .from("building_credits")
    .select("person_id")
    .in("person_id", ids)
    .not("person_id", "is", null);

  if (cntErr) throw cntErr;

  const countById = new Map<string, number>();
  for (const row of countRows || []) {
    const pid = row.person_id as string;
    countById.set(pid, (countById.get(pid) ?? 0) + 1);
  }

  return (peopleRows as Array<{
    id: string;
    name: string;
    slug: string;
    claim_status: PersonSummary["claimStatus"];
    nationality: string | null;
    avatar_url: string | null;
  }>)
    .map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      claimStatus: r.claim_status,
      nationality: r.nationality,
      avatarUrl: r.avatar_url,
      creditCount: countById.get(r.id) ?? 0,
      associatedCompanies: [],
      knownBuilding: null,
    }))
    .sort((a, b) => (b.creditCount ?? 0) - (a.creditCount ?? 0))
    .slice(0, limit);
}

/**
 * Insert a person; slug is generated with `-2`, `-3`, … suffixes on collision.
 */
export async function createPerson(input: CreatePersonInput): Promise<Person> {
  const data = CreatePersonSchema.parse(input);
  const slug = await allocateUniquePeopleSlug(data.name);

  const insertRow = {
    id: crypto.randomUUID(),
    name: data.name,
    slug,
    bio: data.bio ?? null,
    nationality: data.nationality ?? null,
    birth_year: data.birthYear ?? null,
    death_year: data.deathYear ?? null,
    website: data.website ?? null,
    location_note: data.locationNote ?? null,
    avatar_url: data.avatarUrl ?? null,
  };

  const { data: row, error } = await supabase.from("people").insert(insertRow).select("*").single();

  if (error) throw error;
  return mapPerson(row as PersonRow);
}

/**
 * Partial update; RLS restricts to claim owner or admin.
 */
export async function updatePerson(id: string, input: UpdatePersonInput): Promise<Person | null> {
  const data = UpdatePersonSchema.parse(input);
  if (Object.keys(data).length === 0) {
    const { data: row, error } = await supabase.from("people").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return row ? mapPerson(row as PersonRow) : null;
  }

  const patch: Record<string, unknown> = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.bio !== undefined) patch.bio = data.bio;
  if (data.nationality !== undefined) patch.nationality = data.nationality;
  if (data.birthYear !== undefined) patch.birth_year = data.birthYear;
  if (data.deathYear !== undefined) patch.death_year = data.deathYear;
  if (data.website !== undefined) patch.website = data.website;
  if (data.locationNote !== undefined) patch.location_note = data.locationNote;
  if (data.avatarUrl !== undefined) patch.avatar_url = data.avatarUrl;

  const { data: row, error } = await supabase.from("people").update(patch).eq("id", id).select("*").maybeSingle();

  if (error) throw error;
  return row ? mapPerson(row as PersonRow) : null;
}

/**
 * All credits for the person with building summaries, grouped by `credit_tier`.
 */
export async function getPersonPortfolio(personId: string): Promise<PersonPortfolioByTier> {
  const empty: PersonPortfolioByTier = { primary: [], contributor: [], ancillary: [] };

  const { data: personRow, error: pErr } = await supabase
    .from("people")
    .select("id, name, slug")
    .eq("id", personId)
    .maybeSingle();

  if (pErr) throw pErr;
  if (!personRow) return empty;

  const personSummary = {
    id: personRow.id as string,
    name: personRow.name as string,
    slug: personRow.slug as string,
  };

  const { data: creditRows, error: cErr } = await supabase
    .from("building_credits")
    .select(PERSON_BUILDING_CREDIT_SELECT)
    .eq("person_id", personId);

  if (cErr) throw cErr;

  const sorted = sortCreditRows((creditRows || []) as CreditRow[]);

  for (const row of sorted) {
    const building = mapBuildingSummary(row.building);
    if (!building) continue;

    const credit = mapCreditRow(row, personSummary);
    const item: PersonPortfolioItem = { credit, building };
    const tier = credit.creditTier;
    if (tier === "primary") empty.primary.push(item);
    else if (tier === "contributor") empty.contributor.push(item);
    else empty.ancillary.push(item);
  }

  return empty;
}
