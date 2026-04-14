import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getClaimedPersonSummaryForProfile } from "@/features/credits/api/people";
import { useClaimedPersonForNav } from "@/features/credits/hooks/useClaimedPersonForNav";
import { useStewardCompaniesForNav } from "@/features/credits/hooks/useStewardCompaniesForNav";
import { eventKeys } from "@/features/events/queryKeys";
import {
  fetchProfileAttendanceEventCards,
  fetchProfileOrganisingEventCards,
  fetchProfilePastAttendanceCount,
} from "@/features/events/api/profileEventsApi";

export function useOrganisingEvents(userId: string) {
  const { user, loading: authLoading } = useAuth();
  const isSelf = Boolean(user?.id && user.id === userId);

  const navClaimed = useClaimedPersonForNav();
  const navStewards = useStewardCompaniesForNav();

  const otherClaimed = useQuery({
    queryKey: ["profileEventsClaimedPerson", userId],
    queryFn: () => getClaimedPersonSummaryForProfile(userId),
    enabled: Boolean(userId) && !isSelf,
    staleTime: 60_000,
  });

  const personIds =
    isSelf && navClaimed.data?.id
      ? [navClaimed.data.id]
      : !isSelf && otherClaimed.data?.id
        ? [otherClaimed.data.id]
        : [];

  const companyIds = isSelf ? (navStewards.data ?? []).map((c) => c.companyId) : [];

  const scopeKey = `${personIds.join(",")}|${companyIds.join(",")}`;
  const prereqsReady = isSelf
    ? !authLoading && !navClaimed.isPending && !navStewards.isPending
    : !otherClaimed.isPending;

  return useQuery({
    queryKey: [...eventKeys.profile(userId, "organising"), scopeKey],
    queryFn: () => fetchProfileOrganisingEventCards({ userId, personIds, companyIds }),
    enabled: Boolean(userId) && prereqsReady,
    staleTime: 60_000,
  });
}

export function useAttendingEvents(userId: string) {
  return useQuery({
    queryKey: eventKeys.profile(userId, "attending"),
    queryFn: () =>
      fetchProfileAttendanceEventCards({
        userId,
        status: "going",
        time: "upcoming",
      }),
    enabled: Boolean(userId),
    staleTime: 0,
  });
}

export function useInterestedEvents(userId: string) {
  return useQuery({
    queryKey: eventKeys.profile(userId, "interested"),
    queryFn: () =>
      fetchProfileAttendanceEventCards({
        userId,
        status: "interested",
        time: "upcoming",
      }),
    enabled: Boolean(userId),
    staleTime: 0,
  });
}

export function useProfileEventsCountBadges(userId: string) {
  const organising = useOrganisingEvents(userId);
  const attending = useAttendingEvents(userId);
  const interested = useInterestedEvents(userId);

  return {
    organisingCount: organising.data?.length ?? 0,
    attendingCount: attending.data?.length ?? 0,
    interestedCount: interested.data?.length ?? 0,
  };
}

export function usePastAttendanceCount(userId: string, status: "going" | "interested", enabled: boolean) {
  return useQuery({
    queryKey: eventKeys.profilePastCount(userId, status),
    queryFn: () => fetchProfilePastAttendanceCount({ userId, status }),
    enabled: Boolean(userId) && enabled,
    staleTime: 60_000,
  });
}

export function usePastAttendanceEvents(userId: string, status: "going" | "interested", enabled: boolean) {
  return useQuery({
    queryKey: eventKeys.profilePast(userId, status),
    queryFn: () =>
      fetchProfileAttendanceEventCards({
        userId,
        status,
        time: "past",
      }),
    enabled: Boolean(userId) && enabled,
    staleTime: 0,
  });
}
