/**
 * YourContacts.tsx — Redesigned with A24 editorial aesthetic
 *
 * Changes:
 *  - Section label: the `.eyebrow` utility at `tracking-widest` (no Users icon)
 *  - Shadcn <Tabs> replaced with a custom metric tab strip identical to the
 *    Profile.tsx pattern: large bold count above a tiny uppercase label,
 *    border-b-2 active indicator, no filled pill background (kit `.metric-tab`)
 *  - Switched from Tabs defaultValue to useState for active tab control
 *  - bg-surface-card border rounded-xl container removed from both tab panels —
 *    UserRows flow directly on the page surface with border-b dividers
 *  - ScrollArea retained for overflow but without a containing box
 *  - Loading: minimal spinner, no card layout
 *  - Empty states: the shared `EmptyState` primitive (eyebrow + sentence), no
 *    centred card
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { UserRow } from "./UserRow";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/empty-state";
import { Loader2 } from "lucide-react";

interface ContactUser {
  id: string;
  username: string | null;
  avatar_url: string | null;
  is_close_friend?: boolean;
}

export function YourContacts() {
  const { user } = useAuth();
  const [following, setFollowing] = useState<ContactUser[]>([]);
  const [followers, setFollowers] = useState<ContactUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"following" | "followers">("following");

  const sortContacts = (contacts: ContactUser[]) => {
    return [...contacts].sort((a, b) => {
      if (a.is_close_friend === b.is_close_friend) {
        return (a.username || "").localeCompare(b.username || "");
      }
      return a.is_close_friend ? -1 : 1;
    });
  };

  const toggleCloseFriend = async (targetId: string, currentStatus: boolean) => {
    if (!user) return;
    setFollowing((prev) => {
      const updated = prev.map((u) =>
        u.id === targetId ? { ...u, is_close_friend: !currentStatus } : u
      );
      return sortContacts(updated);
    });
    try {
      const { error } = await supabase
        .from("follows")
        .update({ is_close_friend: !currentStatus })
        .eq("follower_id", user.id)
        .eq("following_id", targetId);
      if (error) throw error;
    } catch (_error) {
      setFollowing((prev) => {
        const updated = prev.map((u) =>
          u.id === targetId ? { ...u, is_close_friend: currentStatus } : u
        );
        return sortContacts(updated);
      });
    }
  };

  useEffect(() => {
    const fetchContacts = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data: followingRefs } = await supabase
          .from("follows")
          .select("following_id, is_close_friend")
          .eq("follower_id", user.id);

        const refs = (followingRefs ?? []) as {
          following_id: string;
          is_close_friend: boolean | null;
        }[];
        const followingMap = new Map<string, boolean>();
        refs.forEach((r) => {
          followingMap.set(r.following_id, Boolean(r.is_close_friend));
        });

        const followingIds = refs.map((r) => r.following_id);

        if (followingIds.length > 0) {
          const { data: followingProfiles } = await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .in("id", followingIds);

          const mergedFollowing =
            followingProfiles?.map((p) => ({
              ...p,
              is_close_friend: followingMap.get(p.id) || false,
            })) || [];

          setFollowing(sortContacts(mergedFollowing));
        } else {
          setFollowing([]);
        }

        const { data: followerRefs } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("following_id", user.id);

        const followerIds = followerRefs?.map(r => r.follower_id) || [];

        if (followerIds.length > 0) {
          const { data: followerProfiles } = await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .in("id", followerIds);
          setFollowers(followerProfiles || []);
        } else {
          setFollowers([]);
        }
      } catch (err) {
        void err;
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [user]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-text-disabled" />
      </div>
    );
  }

  // ── Tab config — mirrors Profile.tsx metric tab pattern ──
  const tabs: { key: "following" | "followers"; label: string; count: number }[] = [
    { key: "following", label: "Following", count: following.length },
    { key: "followers", label: "Followers", count: followers.length },
  ];

  return (
    <div>
      {/* Section label */}
      <p className="eyebrow tracking-widest mb-6">Your contacts</p>

      {/* ── Metric tab strip — same pattern as Profile.tsx ── */}
      <div className="flex border-b border-border-default mb-0">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 border-b-2 -mb-px transition-colors text-left shrink-0 ${
                isActive
                  ? "border-text-primary"
                  : "border-transparent hover:border-border-default"
              }`}
            >
              <div
                className={`text-xl font-bold tracking-tight leading-none ${
                  isActive ? "text-text-primary" : "text-text-disabled"
                }`}
              >
                {tab.count.toLocaleString()}
              </div>
              <div
                className={`text-2xs font-medium tracking-widest uppercase mt-1.5 ${
                  isActive ? "text-text-secondary" : "text-text-disabled"
                }`}
              >
                {tab.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Following tab ── */}
      {activeTab === "following" && (
        <ScrollArea className="h-[320px] sm:h-[420px]">
          {following.length > 0 ? (
            <div>
              {following.map(u => (
                <div
                  key={u.id}
                  className="border-b border-border-default last:border-0"
                >
                  <UserRow
                    user={u}
                    showFollowButton={false}
                    isCloseFriend={u.is_close_friend}
                    onToggleCloseFriend={() => toggleCloseFriend(u.id, !!u.is_close_friend)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              eyebrow="No one yet"
              message="You are not following anyone yet."
            />
          )}
        </ScrollArea>
      )}

      {/* ── Followers tab ── */}
      {activeTab === "followers" && (
        <ScrollArea className="h-[320px] sm:h-[420px]">
          {followers.length > 0 ? (
            <div>
              {followers.map(u => (
                <div
                  key={u.id}
                  className="border-b border-border-default last:border-0"
                >
                  <UserRow
                    user={u}
                    showFollowButton={true}
                    isFollower={true}
                  />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState eyebrow="No followers" message="No followers yet." />
          )}
        </ScrollArea>
      )}
    </div>
  );
}