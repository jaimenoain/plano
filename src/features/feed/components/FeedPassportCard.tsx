import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUserProfile } from "@/features/profile/hooks/useUserProfile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type PassportStats = {
  visited: number;
  saved: number;
  followers: number;
};

async function fetchPassportStats(userId: string): Promise<PassportStats> {
  const [visitedResult, savedResult, followersResult] = await Promise.all([
    supabase
      .from("user_buildings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "visited"),
    supabase
      .from("user_buildings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "pending"),
    supabase
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("following_id", userId),
  ]);

  return {
    visited: visitedResult.count ?? 0,
    saved: savedResult.count ?? 0,
    followers: followersResult.count ?? 0,
  };
}

/**
 * Top module of the feed sidebar — the logged-in user's identity + a few headline stats.
 * No `border-t`: nothing sits above it.
 */
export function FeedPassportCard() {
  const { user } = useAuth();
  const { profile } = useUserProfile();

  const { data: stats } = useQuery({
    queryKey: ["feed-sidebar", "passport", user?.id],
    queryFn: () => fetchPassportStats(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  if (!user) return null;

  const username = profile?.username ?? null;
  const avatarUrl = profile?.avatar_url
    ? profile.avatar_url.startsWith("http")
      ? profile.avatar_url
      : supabase.storage.from("avatars").getPublicUrl(profile.avatar_url).data
          .publicUrl
    : undefined;

  const items: Array<{ label: string; value: number }> = [
    { label: "Visited", value: stats?.visited ?? 0 },
    { label: "Saved", value: stats?.saved ?? 0 },
    { label: "Followers", value: stats?.followers ?? 0 },
  ];

  return (
    <section className="pb-1">
      <Link to="/profile" className="group flex items-center gap-3">
        <Avatar className="h-11 w-11 shrink-0 border border-border-default">
          <AvatarImage src={avatarUrl} className="object-cover" />
          <AvatarFallback className="bg-surface-muted text-sm">
            {username?.charAt(0).toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-text-primary">
            {username ?? "Your profile"}
          </div>
          <div className="mt-0.5 text-[11px] text-text-secondary transition-colors group-hover:text-text-primary">
            View your profile
          </div>
        </div>
      </Link>

      <dl className="mt-4 grid grid-cols-3 border-t border-border-default pt-4 text-center">
        {items.map((item) => (
          <div key={item.label}>
            <dt className="text-lg font-semibold tabular-nums leading-none text-text-primary">
              {item.value}
            </dt>
            <dd className="mt-1 text-[10px] uppercase tracking-[0.12em] text-text-disabled">
              {item.label}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
