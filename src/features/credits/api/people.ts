import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
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
    city: b.city,
    country: b.country,
    yearCompleted: b.year_completed,
    heroImageUrl: b.hero_image_url,
    mainImageUrl: b.main_image_url,
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
    flaggedByUserId: row.flagged_by_user_id,
    addedByUserId: row.added_by_user_id,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    person: personSummary,
    company: row.company,
  };
}

const TIER_SORT: Record<CreditTier, number> = {
  primary: 0,
  contributor: 1,
  ancillary: 2,
};

function sortCreditsForPerson<T extends { creditTier: CreditTier; displayOrder: number; isLead: boolean }>(
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

/**
 * Person by slug with all credits visible under RLS, each joined to a building summary.
 * Returns `null` if no row matches.
 */
export async function getPerson(slug: string): Promise<PersonWithCredits | null> {
  const { data: personRow, error: pErr } = await supabase
    .from("people")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (pErr) throw pErr;
  if (!personRow) return null;

  const person = mapPerson(personRow as PersonRow);
  const personSummary = { id: person.id, name: person.name, slug: person.slug };

  const { data: creditRows, error: cErr } = await supabase
    .from("building_credits")
    .select(
      `
      *,
      company:companies(id, name, slug),
      building:buildings(id, name, slug, city, country, year_completed, hero_image_url, main_image_url, community_preview_url)
    `
    )
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
 * Fuzzy name search; returns `PersonSummary` rows with affiliation and sample building labels.
 */
export async function searchPeople(query: string): Promise<PersonSummary[]> {
  const q = query.trim().replace(/[%_]/g, "").slice(0, 200);
  if (!q) return [];

  const { data: peopleRows, error: pErr } = await supabase
    .from("people")
    .select("id, name, slug, claim_status")
    .ilike("name", `%${q}%`)
    .limit(25);

  if (pErr) throw pErr;
  if (!peopleRows?.length) return [];

  const ids = peopleRows.map((r) => r.id as string);

  const [{ data: affRows, error: aErr }, { data: creditSampleRows, error: crErr }] = await Promise.all([
    supabase
      .from("person_company_affiliations")
      .select("person_id, company:companies(name)")
      .in("person_id", ids),
    supabase.from("building_credits").select("person_id, building:buildings(name)").in("person_id", ids),
  ]);

  if (aErr) throw aErr;
  if (crErr) throw crErr;

  const companiesByPerson = new Map<string, Set<string>>();
  for (const row of affRows || []) {
    const pid = row.person_id as string;
    const name = (row as { company: { name: string } | null }).company?.name;
    if (!name) continue;
    if (!companiesByPerson.has(pid)) companiesByPerson.set(pid, new Set());
    companiesByPerson.get(pid)!.add(name);
  }

  const knownBuildingByPerson = new Map<string, string>();
  for (const row of creditSampleRows || []) {
    const pid = row.person_id as string;
    if (knownBuildingByPerson.has(pid)) continue;
    const bname = (row as { building: { name: string } | null }).building?.name;
    if (bname) knownBuildingByPerson.set(pid, bname);
  }

  return peopleRows.map((r) => {
    const id = r.id as string;
    return {
      id,
      name: r.name as string,
      slug: r.slug as string,
      claimStatus: r.claim_status as PersonSummary["claimStatus"],
      associatedCompanies: Array.from(companiesByPerson.get(id) ?? []).sort(),
      knownBuilding: knownBuildingByPerson.get(id) ?? null,
    };
  });
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
    .select(
      `
      *,
      company:companies(id, name, slug),
      building:buildings(id, name, slug, city, country, year_completed, hero_image_url, main_image_url, community_preview_url)
    `
    )
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
