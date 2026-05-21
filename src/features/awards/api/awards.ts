import { supabase } from "@/integrations/supabase/client";
import type {
  AwardDTO,
  AwardEditionDTO,
  AwardCategoryDTO,
  AwardRecipientDTO,
  AwardAdminDTO,
  AwardClaimRequestDTO,
  AwardSuggestionDTO,
  AwardEditionEventDTO,
  AwardEditionEventType,
} from "@/features/awards/types/awards";

// The awards tables are not yet in the generated Supabase types (migration pending).
// Use an untyped alias until `npm run gen-types` is re-run after migration.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ── Row → DTO mappers ────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */

function toAwardDTO(row: any, editionCount?: number): AwardDTO {
  const body = row.awarding_body_company
    ? {
        id: row.awarding_body_company.id as string,
        name: row.awarding_body_company.name as string,
        slug: row.awarding_body_company.slug as string,
      }
    : null;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    website: row.website ?? null,
    country: row.country ?? null,
    frequency: row.frequency,
    awardingBodyType: row.awarding_body_type ?? null,
    awardingBodyCompanyId: row.awarding_body_company_id ?? null,
    awardingBodyName: row.awarding_body_name ?? null,
    isActive: row.is_active,
    claimStatus: (row.claim_status ?? 'unclaimed') as AwardDTO['claimStatus'],
    wikidataQid: row.wikidata_qid ?? null,
    wikidataSitelinks: row.wikidata_sitelinks ?? null,
    wikidataFetchedAt: row.wikidata_fetched_at ?? null,
    createdAt: row.created_at,
    awardingBodyCompany: body,
    editionCount,
  };
}

function toEditionDTO(row: any, recipientCount?: number): AwardEditionDTO {
  return {
    id: row.id,
    awardId: row.award_id,
    year: row.year ?? null,
    editionLabel: row.edition_label ?? null,
    editionNumber: row.edition_number ?? null,
    slug: row.slug ?? null,
    editionDate: row.edition_date ?? null,
    ceremonyLocation: row.ceremony_location ?? null,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    recipientCount,
  };
}

function toCategoryDTO(row: any): AwardCategoryDTO {
  return {
    id: row.id,
    awardId: row.award_id,
    name: row.name,
    description: row.description ?? null,
    isActive: row.is_active,
    validFromEditionId: row.valid_from_edition_id ?? null,
    validToEditionId: row.valid_to_edition_id ?? null,
    createdAt: row.created_at,
  };
}

function toRecipientDTO(row: any): AwardRecipientDTO {
  const building = row.building
    ? { id: row.building.id, name: row.building.name, slug: row.building.slug, heroImageUrl: row.building.hero_image_url ?? null }
    : null;
  const person = row.person
    ? { id: row.person.id, name: row.person.name, slug: row.person.slug, avatarUrl: row.person.avatar_url ?? null }
    : null;
  const company = row.company
    ? { id: row.company.id, name: row.company.name, slug: row.company.slug }
    : null;
  const category = row.category
    ? { name: row.category.name }
    : null;
  const edition = row.edition
    ? {
        year: row.edition.year ?? null,
        editionLabel: row.edition.edition_label ?? null,
        editionDate: row.edition.edition_date ?? null,
        slug: row.edition.slug ?? null,
      }
    : null;
  const award = row.award
    ? { name: row.award.name, slug: row.award.slug }
    : null;

  return {
    id: row.id,
    editionId: row.edition_id,
    categoryId: row.category_id,
    recipientType: row.recipient_type,
    recipientBuildingId: row.recipient_building_id ?? null,
    recipientPersonId: row.recipient_person_id ?? null,
    recipientCompanyId: row.recipient_company_id ?? null,
    outcome: row.outcome,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    building,
    person,
    company,
    category: category ?? undefined,
    edition: edition ?? undefined,
    award: award ?? undefined,
  };
}

// ── Queries ──────────────────────────────────────────────────

export async function getAwards(): Promise<AwardDTO[]> {
  const { data, error } = await db
    .from("awards")
    .select(`
      *,
      awarding_body_company:companies!awards_awarding_body_company_id_fkey(id, name, slug),
      award_editions(count)
    `)
    .order("wikidata_sitelinks", { ascending: false, nullsFirst: false })
    .order("name", { ascending: true });

  if (error) throw new Error(`Failed to load awards: ${error.message}`);

  return (data ?? []).map((row: any) => {
    const editionCount =
      Array.isArray(row.award_editions) && row.award_editions.length > 0
        ? (row.award_editions[0] as any).count ?? 0
        : 0;
    return toAwardDTO(row, editionCount);
  });
}

export async function getAwardById(awardId: string): Promise<AwardDTO> {
  const { data, error } = await db
    .from("awards")
    .select(`
      *,
      awarding_body_company:companies!awards_awarding_body_company_id_fkey(id, name, slug)
    `)
    .eq("id", awardId)
    .maybeSingle();

  if (error) throw new Error(`Failed to load award: ${error.message}`);
  if (!data) throw new Error("Award not found");

  return toAwardDTO(data);
}

export async function getAwardBySlug(slug: string): Promise<AwardDTO> {
  const { data, error } = await db
    .from("awards")
    .select(`
      *,
      awarding_body_company:companies!awards_awarding_body_company_id_fkey(id, name, slug)
    `)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`Failed to load award: ${error.message}`);
  if (!data) throw new Error("Award not found");

  return toAwardDTO(data);
}

export async function getEditionsByAward(awardId: string): Promise<AwardEditionDTO[]> {
  const { data, error } = await db
    .from("award_editions")
    .select(`
      *,
      award_recipients(count)
    `)
    .eq("award_id", awardId)
    .order("year", { ascending: false, nullsFirst: false })
    .order("edition_number", { ascending: false, nullsFirst: false });

  if (error) throw new Error(`Failed to load editions: ${error.message}`);

  return (data ?? []).map((row: any) => {
    const recipientCount =
      Array.isArray(row.award_recipients) && row.award_recipients.length > 0
        ? (row.award_recipients[0] as any).count ?? 0
        : 0;
    return toEditionDTO(row, recipientCount);
  });
}

export async function getEditionById(editionId: string): Promise<AwardEditionDTO> {
  const { data, error } = await db
    .from("award_editions")
    .select("*")
    .eq("id", editionId)
    .maybeSingle();

  if (error) throw new Error(`Failed to load edition: ${error.message}`);
  if (!data) throw new Error("Edition not found");

  return toEditionDTO(data);
}

export async function getEditionByAwardAndYear(awardId: string, year: number): Promise<AwardEditionDTO> {
  const { data, error } = await db
    .from("award_editions")
    .select("*")
    .eq("award_id", awardId)
    .eq("year", year)
    .maybeSingle();

  if (error) throw new Error(`Failed to load edition: ${error.message}`);
  if (!data) throw new Error("Edition not found");

  return toEditionDTO(data);
}

export async function getEditionBySlug(awardId: string, slug: string): Promise<AwardEditionDTO> {
  const { data, error } = await db
    .from("award_editions")
    .select("*")
    .eq("award_id", awardId)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`Failed to load edition: ${error.message}`);
  if (!data) throw new Error("Edition not found");

  return toEditionDTO(data);
}

export async function getCategoriesByAward(awardId: string): Promise<AwardCategoryDTO[]> {
  const { data, error } = await db
    .from("award_categories")
    .select("*")
    .eq("award_id", awardId)
    .order("name", { ascending: true });

  if (error) throw new Error(`Failed to load categories: ${error.message}`);

  return (data ?? []).map(toCategoryDTO);
}

export async function getRecipientsByEdition(editionId: string): Promise<AwardRecipientDTO[]> {
  const { data, error } = await db
    .from("award_recipients")
    .select(`
      *,
      building:buildings!award_recipients_recipient_building_id_fkey(id, name, slug, hero_image_url),
      person:people!award_recipients_recipient_person_id_fkey(id, name, slug, avatar_url),
      company:companies!award_recipients_recipient_company_id_fkey(id, name, slug),
      category:award_categories!award_recipients_category_id_fkey(name),
      edition:award_editions!award_recipients_edition_id_fkey(year, edition_label, edition_date, slug)
    `)
    .eq("edition_id", editionId)
    .order("outcome", { ascending: true });

  if (error) throw new Error(`Failed to load recipients: ${error.message}`);

  return (data ?? []).map(toRecipientDTO);
}

export async function getAwardsByBuilding(buildingId: string): Promise<AwardRecipientDTO[]> {
  const { data, error } = await db
    .from("award_recipients")
    .select(`
      *,
      category:award_categories!award_recipients_category_id_fkey(name),
      edition:award_editions!award_recipients_edition_id_fkey(year, edition_label, edition_date, slug, award_id),
      award:award_editions!award_recipients_edition_id_fkey(awards!award_editions_award_id_fkey(name, slug))
    `)
    .eq("recipient_building_id", buildingId)
    .eq("recipient_type", "building");

  if (error) throw new Error(`Failed to load awards for building: ${error.message}`);

  return (data ?? []).map((row: any) => {
    const awardNested = row.award?.awards;
    return toRecipientDTO({
      ...row,
      award: awardNested ?? null,
    });
  });
}

export async function getAwardsByPerson(personId: string): Promise<AwardRecipientDTO[]> {
  const { data, error } = await db
    .from("award_recipients")
    .select(`
      *,
      category:award_categories!award_recipients_category_id_fkey(name),
      edition:award_editions!award_recipients_edition_id_fkey(year, edition_label, edition_date, slug, award_id),
      award:award_editions!award_recipients_edition_id_fkey(awards!award_editions_award_id_fkey(name, slug))
    `)
    .eq("recipient_person_id", personId)
    .eq("recipient_type", "person");

  if (error) throw new Error(`Failed to load awards for person: ${error.message}`);

  return (data ?? []).map((row: any) => {
    const awardNested = row.award?.awards;
    return toRecipientDTO({
      ...row,
      award: awardNested ?? null,
    });
  });
}

export async function getAwardsByCompany(companyId: string): Promise<AwardRecipientDTO[]> {
  const { data, error } = await db
    .from("award_recipients")
    .select(`
      *,
      category:award_categories!award_recipients_category_id_fkey(name),
      edition:award_editions!award_recipients_edition_id_fkey(year, edition_label, edition_date, slug, award_id),
      award:award_editions!award_recipients_edition_id_fkey(awards!award_editions_award_id_fkey(name, slug))
    `)
    .eq("recipient_company_id", companyId)
    .eq("recipient_type", "company");

  if (error) throw new Error(`Failed to load awards for company: ${error.message}`);

  return (data ?? []).map((row: any) => {
    const awardNested = row.award?.awards;
    return toRecipientDTO({
      ...row,
      award: awardNested ?? null,
    });
  });
}

// ── Mutations ────────────────────────────────────────────────

export async function createAward(payload: {
  name: string;
  slug: string;
  description?: string | null;
  website?: string | null;
  country?: string | null;
  frequency?: string;
  awarding_body_type?: string | null;
  awarding_body_company_id?: string | null;
  awarding_body_name?: string | null;
  is_active?: boolean;
}): Promise<AwardDTO> {
  const { data, error } = await db
    .from("awards")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create award: ${error.message}`);
  return toAwardDTO(data);
}

export async function updateAward(
  awardId: string,
  payload: Record<string, unknown>,
): Promise<AwardDTO> {
  const { data, error } = await db
    .from("awards")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", awardId)
    .select("*")
    .single();

  if (error) throw new Error(`Failed to update award: ${error.message}`);
  return toAwardDTO(data);
}

export async function deleteAward(awardId: string): Promise<void> {
  const { error } = await db.from("awards").delete().eq("id", awardId);
  if (error) throw new Error(`Failed to delete award: ${error.message}`);
}

export async function createEdition(payload: {
  award_id: string;
  year?: number | null;
  edition_label?: string | null;
  edition_number?: number | null;
  slug?: string | null;
  edition_date?: string | null;
  ceremony_location?: string | null;
  notes?: string | null;
}): Promise<AwardEditionDTO> {
  const { data, error } = await db
    .from("award_editions")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create edition: ${error.message}`);
  return toEditionDTO(data);
}

export async function updateEdition(
  editionId: string,
  payload: Record<string, unknown>,
): Promise<AwardEditionDTO> {
  const { data, error } = await db
    .from("award_editions")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", editionId)
    .select("*")
    .single();

  if (error) throw new Error(`Failed to update edition: ${error.message}`);
  return toEditionDTO(data);
}

export async function deleteEdition(editionId: string): Promise<void> {
  const { error } = await db.from("award_editions").delete().eq("id", editionId);
  if (error) throw new Error(`Failed to delete edition: ${error.message}`);
}

export async function createCategory(payload: {
  award_id: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
  valid_from_edition_id?: string | null;
  valid_to_edition_id?: string | null;
}): Promise<AwardCategoryDTO> {
  const { data, error } = await db
    .from("award_categories")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create category: ${error.message}`);
  return toCategoryDTO(data);
}

export async function updateCategory(
  categoryId: string,
  payload: Record<string, unknown>,
): Promise<AwardCategoryDTO> {
  const { data, error } = await db
    .from("award_categories")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", categoryId)
    .select("*")
    .single();

  if (error) throw new Error(`Failed to update category: ${error.message}`);
  return toCategoryDTO(data);
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const { error } = await db.from("award_categories").delete().eq("id", categoryId);
  if (error) throw new Error(`Failed to delete category: ${error.message}`);
}

export async function createRecipient(payload: {
  edition_id: string;
  category_id: string;
  recipient_type: string;
  recipient_building_id?: string | null;
  recipient_person_id?: string | null;
  recipient_company_id?: string | null;
  outcome?: string;
  notes?: string | null;
}): Promise<AwardRecipientDTO> {
  const { data, error } = await db
    .from("award_recipients")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create recipient: ${error.message}`);
  return toRecipientDTO(data);
}

export async function deleteRecipient(recipientId: string): Promise<void> {
  const { error } = await db.from("award_recipients").delete().eq("id", recipientId);
  if (error) throw new Error(`Failed to delete recipient: ${error.message}`);
}

// ── Entity search (for AddRecipientDialog) ───────────────────

export async function searchBuildings(query: string): Promise<{ id: string; name: string; slug: string; city: string | null }[]> {
  const { data, error } = await db
    .from("buildings")
    .select("id, name, slug, city")
    .ilike("name", `%${query}%`)
    .eq("is_deleted", false)
    .limit(15);

  if (error) throw new Error(`Search failed: ${error.message}`);
  return data ?? [];
}

export async function searchPeople(query: string): Promise<{ id: string; name: string; slug: string }[]> {
  const { data, error } = await db
    .from("people")
    .select("id, name, slug")
    .ilike("name", `%${query}%`)
    .limit(15);

  if (error) throw new Error(`Search failed: ${error.message}`);
  return data ?? [];
}

export async function searchCompanies(query: string): Promise<{ id: string; name: string; slug: string }[]> {
  const { data, error } = await db
    .from("companies")
    .select("id, name, slug")
    .ilike("name", `%${query}%`)
    .limit(15);

  if (error) throw new Error(`Search failed: ${error.message}`);
  return data ?? [];
}

export async function searchAwards(query: string): Promise<{ id: string; name: string; slug: string }[]> {
  const { data, error } = await db
    .from("awards")
    .select("id, name, slug")
    .ilike("name", `%${query}%`)
    .eq("is_active", true)
    .limit(15);

  if (error) throw new Error(`Search failed: ${error.message}`);
  return data ?? [];
}

// ── Suggestions ──────────────────────────────────────────────

function toSuggestionDTO(row: any): AwardSuggestionDTO {
  return {
    id: row.id,
    submittedBy: row.submitted_by,
    awardId: row.award_id,
    editionId: row.edition_id ?? null,
    categoryId: row.category_id ?? null,
    recipientType: row.recipient_type,
    recipientBuildingId: row.recipient_building_id ?? null,
    recipientPersonId: row.recipient_person_id ?? null,
    recipientCompanyId: row.recipient_company_id ?? null,
    outcome: row.outcome,
    year: row.year ?? null,
    sourceUrl: row.source_url ?? null,
    notes: row.notes ?? null,
    status: row.status,
    reviewedBy: row.reviewed_by ?? null,
    reviewerNote: row.reviewer_note ?? null,
    reviewedAt: row.reviewed_at ?? null,
    createdAt: row.created_at,
    award: row.award ? { name: row.award.name, slug: row.award.slug } : undefined,
    building: row.building ? { name: row.building.name, slug: row.building.slug } : undefined,
    person: row.person ? { name: row.person.name, slug: row.person.slug } : undefined,
    company: row.company ? { name: row.company.name, slug: row.company.slug } : undefined,
    submittedByProfile: row.submitted_by_profile ? { name: row.submitted_by_profile.name, avatarUrl: row.submitted_by_profile.avatar_url ?? null } : undefined,
  };
}

export async function createSuggestion(payload: any): Promise<AwardSuggestionDTO> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data, error } = await db
    .from("award_recipient_suggestions")
    .insert({
      ...payload,
      submitted_by: user.id
    })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to submit suggestion: ${error.message}`);
  return toSuggestionDTO(data);
}

export async function getSuggestions(status?: string): Promise<AwardSuggestionDTO[]> {
  let query = db
    .from("award_recipient_suggestions")
    .select(`
      *,
      award:awards(name, slug),
      building:buildings(name, slug),
      person:people(name, slug),
      company:companies(name, slug),
      submitted_by_profile:profiles!award_recipient_suggestions_submitted_by_fkey(name, avatar_url)
    `);
  
  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load suggestions: ${error.message}`);
  return (data ?? []).map(toSuggestionDTO);
}

export async function getSuggestionById(id: string): Promise<AwardSuggestionDTO> {
  const { data, error } = await db
    .from("award_recipient_suggestions")
    .select(`
      *,
      award:awards(name, slug),
      building:buildings(name, slug),
      person:people(name, slug),
      company:companies(name, slug),
      submitted_by_profile:profiles!award_recipient_suggestions_submitted_by_fkey(name, avatar_url)
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load suggestion: ${error.message}`);
  if (!data) throw new Error("Suggestion not found");
  return toSuggestionDTO(data);
}

export async function approveSuggestion(suggestionId: string): Promise<void> {
  const { error } = await db.rpc("approve_award_suggestion", { p_suggestion_id: suggestionId });
  if (error) throw new Error(`Failed to approve suggestion: ${error.message}`);
}

export async function rejectSuggestion(suggestionId: string, note?: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await db
    .from("award_recipient_suggestions")
    .update({
      status: "rejected",
      reviewer_note: note,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString()
    })
    .eq("id", suggestionId);

  if (error) throw new Error(`Failed to reject suggestion: ${error.message}`);
}

// ── Awards Hub ───────────────────────────────────────────────

export interface RecentRecipientFilters {
  recipientType?: 'building' | 'person' | 'company' | null;
  winnersOnly?: boolean;
  offset?: number;
  limit?: number;
}

export async function getRecentRecipients(filters: RecentRecipientFilters = {}): Promise<AwardRecipientDTO[]> {
  const { recipientType, winnersOnly, offset = 0, limit = 20 } = filters;

  let query = db
    .from("award_recipients")
    .select(`
      *,
      building:buildings!award_recipients_recipient_building_id_fkey(id, name, slug, hero_image_url),
      person:people!award_recipients_recipient_person_id_fkey(id, name, slug, avatar_url),
      company:companies!award_recipients_recipient_company_id_fkey(id, name, slug),
      category:award_categories!award_recipients_category_id_fkey(name),
      edition:award_editions!award_recipients_edition_id_fkey(year, edition_label, edition_date, slug),
      award:award_editions!award_recipients_edition_id_fkey(awards!award_editions_award_id_fkey(name, slug))
    `)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (recipientType) query = query.eq("recipient_type", recipientType);
  if (winnersOnly) query = query.eq("outcome", "winner");

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load recent recipients: ${error.message}`);

  return (data ?? []).map((row: any) => {
    const awardNested = row.award?.awards;
    return toRecipientDTO({ ...row, award: awardNested ?? null });
  });
}

export interface AwardsStatsDTO {
  awardCount: number;
  recipientCount: number;
}

export async function getAwardsStats(): Promise<AwardsStatsDTO> {
  const [awardsRes, recipientsRes] = await Promise.all([
    db.from("awards").select("id", { count: "exact", head: true }).eq("is_active", true),
    db.from("award_recipients").select("id", { count: "exact", head: true }),
  ]);

  if (awardsRes.error) throw new Error(`Failed to load awards count: ${awardsRes.error.message}`);
  if (recipientsRes.error) throw new Error(`Failed to load recipients count: ${recipientsRes.error.message}`);

  return {
    awardCount: awardsRes.count ?? 0,
    recipientCount: recipientsRes.count ?? 0,
  };
}

export async function getAwardsByBody(companyId: string): Promise<AwardDTO[]> {
  const { data, error } = await db
    .from("awards")
    .select(`
      *,
      award_editions(count)
    `)
    .eq("awarding_body_company_id", companyId)
    .eq("is_active", true);

  if (error) throw new Error(`Failed to load administered awards: ${error.message}`);

  return (data ?? []).map((row: any) => {
    const editionCount =
      Array.isArray(row.award_editions) && row.award_editions.length > 0
        ? (row.award_editions[0] as any).count ?? 0
        : 0;
    return toAwardDTO(row, editionCount);
  });
}

// ── Award Admins ─────────────────────────────────────────────

function toAwardAdminDTO(row: any): AwardAdminDTO {
  return {
    id: row.id,
    awardId: row.award_id,
    userId: row.user_id,
    role: row.role,
    invitedBy: row.invited_by ?? null,
    createdAt: row.created_at,
    profile: row.profiles
      ? { username: row.profiles.username, avatarUrl: row.profiles.avatar_url ?? null }
      : undefined,
  };
}

export async function getAwardAdmins(awardId: string): Promise<AwardAdminDTO[]> {
  const { data, error } = await db
    .from("award_admins")
    .select("*, profiles(username, avatar_url)")
    .eq("award_id", awardId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to load award admins: ${error.message}`);
  return (data ?? []).map(toAwardAdminDTO);
}

/** Returns true if the current session user is an admin of the given award. */
export async function isCurrentUserAwardAdmin(awardId: string): Promise<boolean> {
  const { data, error } = await db.rpc("plano_auth_is_award_admin", { p_award_id: awardId });
  if (error) return false;
  return Boolean(data);
}

// ── Award Claim Requests ──────────────────────────────────────

function toAwardClaimRequestDTO(row: any): AwardClaimRequestDTO {
  return {
    id: row.id,
    awardId: row.award_id,
    requesterUserId: row.requester_user_id,
    reason: row.reason,
    status: row.status,
    reviewedBy: row.reviewed_by ?? null,
    reviewerNote: row.reviewer_note ?? null,
    reviewedAt: row.reviewed_at ?? null,
    createdAt: row.created_at,
    award: row.awards ? { name: row.awards.name, slug: row.awards.slug } : undefined,
    requesterProfile: row.profiles
      ? { username: row.profiles.username, avatarUrl: row.profiles.avatar_url ?? null }
      : undefined,
  };
}

/** Returns the current user's latest claim request for an award, or null. */
export async function getMyAwardClaimRequest(awardId: string): Promise<AwardClaimRequestDTO | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await db
    .from("award_claim_requests")
    .select("*")
    .eq("award_id", awardId)
    .eq("requester_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to load claim request: ${error.message}`);
  return data ? toAwardClaimRequestDTO(data) : null;
}

export async function submitAwardClaimRequest(
  awardId: string,
  reason: string,
): Promise<{ ok: boolean; error?: string; requestId?: string }> {
  const { data, error } = await db.rpc("submit_award_claim_request", {
    p_award_id: awardId,
    p_reason:   reason,
  });
  if (error) return { ok: false, error: error.message };
  return {
    ok:        data.ok,
    error:     data.error,
    requestId: data.request_id,
  };
}

// ── Admin: claim request queue ────────────────────────────────

export async function getAwardClaimRequests(
  status?: 'pending' | 'approved' | 'rejected',
): Promise<AwardClaimRequestDTO[]> {
  let query = db
    .from("award_claim_requests")
    .select("*, awards(name, slug), profiles(username, avatar_url)")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load claim requests: ${error.message}`);
  return (data ?? []).map(toAwardClaimRequestDTO);
}

export async function reviewAwardClaimRequest(
  requestId: string,
  approve: boolean,
  reviewerNote?: string,
): Promise<void> {
  const { data, error } = await db.rpc("review_award_claim_request", {
    p_request_id:    requestId,
    p_approve:       approve,
    p_reviewer_note: reviewerNote ?? null,
  });
  if (error) throw new Error(`Failed to review claim request: ${error.message}`);
  if (data && !data.ok) throw new Error(data.error ?? "Review failed");
}

// ── Edition Events ────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
function toEditionEventDTO(row: any): AwardEditionEventDTO {
  return {
    id:        row.id,
    editionId: row.edition_id,
    eventType: row.event_type as AwardEditionEventType,
    eventDate: row.event_date,
    location:  row.location  ?? null,
    notes:     row.notes     ?? null,
    createdAt: row.created_at,
  };
}

export async function getEventsByEdition(editionId: string): Promise<AwardEditionEventDTO[]> {
  const { data, error } = await db
    .from("award_edition_events")
    .select("*")
    .eq("edition_id", editionId)
    .order("event_date", { ascending: true });

  if (error) throw new Error(`Failed to load edition events: ${error.message}`);
  return (data ?? []).map(toEditionEventDTO);
}

export async function getUpcomingEventsByAward(awardId: string): Promise<AwardEditionEventDTO[]> {
  // Resolve edition IDs first, then filter events — avoids nested-join filtering.
  const { data: editions, error: edError } = await db
    .from("award_editions")
    .select("id")
    .eq("award_id", awardId);

  if (edError) throw new Error(`Failed to load editions: ${edError.message}`);
  const editionIds = (editions ?? []).map((e: any) => e.id as string);
  if (editionIds.length === 0) return [];

  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await db
    .from("award_edition_events")
    .select("*")
    .in("edition_id", editionIds)
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .limit(10);

  if (error) throw new Error(`Failed to load upcoming events: ${error.message}`);
  return (data ?? []).map(toEditionEventDTO);
}

export async function createEditionEvent(payload: {
  edition_id: string;
  event_type: AwardEditionEventType;
  event_date: string;
  location?: string | null;
  notes?: string | null;
}): Promise<AwardEditionEventDTO> {
  const { data, error } = await db
    .from("award_edition_events")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create event: ${error.message}`);
  return toEditionEventDTO(data);
}

export async function updateEditionEvent(
  eventId: string,
  payload: Record<string, unknown>,
): Promise<AwardEditionEventDTO> {
  const { data, error } = await db
    .from("award_edition_events")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", eventId)
    .select("*")
    .single();

  if (error) throw new Error(`Failed to update event: ${error.message}`);
  return toEditionEventDTO(data);
}

export async function deleteEditionEvent(eventId: string): Promise<void> {
  const { error } = await db.from("award_edition_events").delete().eq("id", eventId);
  if (error) throw new Error(`Failed to delete event: ${error.message}`);
}
