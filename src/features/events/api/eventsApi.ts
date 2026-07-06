import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type {
  EventBuilding,
  EventCardDTO,
  EventClaimIdentity,
  EventClaimStatus,
  EventDTO,
  EventOrganiser,
  EventSubmitter,
  EventsApiError,
  ManageableOrganiser,
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
  row: EventCardListRow,
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
  row: EventCardListRow,
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
    localityId: null,
    countryCode: null,
    citySlug: null,
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

/** The subset of `events` columns selected by EVENT_CARD_LIST_COLUMNS. */
type EventCardListRow = Pick<
  EventRow,
  | "id"
  | "title"
  | "description"
  | "slug"
  | "start_at"
  | "end_at"
  | "address"
  | "location"
  | "external_link"
  | "cover_image_url"
  | "is_self_hosted"
  | "claim_status"
  | "submitted_by_user_id"
  | "organiser_user_id"
  | "organiser_person_id"
  | "organiser_company_id"
  | "is_deleted"
  | "created_at"
  | "updated_at"
>;

/** Hydrates raw `events` rows into card DTOs (no building joins). */
export async function hydrateEventRowsToCards(list: EventCardListRow[]): Promise<EventCardDTO[]> {
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

function parseClaimRpcPayload(raw: unknown): { ok: boolean; error?: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "rpc_error" };
  const o = raw as Record<string, unknown>;
  if (o.ok === true) return { ok: true };
  const err = o.error;
  if (typeof err === "string") return { ok: false, error: err };
  return { ok: false, error: "rpc_error" };
}

/**
 * Claim an unclaimed event for the signed-in user via the `claim_event` RPC, then return the
 * refreshed event. `identity` selects whether the caller claims as themselves (host) or links the
 * event to a person/company they manage. Errors are surfaced as typed `EventsApiError`.
 */
export async function claimEvent(
  eventId: string,
  slug: string,
  identity: EventClaimIdentity,
): Promise<EventDTO> {
  const id = eventId.trim();
  if (!id) throwApiError("invalid_event", "Event id is required.");

  const organiserId = identity.kind === "user" ? null : identity.id;

  const { data: rpcRaw, error: rpcError } = await supabase.rpc("claim_event", {
    p_event_id: id,
    p_organiser_kind: identity.kind,
    p_organiser_id: organiserId ?? undefined,
  });

  if (rpcError) throwApiError("rpc_error", rpcError.message);

  const parsed = parseClaimRpcPayload(rpcRaw);
  if (!parsed.ok) {
    const code = parsed.error ?? "rpc_error";
    const messages: Record<string, string> = {
      not_authenticated: "Sign in to claim this event.",
      not_found: "This event could not be found.",
      not_claimable: "This event has already been claimed.",
      not_authorized: "You are not allowed to claim on behalf of that organiser.",
      invalid_kind: "Invalid organiser type.",
      rpc_error: "Something went wrong. Try again in a moment.",
    };
    throwApiError(code, messages[code] ?? messages.rpc_error);
  }

  return getEventBySlug(slug);
}

/**
 * Organiser entities (people + companies) the current signed-in user may claim an event on behalf
 * of: people they have claimed and companies where they are a steward. Returns [] when signed out.
 */
export async function getManageableOrganisers(): Promise<ManageableOrganiser[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const [peopleRes, stewardRes] = await Promise.all([
    supabase.from("people").select("id, name, avatar_url").eq("claimed_by_user_id", user.id),
    supabase
      .from("company_stewards")
      .select("companies ( id, name, logo_url )")
      .eq("user_id", user.id),
  ]);

  const out: ManageableOrganiser[] = [];

  if (!peopleRes.error) {
    for (const p of peopleRes.data ?? []) {
      out.push({ kind: "person", id: p.id, name: p.name, avatarUrl: p.avatar_url });
    }
  }

  if (!stewardRes.error) {
    type StewardJoinRow = { companies: Pick<CompanyRow, "id" | "name" | "logo_url"> | null };
    for (const row of (stewardRes.data ?? []) as unknown as StewardJoinRow[]) {
      const c = row.companies;
      if (c?.id) out.push({ kind: "company", id: c.id, name: c.name, avatarUrl: c.logo_url });
    }
  }

  return out;
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
