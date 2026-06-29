/** Matches `public.event_claim_status` enum. */
export type EventClaimStatus = "unclaimed" | "pending" | "claimed";

/**
 * Which organiser FK is populated on `events`.
 * `null` when no organiser identity is set.
 */
export type EventOrganiserKind = "user" | "person" | "company" | null;

/** One linked building row on an event (junction + building catalogue fields). */
export type EventBuilding = {
  /** `event_buildings.building_id` */
  buildingId: string;
  /** `buildings.name` */
  name: string;
  /** `buildings.slug` */
  slug: string | null;
  /** `buildings.city` */
  city: string | null;
  /** Resolved public URL from `buildings.hero_image_url` or `community_preview_url` */
  mainImageUrl: string | null;
  /** `event_buildings.sort_order` */
  sortOrder: number;
};

/** Resolved organiser for display (at most one FK set on `events`). */
export type EventOrganiser = {
  kind: EventOrganiserKind;
  /** Present when `kind === 'user'` (`events.organiser_user_id`) */
  userId?: string;
  /** Present when `kind === 'person'` (`events.organiser_person_id`) */
  personId?: string;
  /** Present when `kind === 'company'` (`events.organiser_company_id`) */
  companyId?: string;
  /** Profile username, person/company `name`, etc. */
  displayName: string | null;
  avatarUrl: string | null;
  slug: string | null;
  isVerified: boolean;
};

export type EventSubmitter = {
  /** `profiles.id` / `events.submitted_by_user_id` */
  userId: string;
  /** `profiles.username` */
  username: string | null;
  /** `profiles.avatar_url` */
  avatarUrl: string | null;
};

/** Full event view-model for detail routes and rich UI. */
export type EventDTO = {
  /** `events.id` */
  id: string;
  /** `events.title` */
  title: string;
  /** `events.description` */
  description: string | null;
  /** `events.slug` */
  slug: string;
  /** ISO string — `events.start_at` */
  startAt: string;
  /** ISO string | null — `events.end_at` */
  endAt: string | null;
  /** `events.address` */
  address: string | null;
  /** Derived from `events.location` (PostGIS geography) when parseable */
  lat: number | null;
  lng: number | null;
  /** `events.external_link` */
  externalLink: string | null;
  /** `events.cover_image_url` */
  coverImageUrl: string | null;
  /** `events.is_self_hosted` */
  isSelfHosted: boolean;
  /** `events.claim_status` */
  claimStatus: EventClaimStatus;
  submittedBy: EventSubmitter;
  organiser: EventOrganiser | null;
  buildings: EventBuilding[];
  /** `events.is_deleted` */
  isDeleted: boolean;
  /** `events.created_at` */
  createdAt: string;
  /** `events.updated_at` */
  updatedAt: string;
  /** `events.locality_id` — null for virtual/online events. */
  localityId: string | null;
  /** `events.country_code` — ISO 3166-1 alpha-2. null for virtual events. */
  countryCode: string | null;
  /** `events.city_slug` — for URL construction. null for virtual events. */
  citySlug: string | null;
};

/** Listing card shape: no building list; description capped for cards. */
export type EventCardDTO = Omit<EventDTO, "description" | "buildings"> & {
  /** Truncated plain text (max 160 chars) from `events.description` */
  description: string | null;
};

/** Typed API failure (never raw Postgrest errors). */
export type EventsApiError = {
  code: string;
  message: string;
};

/** Identity a signed-in user can claim an event as (maps to the `claim_event` RPC). */
export type EventClaimIdentity =
  | { kind: "user" }
  | { kind: "person"; id: string }
  | { kind: "company"; id: string };

/** An organiser entity the current user is allowed to claim an event on behalf of. */
export type ManageableOrganiser = {
  kind: "person" | "company";
  id: string;
  name: string;
  avatarUrl: string | null;
};
