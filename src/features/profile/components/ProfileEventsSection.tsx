import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { EventProfileCard, EventProfileCardSkeleton } from "@/features/events/components/EventProfileCard";
import {
  useAttendingEvents,
  useInterestedEvents,
  useOrganisingEvents,
  usePastAttendanceCount,
  usePastAttendanceEvents,
} from "@/features/events/hooks/useProfileEvents";

type EventsSegment = "organising" | "attending" | "interested";

export function ProfileEventsSection({
  profileUserId,
  viewingUserId,
  isOwnProfile,
}: {
  profileUserId: string;
  viewingUserId: string | null;
  isOwnProfile: boolean;
}) {
  const organising = useOrganisingEvents(profileUserId);
  const attending = useAttendingEvents(profileUserId);
  const interested = useInterestedEvents(profileUserId);

  const organisingCount = organising.data?.length ?? 0;
  const attendingCount = attending.data?.length ?? 0;
  const interestedCount = interested.data?.length ?? 0;

  const showSection = organisingCount + attendingCount + interestedCount > 0;

  const derivedDefault = useMemo<EventsSegment>(() => {
    if (organisingCount > 0) return "organising";
    if (attendingCount > 0) return "attending";
    return "interested";
  }, [organisingCount, attendingCount, interestedCount]);

  const [segmentOverride, setSegmentOverride] = useState<EventsSegment | null>(null);

  useEffect(() => {
    setSegmentOverride(null);
  }, [profileUserId]);

  const segment = segmentOverride ?? derivedDefault;

  const pastGoingCountQ = usePastAttendanceCount(profileUserId, "going", isOwnProfile && showSection);
  const pastInterestedCountQ = usePastAttendanceCount(profileUserId, "interested", isOwnProfile && showSection);

  const [pastAccordion, setPastAccordion] = useState<string | undefined>(undefined);

  useEffect(() => {
    setPastAccordion(undefined);
  }, [segment, profileUserId]);

  const pastOpen = pastAccordion === "past";
  const pastGoingList = usePastAttendanceEvents(
    profileUserId,
    "going",
    isOwnProfile && pastOpen && segment === "attending",
  );
  const pastInterestedList = usePastAttendanceEvents(
    profileUserId,
    "interested",
    isOwnProfile && pastOpen && segment === "interested",
  );

  const options = useMemo(
    () => [
      {
        value: "organising",
        label: (
          <span className="flex items-center justify-center gap-1">
            <span>Organising</span>
            <span className="text-2xs font-semibold text-text-disabled tabular-nums">{organisingCount}</span>
          </span>
        ),
      },
      {
        value: "attending",
        label: (
          <span className="flex items-center justify-center gap-1">
            <span>Attending</span>
            <span className="text-2xs font-semibold text-text-disabled tabular-nums">{attendingCount}</span>
          </span>
        ),
      },
      {
        value: "interested",
        label: (
          <span className="flex items-center justify-center gap-1">
            <span>Interested</span>
            <span className="text-2xs font-semibold text-text-disabled tabular-nums">{interestedCount}</span>
          </span>
        ),
      },
    ],
    [organisingCount, attendingCount, interestedCount],
  );

  if (!showSection) return null;

  const activeQuery = segment === "organising" ? organising : segment === "attending" ? attending : interested;
  const loading = activeQuery.isPending;
  const list = activeQuery.data ?? [];

  const pastCount =
    segment === "attending" ? (pastGoingCountQ.data ?? 0) : segment === "interested" ? (pastInterestedCountQ.data ?? 0) : 0;

  const pastQuery = segment === "attending" ? pastGoingList : pastInterestedList;
  const pastList = segment === "organising" ? [] : (pastQuery.data ?? []);
  const pastLoading = segment !== "organising" && pastQuery.isPending;

  return (
    <section className="mt-12 border-t border-border-default pt-10" aria-label="Events">
      <p className="mb-6 text-2xs font-medium uppercase tracking-widest text-text-disabled">Events</p>
      <SegmentedControl
        name="profile-events"
        className="mb-8 max-w-xl"
        options={options}
        value={segment}
        onValueChange={(v) => setSegmentOverride(v as EventsSegment)}
      />
      {loading ? (
        <div className="divide-y divide-border-default">
          <EventProfileCardSkeleton />
          <EventProfileCardSkeleton />
        </div>
      ) : list.length === 0 ? (
        <p className="text-sm text-text-secondary">Nothing here yet</p>
      ) : (
        <div className="divide-y divide-border-default">
          {list.map((ev) => (
            <EventProfileCard
              key={ev.id}
              event={ev}
              profileUserId={profileUserId}
              viewingUserId={viewingUserId}
              isOwnProfile={isOwnProfile}
              attendanceChip={
                isOwnProfile ? (segment === "attending" ? "going" : segment === "interested" ? "interested" : null) : null
              }
            />
          ))}
        </div>
      )}

      {isOwnProfile && (segment === "attending" || segment === "interested") && pastCount > 0 ? (
        <Accordion type="single" collapsible value={pastAccordion} onValueChange={setPastAccordion} className="mt-6">
          <AccordionItem value="past" className="border-border-default">
            <AccordionTrigger className="py-3 text-xs font-medium uppercase tracking-widest text-text-secondary hover:no-underline">
              Past events ({pastCount})
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              {pastLoading ? (
                <div className="divide-y divide-border-default">
                  <EventProfileCardSkeleton />
                  <EventProfileCardSkeleton />
                </div>
              ) : pastList.length === 0 ? (
                <p className="text-sm text-text-secondary">Nothing here yet</p>
              ) : (
                <div className="divide-y divide-border-default">
                  {pastList.map((ev) => (
                    <EventProfileCard
                      key={ev.id}
                      event={ev}
                      profileUserId={profileUserId}
                      viewingUserId={viewingUserId}
                      isOwnProfile={isOwnProfile}
                      attendanceChip={segment === "attending" ? "going" : "interested"}
                    />
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : null}
    </section>
  );
}
