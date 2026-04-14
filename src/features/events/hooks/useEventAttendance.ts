import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { eventKeys } from "@/features/events/queryKeys";

const attendanceClient = supabase as unknown as SupabaseClient;

export type EventAttendanceStatus = "going" | "interested" | null;

export function useEventAttendance(eventId: string | undefined, eventSlug: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: eventKeys.attendance(user?.id, eventId ?? ""),
    queryFn: async () => {
      if (!user || !eventId) return null;
      const { data, error } = await attendanceClient
        .from("event_attendances")
        .select("id, status")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      const row = data as { id: string; status: "going" | "interested" } | null;
      return row?.status ?? null;
    },
    enabled: Boolean(user && eventId),
    staleTime: 0,
  });

  const mutation = useMutation({
    mutationFn: async (next: EventAttendanceStatus) => {
      if (!user || !eventId) return;
      if (next === null) {
        const { error } = await attendanceClient
          .from("event_attendances")
          .delete()
          .eq("event_id", eventId)
          .eq("user_id", user.id);
        if (error) throw error;
        return;
      }
      const { data: existing, error: findErr } = await attendanceClient
        .from("event_attendances")
        .select("id")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (findErr) throw findErr;
      if (existing?.id) {
        const { error: upErr } = await attendanceClient
          .from("event_attendances")
          .update({ status: next })
          .eq("id", existing.id as string);
        if (upErr) throw upErr;
      } else {
        const { error: insErr } = await attendanceClient.from("event_attendances").insert({
          event_id: eventId,
          user_id: user.id,
          status: next,
        });
        if (insErr) throw insErr;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: eventKeys.attendance(user?.id, eventId ?? "") });
      if (eventSlug) await queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventSlug) });
      if (user?.id) {
        await queryClient.invalidateQueries({ queryKey: eventKeys.profile(user.id, "attending") });
        await queryClient.invalidateQueries({ queryKey: eventKeys.profile(user.id, "interested") });
        await queryClient.invalidateQueries({ queryKey: ["feed-event-attendance", user.id] });
      }
    },
  });

  return {
    status: query.data ?? null,
    isLoading: query.isPending,
    setAttendance: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}
