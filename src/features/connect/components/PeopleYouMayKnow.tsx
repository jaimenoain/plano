/**
 * PeopleYouMayKnow.tsx — Redesigned with A24 editorial aesthetic
 *
 * Changes:
 *  - Section label: text-2xs uppercase tracking-widest (no UserPlus icon)
 *  - Card wrappers removed: no bg-surface-card, no border, no rounded-lg, no shadow
 *  - Suggestions render as a flat list; each UserRow is separated by a
 *    border-b border-border-default rule — content floats on the white canvas
 *  - Loading skeleton: rectangular blocks, no rounded corners
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { UserRow } from "./UserRow";

interface SuggestionUser {
  id: string;
  username: string | null;
  avatar_url: string | null;
  mutual_follows?: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  }[];
}

type SuggestedHideRow = { suggested_user_id: string };

type MutualFollowRow = {
  following_id: string;
  follower:
    | { id: string; username: string | null; avatar_url: string | null }
    | { id: string; username: string | null; avatar_url: string | null }[]
    | null;
};

export function PeopleYouMayKnow() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<SuggestionUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data: followingData } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);

        const realFollowingIds = followingData?.map(f => f.following_id) || [];
        const followingIds = new Set(realFollowingIds);
        followingIds.add(user.id);

        const { data: hiddenData } = await supabase
          .from("suggested_profile_hides")
          .select("suggested_user_id")
          .eq("user_id", user.id);

        const hiddenIds = new Set(
          (hiddenData as SuggestedHideRow[] | null)?.map((h) => h.suggested_user_id) || []
        );

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .limit(30);

        if (profiles) {
          const filtered = profiles
            .filter((p) => !followingIds.has(p.id) && !hiddenIds.has(p.id))
            .slice(0, 3);

          const candidateIds = filtered.map((u) => u.id);

          if (candidateIds.length > 0 && realFollowingIds.length > 0) {
            const { data: mutualsData } = await supabase
              .from("follows")
              .select(`
                following_id,
                follower:profiles!follows_follower_id_fkey(id, username, avatar_url)
              `)
              .in("following_id", candidateIds)
              .in("follower_id", realFollowingIds);

            const mutualRows = (mutualsData ?? []) as unknown as MutualFollowRow[];
            const suggestionsWithMutuals = filtered.map((candidate) => {
              const mutuals = mutualRows
                .filter((m) => m.following_id === candidate.id)
                .map((m) => {
                  const f = m.follower;
                  return Array.isArray(f) ? f[0] : f;
                })
                .filter((f): f is NonNullable<typeof f> => f != null);

              return { ...candidate, mutual_follows: mutuals || [] };
            });
            setSuggestions(suggestionsWithMutuals);
          } else {
            setSuggestions(filtered);
          }
        }
      } catch (_error) {
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [user]);

  const handleHide = async (suggestedId: string) => {
    if (!user) return;
    setSuggestions(prev => prev.filter(p => p.id !== suggestedId));
    try {
      const { error } = await supabase
        .from("suggested_profile_hides")
        .insert({ user_id: user.id, suggested_user_id: suggestedId });
      if (error) throw error;
    } catch (_err) {
      void _err;
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-3 w-36 bg-surface-muted animate-pulse" />
        <div className="space-y-0">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4 py-4 border-b border-border-default last:border-0">
              <div className="h-9 w-9 bg-surface-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-28 bg-surface-muted animate-pulse" />
                <div className="h-3 w-20 bg-surface-muted/60 animate-pulse" />
              </div>
              <div className="h-7 w-16 bg-surface-muted animate-pulse shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div>
      {/* Section label — 2xs uppercase, no icon */}
      <p className="text-2xs font-medium tracking-widest uppercase text-text-secondary mb-6">
        People you may know
      </p>

      {/* Flat list — no card chrome */}
      <div>
        {suggestions.map(u => (
          <div
            key={u.id}
            className="border-b border-border-default last:border-0"
          >
            <UserRow
              user={u}
              showFollowButton={true}
              mutualFollows={u.mutual_follows}
              onHide={() => handleHide(u.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}