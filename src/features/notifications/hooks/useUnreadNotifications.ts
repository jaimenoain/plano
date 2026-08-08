import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth";

const STALE_TIME = 30 * 1000;

export const notificationKeys = {
  all: ["notifications"] as const,
  unreadCount: (userId: string | undefined) =>
    [...notificationKeys.all, "unread-count", userId] as const,
};

export function unreadNotificationsQueryKey(userId: string | undefined) {
  return notificationKeys.unreadCount(userId);
}

async function fetchUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) throw error;
  return count ?? 0;
}

/**
 * Single source of truth for the bell's unread count. Shared across every nav
 * surface via the query cache — mounting AppTopNav + MobileTopBar together no
 * longer fires duplicate queries. Refreshes on window focus, on a 30s
 * staleTime, and live via a postgres_changes subscription so a notification
 * arriving while the user sits on a page still lights the bell.
 */
export function useUnreadNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = notificationKeys.unreadCount(user?.id);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchUnreadCount(user!.id),
    enabled: !!user,
    staleTime: STALE_TIME,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications_unread_${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => {
          void queryClient.invalidateQueries({ queryKey });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, queryKey]);

  const count = query.data ?? 0;
  return { count, hasUnread: count > 0, isLoading: query.isLoading, error: query.error };
}
