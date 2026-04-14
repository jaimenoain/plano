import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type {
  EventBuilding,
  EventCardDTO,
  EventClaimStatus,
  EventDTO,
  EventOrganiser,
  EventSubmitter,
  EventsApiError,
} from "@/features/events/types";
import { parseLocation } from "@/utils/location";
import { getBuildingImageUrl } from "@/utils/image";

type EventRow = Tables<"events">;
type ProfileRow = Tables<"profiles">;
type PersonRow = Tables<"people">;
type CompanyRow = Tables<"companies">;
type BuildingRow = Tables<"buildings">;

type ProfileStub = Pick<ProfileRow, "id" | "username" | "avatar_url">;
type PersonStub = Pick<PersonRow, "id" | "name" | "slug" | "avatar_url" | "claim_status">;
type CompanyStub = Pick<CompanyRow, "id" | "name" | "slug" | "logo_url" | "claim_status">;

export const UPCOMING_EVENTS_PAGE_SIZE = 20;

function apiError(code: string, message: string): EventsApiError {
  return { code, message };
}

function throwApiError(code: string, message: string): never {
  throw apiError(code, message);
}

function asClaimStatus(v: string): EventClaimStatus {
  if (v === "unclaimed" || v === "pending" || v === "claimed") return v;
  return "unclaimed";
}

function truncate160(text: string | null): string | null {
  if (text == null) return null;
  if (text.length <= 160) return text;
  return `${text.slice(0, 157)}...`;
}

function isVerifiedEntityClaim(status: Tables<"people">["claim_status"]): boolean {
  return status === "verified";
}

async function fetchProfilesByIds(ids: string[]): Promise<Map<string, ProfileStub>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, ProfileStub>();
  if (unique.length === 0) return map;

  const { data, error } = await supabase.from("profiles").select("id, username, avatar_url").in("id", unique);

  if (error) throwApiError("profiles_fetch_failed", "Could not load profiles for this request.");
  for (const row of data ?? []) {
    map.set(row.id, row);
  }
  return map;
}

async function fetchPeopleByIds(ids: string[]): Promise<Map<string, PersonStub>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, PersonStub>();
  if (unique.length === 0) return map;

  const { data, error } = await supabase
    .from("people")
    .select("id, name, slug, avatar_url, claim_status")
    .in("id", unique);

  if (error) throwApiError("people_fetch_failed", "Could not load people for this request.");
  for (const row of data ?? []) {
    map.set(row.id, row);
  }
  return map;
}

async function fetchCompaniesByIds(ids: string[]): Promise<Map<string, CompanyStub>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, CompanyStub>();
  if (unique.length === 0) return map;

  const { data, error } = await supabase
    .from("companies")
    .select("id, name, slug, logo_url, claim_status")
    .in("id", unique);

  if (error) throwApiError("companies_fetch_failed", "Could not load companies for this request.");
  for (const row of data ?? []) {
    map.set(row.id, row);
  }
  return map;
}

function buildSubmitter(userId: string, profiles: Map<string, ProfileStub>): EventSubmitter {
  const p = profiles.get(userId);
  return {
    userId,
    username: p?.username ?? null,
    avatarUrl: p?.avatar_url ?? null,
  };
}

function buildOrganiser(
  row: EventRow,
  profiles: Map<string, ProfileStub>,
  people: Map<string, PersonStub>,
  companies: Map<string, CompanyStub>,
  embeddedPerson?: PersonStub | null,
  embeddedCompany?: CompanyStub | null,
): EventOrganiser | null {
  if (row.organiser_user_id) {
    const p = profiles.get(row.organiser_user_id);
    return {
      kind: "user",
      userId: row.organiser_user_id,
      displayName: p?.username ?? null,
      avatarUrl: p?.avatar_url ?? null,
      slug: null,
      isVerified: false,
    };
  }
  if (row.organiser_person_id) {
    const person = embeddedPerson ?? people.get(row.organiser_person_id);
    if (!person) return null;
    return {
      kind: "person",
      personId: person.id,
      displayName: person.name,
      avatarUrl: person.avatar_url,
      slug: person.slug,
      isVerified: isVerifiedEntityClaim(person.claim_status),
    };
  }
  if (row.organiser_company_id) {
    const company = embeddedCompany ?? companies.get(row.organiser_company_id);
    if (!company) return null;
    return {
      kind: "company",
      companyId: company.id,
      displayName: company.name,
      avatarUrl: company.logo_url,
      slug: company.slug,
      isVerified: isVerifiedEntityClaim(company.claim_status),
    };
  }
  return null;
}

type EventBuildingJoinRow = {
  sort_order: number;
  buildings: Pick<BuildingRow, "id" | "name" | "slug" | "city" | "hero_image_url" | "community_preview_url"> | null;
};

type EventDetailQueryRow = EventRow & {
  event_buildings?: EventBuildingJoinRow[] | null;
  organiser_person?: PersonStub | null;
  organiser_company?: CompanyStub | null;
};

function mapBuildings(rows: EventBuildingJoinRow[] | null | undefined): EventBuilding[] {
  if (!rows?.length) return [];
  const out: EventBuilding[] = [];
  for (const j of rows) {
    const b = j.buildings;
    if (!b?.id) continue;
    const imagePath = b.hero_image_url ?? b.community_preview_url;
    out.push({
      buildingId: b.id,
      name: b.name,
      slug: b.slug,
      city: b.city,
      mainImageUrl: getBuildingImageUrl(imagePath) ?? null,
      sortOrder: j.sort_order,
    });
  }
  out.sort((a, b) => a.sortOrder - b.sortOrder);
  return out;
}

function rowToEventDTO(
  row: EventRow,
  profiles: Map<string, ProfileStub>,
  people: Map<string, PersonStub>,
  companies: Map<string, CompanyStub>,
  buildings: EventBuilding[],
  embeddedPerson?: PersonStub | null,
  embeddedCompany?: CompanyStub | null,
): EventDTO {
  const coords = parseLocation(row.location);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    slug: row.slug,
    startAt: row.start_at,
    endAt: row.end_at,
    address: row.address,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    externalLink: row.external_link,
    coverImageUrl: row.cover_image_url,
    isSelfHosted: row.is_self_hosted,
    claimStatus: asClaimStatus(row.claim_status),
    submittedBy: buildSubmitter(row.submitted_by_user_id, profiles),
    organiser: buildOrganiser(row, profiles, people, companies, embeddedPerson, embeddedCompany),
    buildings,
    isDeleted: row.is_deleted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toCard(dto: EventDTO): EventCardDTO {
  const { buildings, description, ...rest } = dto;
  void buildings;
  return {
    ...rest,
    description: truncate160(description),
  };
}

export const EVENT_CARD_LIST_COLUMNS =
  "id, title, description, slug, start_at, end_at, address, location, external_link, cover_image_url, is_self_hosted, claim_status, submitted_by_user_id, organiser_user_id, organiser_person_id, organiser_company_id, is_deleted, created_at, updated_at";

/** Hydrates raw `events` rows into card DTOs (no building joins). */
export async function hydrateEventRowsToCards(list: EventRow[]): Promise<EventCardDTO[]> {
  if (list.length === 0) return [];

  const profileIds: string[] = [];
  for (const r of list) {
    profileIds.push(r.submitted_by_user_id);
    if (r.organiser_user_id) profileIds.push(r.organiser_user_id);
  }
  const personIds = list.map((r) => r.organiser_person_id).filter((x): x is string => Boolean(x));
  const companyIds = list.map((r) => r.organiser_company_id).filter((x): x is string => Boolean(x));

  const [profiles, people, companies] = await Promise.all([
    fetchProfilesByIds(profileIds),
    fetchPeopleByIds(personIds),
    fetchCompaniesByIds(companyIds),
  ]);

  return list.map((r) => toCard(rowToEventDTO(r, profiles, people, companies, [], undefined, undefined)));
}

export async function getUpcomingEvents(page: number): Promise<EventCardDTO[]> {
  if (page < 0 || !Number.isFinite(page)) {
    throwApiError("invalid_page", "Page must be a non-negative number.");
  }

  const from = page * UPCOMING_EVENTS_PAGE_SIZE;
  const to = from + UPCOMING_EVENTS_PAGE_SIZE - 1;

  const { data: rows, error } = await supabase
    .from("events")
    .select(EVENT_CARD_LIST_COLUMNS)
    .eq("is_deleted", false)
    .gte("start_at", new Date().toISOString())
    .order("start_at", { ascending: true })
    .range(from, to);

  if (error) throwApiError("events_list_failed", "Could not load upcoming events.");

  return hydrateEventRowsToCards(rows ?? []);
}

export async function getEventBySlug(slug: string): Promise<EventDTO> {
  const trimmed = slug.trim();
  if (!trimmed) throwApiError("invalid_slug", "Event slug is required.");

  const { data: row, error } = await supabase
    .from("events")
    .select(
      `
      id, title, description, slug, start_at, end_at, address, location, external_link, cover_image_url,
      is_self_hosted, claim_status, submitted_by_user_id, organiser_user_id, organiser_person_id, organiser_company_id,
      is_deleted, created_at, updated_at,
      event_buildings (
        sort_order,
        buildings ( id, name, slug, city, hero_image_url, community_preview_url )
      ),
      organiser_person:people!events_organiser_person_id_fkey ( id, name, slug, avatar_url, claim_status ),
      organiser_company:companies!events_organiser_company_id_fkey ( id, name, slug, logo_url, claim_status )
    `,
    )
    .eq("slug", trimmed)
    .eq("is_deleted", false)
    .maybeSingle();

  if (error) throwApiError("event_fetch_failed", "Could not load this event.");
  if (!row) throwApiError("not_found", "This event could not be found.");

  const typed = row as unknown as EventDetailQueryRow;

  const profileIds = [typed.submitted_by_user_id, typed.organiser_user_id].filter((x): x is string => Boolean(x));
  const profiles = await fetchProfilesByIds(profileIds);

  const peopleMap = new Map<string, PersonStub>();
  const companiesMap = new Map<string, CompanyStub>();
  if (typed.organiser_person) peopleMap.set(typed.organiser_person.id, typed.organiser_person);
  if (typed.organiser_company) companiesMap.set(typed.organiser_company.id, typed.organiser_company);

  const buildings = mapBuildings(typed.event_buildings);

  return rowToEventDTO(typed, profiles, peopleMap, companiesMap, buildings, typed.organiser_person, typed.organiser_company);
}

export async function getEventsByBuilding(buildingId: string): Promise<EventCardDTO[]> {
  const id = buildingId.trim();
  if (!id) throwApiError("invalid_building", "Building id is required.");

  const { data: links, error: linkError } = await supabase
    .from("event_buildings")
    .select("event_id")
    .eq("building_id", id);

  if (linkError) throwApiError("event_buildings_fetch_failed", "Could not load events for this building.");

  const eventIds = [...new Set((links ?? []).map((l) => l.event_id))];
  if (eventIds.length === 0) return [];

  const { data: rows, error } = await supabase
    .from("events")
    .select(EVENT_CARD_LIST_COLUMNS)
    .in("id", eventIds)
    .eq("is_deleted", false)
    .order("start_at", { ascending: true });

  if (error) throwApiError("events_by_building_failed", "Could not load events for this building.");

  return hydrateEventRowsToCards(rows ?? []);
}
