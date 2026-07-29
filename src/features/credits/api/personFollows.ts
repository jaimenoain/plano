import { supabase } from "@/integrations/supabase/client";
import type { Person } from "../types";

/** One row in the person-followers dialog. */
export interface PersonFollowerProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

/**
 * Follows of a person branch on claim state:
 * - unclaimed → rows in `person_follows` (converted by `claim_person` on claim)
 * - claimed  → ordinary user follows of the claimant (`follows.following_id`)
 *
 * The claimed branch is read-only here — the page renders the ordinary
 * `FollowButton` against `claimedByUserId`, which owns its own writes.
 */

export async function getPersonFollowState(personId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("person_follows")
    .select("person_id")
    .eq("person_id", personId)
    .eq("follower_user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function followPerson(personId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("person_follows")
    .insert({ person_id: personId, follower_user_id: userId });
  // 23505 = already following (double-click); treat as success.
  if (error && error.code !== "23505") throw error;
}

export async function unfollowPerson(personId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("person_follows")
    .delete()
    .eq("person_id", personId)
    .eq("follower_user_id", userId);
  if (error) throw error;
}

export async function getPersonFollowerCount(person: Pick<Person, "id" | "claimedByUserId">): Promise<number> {
  if (person.claimedByUserId) {
    const { count, error } = await supabase
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("following_id", person.claimedByUserId);
    if (error) throw error;
    return count ?? 0;
  }
  const { count, error } = await supabase
    .from("person_follows")
    .select("person_id", { count: "exact", head: true })
    .eq("person_id", person.id);
  if (error) throw error;
  return count ?? 0;
}

export async function listPersonFollowers(
  person: Pick<Person, "id" | "claimedByUserId">,
): Promise<PersonFollowerProfile[]> {
  const followerIds: string[] = [];
  if (person.claimedByUserId) {
    const { data, error } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("following_id", person.claimedByUserId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    followerIds.push(...(data ?? []).map((r) => r.follower_id));
  } else {
    const { data, error } = await supabase
      .from("person_follows")
      .select("follower_user_id")
      .eq("person_id", person.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    followerIds.push(...(data ?? []).map((r) => r.follower_user_id));
  }

  if (followerIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", followerIds);
  if (profilesError) throw profilesError;

  // Preserve recency order from the follow rows.
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return followerIds
    .map((id) => byId.get(id))
    .filter((p): p is PersonFollowerProfile => Boolean(p));
}

export const personFollowKeys = {
  state: (personId: string, userId: string) => ["person-follow-state", personId, userId] as const,
  // claimedByUserId is part of the key because the count/list source branches on
  // claim state; invalidation by ["person-follower-count", personId] prefix still works.
  count: (personId: string, claimedByUserId?: string | null) =>
    ["person-follower-count", personId, claimedByUserId ?? null] as const,
  list: (personId: string, claimedByUserId?: string | null) =>
    ["person-followers", personId, claimedByUserId ?? null] as const,
};
