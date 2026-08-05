/**
 * discoveryFeedHydration.ts — folds the batched side-queries onto a page of
 * `get_discovery_feed` rows.
 *
 * The RPC returns only the building columns; credits, photos, and the interactions of
 * people the user follows are fetched in one batch each and stitched on here. Kept out
 * of the hook so the mapping is pure and independently testable.
 */
import type {
  ContactInteraction,
  ContactRater,
} from "@/features/search/components/types";

// Re-exported so the feed hook and card can name the type without each taking their
// own cross-feature import of the search types module.
export type { ContactInteraction };

export interface DiscoveryFeedImageRow {
  id: string;
  storage_path: string;
  likes_count?: number | null;
  created_at?: string | null;
  building_posts?: {
    building_id: string;
    user: ContactRater | ContactRater[];
  } | null;
}

export interface BuildingCreditEmbedRow {
  building_id: string;
  person: { id: string; name: string } | null;
  company: { id: string; name: string } | null;
}

export interface UserBuildingInteractionRow {
  building_id: string;
  status: string;
  rating: number | null;
  user: ContactRater | ContactRater[];
}

/** The shape hydration needs; the full item type lives with the hook. */
interface Hydratable {
  id: string;
  credits: { id: string; name: string }[] | null;
  contact_interactions?: ContactInteraction[];
  images?: DiscoveryFeedImageRow[];
}

/** Max photos carried per building — the card's gallery never shows more. */
const MAX_IMAGES_PER_BUILDING = 10;

/** A person, a company, or "Person @ Company" when the credit names both. */
function creditLabel(
  row: BuildingCreditEmbedRow
): { id: string; name: string } | null {
  const { person: p, company: c } = row;
  if (p && c) return { id: p.id, name: `${p.name} @ ${c.name}` };
  if (p) return { id: p.id, name: p.name };
  if (c) return { id: c.id, name: c.name };
  return null;
}

export function hydrateDiscoveryBuildings<T extends Hydratable>(
  buildings: T[],
  rows: {
    credits: BuildingCreditEmbedRow[] | null;
    images: DiscoveryFeedImageRow[] | null;
    interactions: UserBuildingInteractionRow[] | null;
  }
): T[] {
  if (rows.credits) {
    const byBuilding: Record<string, { id: string; name: string }[]> = {};
    rows.credits.forEach((row) => {
      const entry = creditLabel(row);
      if (!entry) return;
      (byBuilding[row.building_id] ??= []).push(entry);
    });
    buildings.forEach((b) => {
      b.credits = byBuilding[b.id] || [];
    });
  }

  if (rows.images) {
    const byBuilding: Record<string, DiscoveryFeedImageRow[]> = {};
    rows.images.forEach((row) => {
      const buildingId = row.building_posts?.building_id;
      if (!buildingId) return;
      const list = (byBuilding[buildingId] ??= []);
      if (list.length < MAX_IMAGES_PER_BUILDING) list.push(row);
    });
    buildings.forEach((b) => {
      b.images = byBuilding[b.id] || [];
    });
  }

  if (rows.interactions && rows.interactions.length > 0) {
    const byBuilding: Record<string, ContactInteraction[]> = {};
    rows.interactions.forEach((row) => {
      const profile = Array.isArray(row.user) ? row.user[0] : row.user;
      (byBuilding[row.building_id] ??= []).push({
        user: {
          id: profile.id,
          username: profile.username ?? null,
          avatar_url: profile.avatar_url,
          first_name: null,
          last_name: null,
        },
        status: row.status as ContactInteraction["status"],
        rating: row.rating,
      });
    });
    buildings.forEach((b) => {
      b.contact_interactions = byBuilding[b.id] || [];
    });
  }

  return buildings;
}
