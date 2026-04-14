import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { format, isSameDay, parseISO } from "date-fns";
import { enGB } from "date-fns/locale";
import { ExternalLink, MapPin, Pencil, BadgeCheck } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { MetaHead } from "@/components/common/MetaHead";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEvent } from "@/features/events/hooks/useEvent";
import type { EventCardDTO, EventDTO, EventOrganiser, EventsApiError } from "@/features/events/types";
import { getBuildingUrl } from "@/utils/url";
import { cn } from "@/lib/utils";
import { RecommendDialog } from "@/components/common/RecommendDialog";
import { useEventAttendance } from "@/features/events/hooks/useEventAttendance";

function isEventsApiError(e: unknown): e is EventsApiError {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    "message" in e &&
    typeof (e as EventsApiError).code === "string" &&
    typeof (e as EventsApiError).message === "string"
  );
}

function initials(name: string | null | undefined): string {
  const n = (name ?? "").trim();
  if (!n) return "?";
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatEventWhenRange(startAt: string, endAt: string | null): string {
  const start = parseISO(startAt);
  const end = endAt ? parseISO(endAt) : null;
  const datePart = format(start, "EEEE d MMMM yyyy", { locale: enGB });
  if (!end || isSameDay(start, end)) {
    const startT = format(start, "HH:mm", { locale: enGB });
    if (!end) return `${datePart}, ${startT}`;
    const endT = format(end, "HH:mm", { locale: enGB });
    return `${datePart}, ${startT}–${endT}`;
  }
  return `${format(start, "EEEE d MMMM yyyy, HH:mm", { locale: enGB })} – ${format(end, "EEEE d MMMM yyyy, HH:mm", { locale: enGB })}`;
}

function organiserNameLink(org: EventOrganiser): { href: string; label: string } | null {
  const label = org.displayName?.trim() || "Organiser";
  if (org.kind === "person" && org.slug) return { href: `/person/${org.slug}`, label };
  if (org.kind === "company" && org.slug) return { href: `/company/${org.slug}`, label };
  if (org.kind === "user" && org.displayName) return { href: `/profile/${org.displayName}`, label };
  return null;
}

function eventDtoToCardDto(dto: EventDTO): EventCardDTO {
  const { buildings, description, ...rest } = dto;
  void buildings;
  if (description == null) {
    return { ...rest, description: null };
  }
  const truncated = description.length > 160 ? `${description.slice(0, 157)}...` : description;
  return { ...rest, description: truncated };
}

function metaDescription(event: EventDTO): string {
  const raw = event.description?.trim() ?? "";
  if (raw.length <= 160) return raw || `${event.title} on Plano.`;
  return `${raw.slice(0, 157)}...`;
}

function EventDetailSkeleton() {
  return (
    <AppLayout title="Event" showBack>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <Skeleton className="mb-6 h-[260px] w-full rounded-sm" />
        <Skeleton className="mb-4 h-10 w-3/4 max-w-lg" />
        <Skeleton className="mb-2 h-5 w-full max-w-md" />
        <Skeleton className="mb-8 h-5 w-2/3 max-w-sm" />
        <Skeleton className="mb-4 h-24 w-full" />
      </div>
    </AppLayout>
  );
}

function NotFoundState({ slug }: { slug: string | undefined }) {
  return (
    <AppLayout title="Event" showBack>
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-8 text-center">
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-text-primary">Event not found</h1>
        <p className="mb-6 max-w-md text-sm leading-relaxed text-text-secondary md:text-base">
          We couldn&apos;t find this event
          {slug ? (
            <>
              {" "}
              <span className="font-mono text-text-primary">({slug})</span>
            </>
          ) : null}
          . The link may be wrong or the event was removed.
        </p>
        <Button asChild size="lg" variant="default" className="min-w-[200px]">
          <Link to="/events">Browse events</Link>
        </Button>
      </div>
    </AppLayout>
  );
}

export default function EventDetail() {
  const { slug: slugParam } = useParams();
  const slug = slugParam ?? "";
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const query = useEvent(slug);
  const attendance = useEventAttendance(query.data?.id, query.data?.slug);
  const [coverFailed, setCoverFailed] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [recommendOpen, setRecommendOpen] = useState(false);

  const eventCard = useMemo(
    () => (query.data ? eventDtoToCardDto(query.data) : null),
    [query.data],
  );
  const loginRedirectPath = query.data ? `/events/${query.data.slug}` : slug.trim() ? `/events/${slug}` : "/events";

  if (!slug.trim()) {
    return <NotFoundState slug={slugParam} />;
  }

  if (query.isPending) {
    return <EventDetailSkeleton />;
  }

  if (query.isError && isEventsApiError(query.error) && query.error.code === "not_found") {
    return <NotFoundState slug={slugParam} />;
  }

  if (query.isError || !query.data) {
    return (
      <AppLayout title="Event" showBack>
        <div className="mx-auto max-w-3xl px-4 py-8">
          <p className="text-sm text-destructive" role="alert">
            {isEventsApiError(query.error) ? query.error.message : "This event could not be loaded."}
          </p>
        </div>
      </AppLayout>
    );
  }

  const event = query.data;
  const showCover = Boolean(event.coverImageUrl) && !coverFailed;
  const description = event.description?.trim() ?? "";
  const descLong = description.length > 300;
  const descriptionShown =
    !descLong || descExpanded ? description : `${description.slice(0, 300).trimEnd()}…`;

  const canEdit = Boolean(user?.id && user.id === event.submittedBy.userId);
  const organiserLink = event.organiser ? organiserNameLink(event.organiser) : null;

  return (
    <AppLayout title={event.title} showBack>
      <MetaHead
        documentTitle={`${event.title} · Plano`}
        description={metaDescription(event)}
        canonicalUrl={`/events/${event.slug}`}
      />
      <article className="mx-auto max-w-3xl pb-12">
        <div className="relative h-[260px] w-full overflow-hidden bg-surface-muted">
          {showCover ? (
            <img
              src={event.coverImageUrl!}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setCoverFailed(true)}
            />
          ) : null}
        </div>

        <div className="space-y-6 px-4 pt-6 sm:px-6 lg:px-8">
          <header className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="font-display text-3xl font-black tracking-tight text-text-primary">{event.title}</h1>
              {canEdit ? (
                <Button asChild variant="outline" size="sm" className="shrink-0 gap-1.5">
                  <Link to={`/events/${event.slug}/edit`}>
                    <Pencil className="h-4 w-4" aria-hidden />
                    Edit
                  </Link>
                </Button>
              ) : null}
            </div>
            <p className="text-sm text-text-secondary">{formatEventWhenRange(event.startAt, event.endAt)}</p>
            {event.address ? (
              <p className="flex items-start gap-2 text-sm text-text-secondary">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
                <span>{event.address}</span>
              </p>
            ) : null}
          </header>

          <section aria-label="RSVP" className="flex flex-wrap items-center gap-2">
            {user ? (
              <>
                <span className="text-2xs font-medium uppercase tracking-widest text-text-secondary">RSVP</span>
                <Button
                  type="button"
                  size="sm"
                  variant={attendance.status === "going" ? "default" : "outline"}
                  disabled={attendance.isLoading || attendance.isSaving}
                  onClick={async () => {
                    try {
                      await attendance.setAttendance(attendance.status === "going" ? null : "going");
                    } catch {
                      toast({ variant: "destructive", description: "Could not update RSVP." });
                    }
                  }}
                >
                  Going
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={attendance.status === "interested" ? "default" : "outline"}
                  disabled={attendance.isLoading || attendance.isSaving}
                  onClick={async () => {
                    try {
                      await attendance.setAttendance(attendance.status === "interested" ? null : "interested");
                    } catch {
                      toast({ variant: "destructive", description: "Could not update RSVP." });
                    }
                  }}
                >
                  Interested
                </Button>
              </>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link to={`/login?redirect=${encodeURIComponent(loginRedirectPath)}`}>Log in to RSVP</Link>
              </Button>
            )}
          </section>

          <section aria-label="Recommend this event" className="flex flex-wrap items-center gap-3">
            {eventCard ? (
              <RecommendDialog mode="event" event={eventCard} open={recommendOpen} onOpenChange={setRecommendOpen} />
            ) : null}
            {user ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setRecommendOpen(true)}>
                Recommend
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate(`/login?redirect=${encodeURIComponent(loginRedirectPath)}`)}
              >
                Recommend
              </Button>
            )}
          </section>

          <section aria-label="Organiser" className="border-t border-border-default pt-6">
            {event.claimStatus === "unclaimed" && !event.organiser ? (
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  {event.submittedBy.avatarUrl ? (
                    <AvatarImage src={event.submittedBy.avatarUrl} alt="" />
                  ) : null}
                  <AvatarFallback className="text-sm">{initials(event.submittedBy.username)}</AvatarFallback>
                </Avatar>
                <p className="text-sm text-text-secondary">
                  Shared by{" "}
                  {event.submittedBy.username ? (
                    <span className="text-text-primary">@{event.submittedBy.username}</span>
                  ) : (
                    <span className="text-text-primary">a community member</span>
                  )}{" "}
                  ·{" "}
                  <span className="cursor-default underline decoration-dotted opacity-80">Claim this event →</span>
                </p>
              </div>
            ) : event.organiser ? (
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  {event.organiser.avatarUrl ? (
                    <AvatarImage src={event.organiser.avatarUrl} alt="" />
                  ) : null}
                  <AvatarFallback className="text-sm">{initials(event.organiser.displayName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {organiserLink ? (
                      <Link
                        to={organiserLink.href}
                        className="font-medium text-text-primary underline-offset-4 hover:underline"
                      >
                        {organiserLink.label}
                      </Link>
                    ) : (
                      <span className="font-medium text-text-primary">
                        {event.organiser.displayName ?? "Organiser"}
                      </span>
                    )}
                    {event.organiser.isVerified ? (
                      <BadgeCheck className="h-5 w-5 shrink-0 text-brand-primary" aria-label="Verified" />
                    ) : null}
                  </div>
                  {event.isSelfHosted && event.claimStatus === "claimed" ? (
                    <p className="mt-1 text-xs text-text-secondary">Host</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  {event.submittedBy.avatarUrl ? (
                    <AvatarImage src={event.submittedBy.avatarUrl} alt="" />
                  ) : null}
                  <AvatarFallback className="text-sm">{initials(event.submittedBy.username)}</AvatarFallback>
                </Avatar>
                <p className="text-sm text-text-secondary">
                  Submitted by{" "}
                  {event.submittedBy.username ? (
                    <Link
                      to={`/profile/${event.submittedBy.username}`}
                      className="font-medium text-text-primary underline-offset-4 hover:underline"
                    >
                      @{event.submittedBy.username}
                    </Link>
                  ) : (
                    <span className="text-text-primary">a community member</span>
                  )}
                </p>
              </div>
            )}
          </section>

          {event.buildings.length > 0 ? (
            <section aria-label="Related buildings">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-secondary">Buildings</h2>
              <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {event.buildings.map((b) => (
                  <Link
                    key={b.buildingId}
                    to={getBuildingUrl(b.buildingId, b.slug, null)}
                    className="flex w-36 shrink-0 flex-col gap-2 rounded-sm border border-border-default bg-surface-card p-2 transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                  >
                    <div className="aspect-card-compact w-full overflow-hidden rounded-sm bg-surface-muted">
                      {b.mainImageUrl ? (
                        <img src={b.mainImageUrl} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <span className="line-clamp-2 text-xs font-medium text-text-primary">{b.name}</span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {description ? (
            <section aria-label="Description" className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">About</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">{descriptionShown}</p>
              {descLong ? (
                <button
                  type="button"
                  onClick={() => setDescExpanded((v) => !v)}
                  className={cn(
                    "text-sm font-medium text-brand-primary underline-offset-4 hover:underline",
                    descExpanded && "text-text-secondary",
                  )}
                >
                  {descExpanded ? "Show less" : "Read more"}
                </button>
              ) : null}
            </section>
          ) : null}

          {event.externalLink ? (
            <div>
              <Button asChild size="lg" className="gap-2">
                <a href={event.externalLink} target="_blank" rel="noopener noreferrer">
                  Get tickets / Register
                  <ExternalLink className="h-4 w-4" aria-hidden />
                </a>
              </Button>
            </div>
          ) : null}
        </div>
      </article>
    </AppLayout>
  );
}
