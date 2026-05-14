import { supabase } from "@/integrations/supabase/client";
import type {
  FeedItem,
  FeedItemMomentCluster,
  ClusterPost,
  ClusterActor,
  ClusterBuilding,
  ClusterLocality,
} from "@/types/feedItem";

interface RawClusterRow {
  cluster_id: string;
  cluster_kind: "multi_user_locality" | "multi_photo_single_building" | "multi_user_single_building";
  lead_post: {
    id: string;
    content?: string | null;
    created_at?: string;
    building_id: string;
    building_name: string;
    building_city?: string | null;
    image_storage_path?: string | null;
  } | null;
  supporting_posts:
    | Array<{
        id: string;
        building_id: string;
        building_name: string;
        image_storage_path?: string | null;
      }>
    | null;
  actors:
    | Array<{
        id: string;
        username: string;
        avatar_url: string | null;
      }>
    | null;
  building_or_locality: {
    kind: "building" | "locality";
    // building
    building_id?: string;
    building_name?: string;
    city?: string | null;
    main_image_url?: string | null;
    community_preview_url?: string | null;
    slug?: string | null;
    short_id?: number | null;
    // locality
    locality_id?: string;
  } | null;
  score: number;
}

/**
 * Builds the one-line attribution string for a moment cluster card.
 * Exported for unit testing.
 */
export function buildClusterAttribution(
  clusterKind: FeedItemMomentCluster["clusterKind"],
  actors: ClusterActor[],
  buildingOrLocality: ClusterBuilding | ClusterLocality,
): string {
  const actorCount = actors.length;
  const firstName = actors[0]?.username ?? "Someone";

  if (clusterKind === "multi_user_locality") {
    const city =
      buildingOrLocality.kind === "locality"
        ? (buildingOrLocality.city ?? "this area")
        : "this area";
    if (actorCount === 1) return `${firstName} visited ${city} this week`;
    if (actorCount === 2)
      return `${firstName} and ${actors[1].username} visited ${city} this week`;
    return `${firstName} and ${actorCount - 1} others you follow visited ${city} this week`;
  }

  if (clusterKind === "multi_photo_single_building") {
    const buildingName =
      buildingOrLocality.kind === "building"
        ? buildingOrLocality.buildingName
        : "this building";
    return `${firstName} posted multiple photos at ${buildingName}`;
  }

  // multi_user_single_building
  const buildingName =
    buildingOrLocality.kind === "building"
      ? buildingOrLocality.buildingName
      : "this building";
  if (actorCount === 1) return `${firstName} visited ${buildingName}`;
  if (actorCount === 2)
    return `${firstName} and ${actors[1].username} both visited ${buildingName}`;
  return `${firstName} and ${actorCount - 1} others you follow visited ${buildingName}`;
}

function mapRawPost(raw: RawClusterRow["lead_post"]): ClusterPost | null {
  if (!raw) return null;
  return {
    id: raw.id,
    content: raw.content ?? null,
    createdAt: raw.created_at,
    buildingId: raw.building_id,
    buildingName: raw.building_name,
    buildingCity: raw.building_city ?? null,
    imageStoragePath: raw.image_storage_path ?? null,
  };
}

function mapSupportingPost(raw: NonNullable<RawClusterRow["supporting_posts"]>[number]): ClusterPost {
  return {
    id: raw.id,
    buildingId: raw.building_id,
    buildingName: raw.building_name,
    imageStoragePath: raw.image_storage_path ?? null,
  };
}

function mapBuildingOrLocality(
  raw: RawClusterRow["building_or_locality"],
): ClusterBuilding | ClusterLocality {
  if (!raw) {
    return { kind: "locality", localityId: "", city: null };
  }
  if (raw.kind === "building") {
    return {
      kind: "building",
      buildingId: raw.building_id ?? "",
      buildingName: raw.building_name ?? "Unknown Building",
      city: raw.city ?? null,
      mainImageUrl: raw.main_image_url ?? null,
      communityPreviewUrl: raw.community_preview_url ?? null,
      slug: raw.slug ?? null,
      shortId: raw.short_id ?? null,
    };
  }
  return {
    kind: "locality",
    localityId: raw.locality_id ?? "",
    city: raw.city ?? null,
    buildingName: raw.building_name,
    mainImageUrl: raw.main_image_url ?? null,
  };
}

/**
 * Calls `get_feed_clusters` and maps rows to `FeedItemMomentCluster`.
 *
 * Cluster items use the RPC-provided `cluster_id` as their feed id so they
 * cannot collide with post ids in seen-tracking or dedup logic.
 */
export async function getFeedClusters({
  limit = 20,
  offset = 0,
}: { limit?: number; offset?: number } = {}): Promise<FeedItem[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("get_feed_clusters", {
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw error;

  const rows = (data ?? []) as unknown as RawClusterRow[];

  return rows.flatMap((row): FeedItemMomentCluster[] => {
    const leadPost = mapRawPost(row.lead_post);
    if (!leadPost) return [];

    const supportingPosts = (row.supporting_posts ?? []).map(mapSupportingPost);
    const actors: ClusterActor[] = (row.actors ?? []).map((a) => ({
      id: a.id,
      username: a.username,
      avatarUrl: a.avatar_url ?? null,
    }));
    const buildingOrLocality = mapBuildingOrLocality(row.building_or_locality);

    return [
      {
        kind: "moment_cluster",
        id: row.cluster_id,
        ring: "direct",
        score: row.score ?? 0,
        clusterKind: row.cluster_kind,
        leadPost,
        supportingPosts,
        actors,
        buildingOrLocality,
        attribution: {
          kind: "direct",
          text: buildClusterAttribution(row.cluster_kind, actors, buildingOrLocality),
        },
      },
    ];
  });
}
