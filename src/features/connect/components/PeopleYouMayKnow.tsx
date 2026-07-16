/**
 * PeopleYouMayKnow.tsx  (feed)
 * Replaces: src/features/feed/components/PeopleYouMayKnow.tsx
 *
 * A24 editorial aesthetic — flat border-separated list, no card chrome,
 * no carousel. Reuses UserRow from the connect feature.
 */
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { UserRow } from "@/features/connect/components/UserRow";

interface SuggestionUser {
  id: string;
  username: string | null;
  avatar_url: string | null;
  mutual_follows?: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  }[];
  is_follows_me?: boolean;
}

type SuggestedHideRow = { suggested_user_id: string };

type MutualFollowRow = {
  following_id: string;
  follower:
    | { id: string; username: string | null; avatar_url: string | null }
    | { id: string; username: string | null; avatar_url: string | null }[]
    | null;
};

interface PeopleYouMayKnowProps {
  /**
   * `default` — full-page list (e.g. /connect). `stacked` — narrow feed sidebar rail:
   * forwards `layout="stacked"` to UserRow and wraps itself in a bordered `<section>`
   * so the module (and its top divider) disappears cleanly when there are no suggestions.
   */
  layout?: "default" | "stacked";
  /** Section heading text. */
  heading?: string;
  /** Maximum suggestions to render. Defaults to 4 (the /connect page count). */
  limit?: number;
}

export function PeopleYouMayKnow({
  layout = "default",
  heading = "People you may know",
  limit = 4,
}: PeopleYouMayKnowProps) {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<SuggestionUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data: followingData } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);
        const realFollowingIds = followingData?.map((f) => f.following_id) || [];
        const followingIds = new Set(realFollowingIds);
        followingIds.add(user.id);

        const { data: hiddenData } = await supabase
          .from("suggested_profile_hides")
          .select("suggested_user_id")
          .eq("user_id", user.id);
        const hiddenIds = new Set(
          (hiddenData as SuggestedHideRow[] | null)?.map((h) => h.suggested_user_id) || []
        );

        const { data: rpcRows } = await supabase.rpc("get_people_you_may_know", {
          p_limit: 5,
        });
        const candidates = ((rpcRows as unknown as SuggestionUser[]) ?? [])
          .filter((p) => !followingIds.has(p.id) && !hiddenIds.has(p.id))
          .slice(0, limit);

        if (candidates.length > 0 && realFollowingIds.length > 0) {
          const candidateIds = candidates.map((u) => u.id);
          const { data: mutualsData } = await supabase
            .from("follows")
            .select(`
              following_id,
              follower:profiles!follows_follower_id_fkey(id, username, avatar_url)
            `)
            .in("following_id", candidateIds)
            .in("follower_id", realFollowingIds);
          const mutualRows = (mutualsData ?? []) as unknown as MutualFollowRow[];
          setSuggestions(
            candidates.map((candidate) => {
              const mutuals = mutualRows
                .filter((m) => m.following_id === candidate.id)
                .map((m) => {
                  const f = m.follower;
                  return Array.isArray(f) ? f[0] : f;
                })
                .filter((f): f is NonNullable<typeof f> => f != null);
              return { ...candidate, mutual_follows: mutuals };
            })
          );
        } else {
          setSuggestions(candidates);
        }
      } catch (err) {
        void err;
      } finally {
        setLoading(false);
      }
    };
    fetchSuggestions();
  }, [user, limit]);

  const handleHide = async (suggestedId: string) => {
    if (!user) return;
    setSuggestions((prev) => prev.filter((p) => p.id !== suggestedId));
    try {
      await supabase
        .from("suggested_profile_hides")
        .insert({ user_id: user.id, suggested_user_id: suggestedId });
    } catch (_err) {
      void _err;
    }
  };

  const isStacked = layout === "stacked";

  // In the sidebar rail, the module owns its own top divider so it vanishes (border and all)
  // when there are no suggestions; on the full page Connect provides the surrounding section.
  const wrap = (content: ReactNode) =>
    isStacked ? (
      <section className="border-t border-border-default pt-9">{content}</section>
    ) : (
      content
    );

  const headingEl = (
    <p
      className={
        isStacked
          ? "mb-3.5 text-2xs-plus font-medium uppercase tracking-widest text-text-disabled"
          : "eyebrow tracking-widest mb-4"
      }
    >
      {heading}
    </p>
  );

  // ── Loading skeleton — rectangular blocks, no rounded corners ──
  if (loading) {
    if (isStacked) {
      return wrap(
        <div className="space-y-4">
          <div className="h-2.5 w-32 bg-surface-muted animate-pulse" />
          <div>
            {Array.from({ length: limit }, (_, i) => i).map((i) => (
              <div
                key={i}
                className="flex flex-col gap-3 p-4 border-b border-border-default last:border-0"
              >
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 bg-surface-muted animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2 pr-5">
                    <div className="h-3 w-28 bg-surface-muted animate-pulse" />
                    <div className="h-2.5 w-20 bg-surface-muted/60 animate-pulse" />
                  </div>
                </div>
                <div className="h-9 w-full bg-surface-muted animate-pulse" />
              </div>
            ))}
          </div>
        </div>,
      );
    }
    return wrap(
      <div className="space-y-4">
        <div className="h-2.5 w-32 bg-surface-muted animate-pulse" />
        <div>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 py-4 border-b border-border-default last:border-0"
            >
              <div className="h-9 w-9 bg-surface-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-28 bg-surface-muted animate-pulse" />
                <div className="h-2.5 w-20 bg-surface-muted/60 animate-pulse" />
              </div>
              <div className="h-7 w-16 bg-surface-muted animate-pulse shrink-0" />
            </div>
          ))}
        </div>
      </div>,
    );
  }

  if (suggestions.length === 0) return null;

  return wrap(
    <div>
      {headingEl}
      <div>
        {suggestions.map((u) => (
          <UserRow
            key={u.id}
            user={u}
            showFollowButton
            layout={layout}
            isFollower={u.is_follows_me}
            mutualFollows={u.mutual_follows}
            onHide={() => handleHide(u.id)}
          />
        ))}
      </div>
    </div>,
  );
}