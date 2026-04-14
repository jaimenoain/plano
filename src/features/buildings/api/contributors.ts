// src/features/buildings/api/contributors.ts

import { supabase } from '@/integrations/supabase/client';

// ── Types ────────────────────────────────────────────────────────────────────

export type ContributorRole =
  | 'building_creator'
  | 'first_reviewer'
  | 'first_photographer'
  | 'cover_photo'
  | 'top_photographer'
  | 'most_photo_likes'
  | 'most_liked_review'
  | 'credit_linker';

export const CONTRIBUTOR_ROLE_LABELS: Record<ContributorRole, string> = {
  building_creator:  'Added to Plano',
  first_reviewer:    'First review',
  first_photographer:'First photos',
  cover_photo:       'Cover photo',
  top_photographer:  'Top photographer',
  most_photo_likes:  'Most liked photos',
  most_liked_review: 'Most liked review',
  credit_linker:     'Architect credit',
};

export interface ContributorUser {
  id:        string;
  username:  string;
  avatarUrl: string | null;
}

export interface ContributorEntry {
  role:    ContributorRole;
  label:   string;
  user:    ContributorUser;
  detail?: string;
}

// ── Internal helpers ─────────────────────────────────────────────────────────

type RawProfile = { id: string; username: string | null; avatar_url: string | null } | null;

function toUser(profile: RawProfile): ContributorUser | null {
  if (!profile?.username) return null;
  return { id: profile.id, username: profile.username, avatarUrl: profile.avatar_url };
}

function shortDate(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  return new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

function plural(n: number, word: string) {
  return `${n} ${word}${n !== 1 ? 's' : ''}`;
}

// ── Main query ───────────────────────────────────────────────────────────────

export async function getBuildingContributors(
  buildingId: string,
): Promise<ContributorEntry[]> {

  // Four parallel queries, one sequential follow-up for review likes.
  const [buildingRes, reviewsRes, photosRes, creditsRes] = await Promise.all([

    supabase
      .from('buildings')
      .select('created_by, hero_image_id, profiles!created_by(id, username, avatar_url)')
      .eq('id', buildingId)
      .single(),

    supabase
      .from('user_buildings')
      .select('id, user_id, content, created_at, profiles!user_id(id, username, avatar_url)')
      .eq('building_id', buildingId)
      .order('created_at', { ascending: true }),

    supabase
      .from('review_images')
      .select('id, user_id, likes_count, created_at, profiles!user_id(id, username, avatar_url)')
      .eq('building_id', buildingId)
      .order('created_at', { ascending: true }),

    supabase
      .from('building_credits')
      .select('added_by_user_id, profiles!added_by_user_id(id, username, avatar_url)')
      .eq('building_id', buildingId)
      .eq('status', 'approved')
      .not('added_by_user_id', 'is', null),
  ]);

  const entries: ContributorEntry[] = [];

  const reviews = reviewsRes.data ?? [];
  const photos  = photosRes.data  ?? [];
  const credits = creditsRes.data ?? [];

  // ── Building creator ───────────────────────────────────────────────────────
  if (buildingRes.data) {
    const profile = buildingRes.data.profiles as RawProfile;
    const user    = toUser(profile);
    if (user) {
      entries.push({ role: 'building_creator', label: CONTRIBUTOR_ROLE_LABELS.building_creator, user });
    }
  }

  // ── First reviewer (earliest user_buildings row with review text) ──────────
  const firstReview = reviews.find(r => r.content);
  if (firstReview) {
    const user = toUser(firstReview.profiles as RawProfile);
    if (user) {
      entries.push({
        role:   'first_reviewer',
        label:  CONTRIBUTOR_ROLE_LABELS.first_reviewer,
        user,
        detail: shortDate(firstReview.created_at),
      });
    }
  }

  // ── First photographer ────────────────────────────────────────────────────
  if (photos.length > 0) {
    const user = toUser(photos[0].profiles as RawProfile);
    if (user) {
      entries.push({
        role:   'first_photographer',
        label:  CONTRIBUTOR_ROLE_LABELS.first_photographer,
        user,
        detail: shortDate(photos[0].created_at),
      });
    }
  }

  // ── Cover photo (hero image contributor) ──────────────────────────────────
  const heroImageId = buildingRes.data?.hero_image_id;
  if (heroImageId) {
    const heroPhoto = photos.find(p => p.id === heroImageId);
    if (heroPhoto) {
      const user = toUser(heroPhoto.profiles as RawProfile);
      if (user) {
        const likes = heroPhoto.likes_count ?? 0;
        entries.push({
          role:   'cover_photo',
          label:  CONTRIBUTOR_ROLE_LABELS.cover_photo,
          user,
          detail: likes > 0 ? plural(likes, 'like') : undefined,
        });
      }
    }
  }

  // ── Top photographer (most photos uploaded for this building) ─────────────
  if (photos.length > 0) {
    const countByUser = new Map<string, { count: number; user: ContributorUser }>();
    for (const photo of photos) {
      const user = toUser(photo.profiles as RawProfile);
      if (!user) continue;
      const existing = countByUser.get(user.id);
      if (existing) existing.count++;
      else countByUser.set(user.id, { count: 1, user });
    }
    const sorted = [...countByUser.values()].sort((a, b) => b.count - a.count);
    const top    = sorted[0];
    if (top && top.count >= 2) {
      entries.push({
        role:   'top_photographer',
        label:  CONTRIBUTOR_ROLE_LABELS.top_photographer,
        user:   top.user,
        detail: plural(top.count, 'photo'),
      });
    }
  }

  // ── Most photo likes (sum of image likes per contributor) ─────────────────
  if (photos.some(p => (p.likes_count ?? 0) > 0)) {
    const likesByUser = new Map<string, { total: number; user: ContributorUser }>();
    for (const photo of photos) {
      const user  = toUser(photo.profiles as RawProfile);
      if (!user) continue;
      const likes = photo.likes_count ?? 0;
      const existing = likesByUser.get(user.id);
      if (existing) existing.total += likes;
      else likesByUser.set(user.id, { total: likes, user });
    }
    const sorted = [...likesByUser.values()].sort((a, b) => b.total - a.total);
    const top    = sorted[0];
    if (top && top.total > 0) {
      entries.push({
        role:   'most_photo_likes',
        label:  CONTRIBUTOR_ROLE_LABELS.most_photo_likes,
        user:   top.user,
        detail: plural(top.total, 'like'),
      });
    }
  }

  // ── Most liked review ──────────────────────────────────────────────────────
  // Sequential: only runs if there are reviews to look up.
  if (reviews.length > 0) {
    const reviewIds = reviews.map(r => r.id);
    const { data: likesData } = await supabase
      .from('likes')
      .select('interaction_id')
      .in('interaction_id', reviewIds);

    if (likesData && likesData.length > 0) {
      const countById = new Map<string, number>();
      for (const row of likesData) {
        countById.set(row.interaction_id, (countById.get(row.interaction_id) ?? 0) + 1);
      }
      const [topId, topCount] = [...countById.entries()].sort((a, b) => b[1] - a[1])[0];
      const topReview = reviews.find(r => r.id === topId);
      if (topReview) {
        const user = toUser(topReview.profiles as RawProfile);
        if (user) {
          entries.push({
            role:   'most_liked_review',
            label:  CONTRIBUTOR_ROLE_LABELS.most_liked_review,
            user,
            detail: plural(topCount, 'like'),
          });
        }
      }
    }
  }

  // ── Architect credit linkers (distinct users who added approved credits) ───
  const seenCreditUsers = new Set<string>();
  for (const credit of credits) {
    const user = toUser(credit.profiles as RawProfile);
    if (!user || seenCreditUsers.has(user.id)) continue;
    seenCreditUsers.add(user.id);
    entries.push({ role: 'credit_linker', label: CONTRIBUTOR_ROLE_LABELS.credit_linker, user });
  }

  return entries;
}

export const buildingContributorsQueryKey = (buildingId: string) =>
  ['building-contributors', buildingId] as const;
