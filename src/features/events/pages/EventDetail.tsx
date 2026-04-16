import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, type MetaFunction } from "react-router";
import { format, isSameDay, parseISO } from "date-fns";
import { enGB } from "date-fns/locale";
import { ExternalLink, MapPin, Pencil, BadgeCheck, Check, Bookmark } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { MetaHead } from "@/components/common/MetaHead";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEvent } from "@/features/events/hooks/useEvent";
import type { EventCardDTO, EventDTO, EventOrganiser, EventsApiError } from "@/features/events/types";
import { getBuildingUrl, getEventUrl } from "@/utils/url";
import { cn } from "@/lib/utils";
import { RecommendDialog } from "@/components/common/RecommendDialog";
import { useEventAttendance } from "@/features/events/hooks/useEventAttendance";

export { eventDetailLoader as loader } from "./EventDetail.loader";

// Meta uses static defaults; dynamic updates are applied client-side via MetaHead once useEvent() resolves.
export const meta: MetaFunction = () => {
  const title = "Event | Plano";
  const description = "Discover and track architecture events on Plano.";
  const ogImage = "https://plano.app/og-default.jpg";

  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: ogImage },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImage },
  ];
};

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

function buildEventStructuredData(event: EventDTO): Record<string, unknown> {
  const firstBuilding = event.buildings[0] ?? null;
  const locationName = event.address ?? firstBuilding?.name ?? "Plano Event";
  const description = event.description?.trim() ?? "";

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: event.startAt,
    endDate: event.endAt ?? event.startAt,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: locationName,
      ...(firstBuilding?.city || firstBuilding
        ? {
            address: {
              "@type": "PostalAddress",
              ...(firstBuilding?.city ? { addressLocality: firstBuilding.city } : {}),
            },
          }
        : {}),
    },
    ...(description
      ? { description: description.length > 500 ? `${description.slice(0, 497)}...` : description }
      : {}),
    url: `https://plano.app${getEventUrl(event)}`,
    organizer: {
      "@type": "Organization",
      name: "Plano",
      url: "https://plano.app",
    },
  };
}

function EventDetailSkeleton() {
  return (
    <AppLayout title="Event" showBack>
      <div className="w-full">
        <Skeleton className="h-[clamp(260px,48vh,500px)] w-full rounded-none" />
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-4 py-8">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-12 w-3/4 max-w-lg" />
            <Skeleton className="h-5 w-full max-w-md" />
          </div>
          <Skeleton className="mb-8 h-24 w-full" />
        </div>
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
  const loginRedirectPath = query.data ? getEventUrl(query.data) : slug.trim() ? `/events/${slug}` : "/events";

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
        <div className="mx-auto max-w-4xl px-4 py-8">
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
        canonicalUrl={getEventUrl(event)}
        structuredData={buildEventStructuredData(event)}
      />
      <article className="pb-12">

        {/* ── HERO — full-bleed ── */}
        {showCover ? (
          <div className="relative w-full overflow-hidden bg-surface-muted">
            <img
              src={event.coverImageUrl!}
              alt=""
              className="h-[clamp(260px,48vh,500px)] w-full object-cover animate-in fade-in duration-700"
              onError={() => setCoverFailed(true)}
            />
          </div>
        ) : null}

        <div className="px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">

            {/* ── IDENTITY ── */}
            <div className="space-y-3 py-8">
              <span className="block text-2xs font-medium uppercase tracking-widest text-text-secondary">
                Event{event.address ? ` · ${event.address.split(",").pop()?.trim() ?? ""}` : ""}
              </span>

              <div className="flex flex-wrap items-start justify-between gap-3">
                <h1 className="text-4xl font-bold leading-tight tracking-tight text-text-primary md:text-5xl">
                  {event.title}
                </h1>
                {canEdit ? (
                  <Link
                    to={`/events/${event.slug}/edit`}
                    className="mt-2 inline-flex shrink-0 items-center gap-1 text-xs font-medium uppercase tracking-widest text-text-secondary transition-colors hover:text-text-primary"
                  >
                    <Pencil className="h-3 w-3" aria-hidden />
                    Edit
                  </Link>
                ) : null}
              </div>

              {/* Date · Location */}
              <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
                <span>{formatEventWhenRange(event.startAt, event.endAt)}</span>
                {event.address ? (
                  <>
                    <span className="text-text-disabled">·</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {event.address}
                    </span>
                  </>
                ) : null}
              </div>
            </div>

            {/* ── RSVP + ACTIONS ── */}
            <div className="border-b border-border-default pb-6">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {user ? (
                  <>
                    <span className="text-2xs font-medium uppercase tracking-widest text-text-disabled">RSVP</span>
                    <button
                      type="button"
                      disabled={attendance.isLoading || attendance.isSaving}
                      onClick={async () => {
                        try {
                          await attendance.setAttendance(attendance.status === "going" ? null : "going");
                        } catch {
                          toast({ variant: "destructive", description: "Could not update RSVP." });
                        }
                      }}
                      className={cn(
                        "inline-flex items-center gap-1 text-xs font-medium uppercase tracking-widest transition-colors disabled:opacity-50",
                        attendance.status === "going"
                          ? "text-text-primary"
                          : "text-text-secondary hover:text-text-primary",
                      )}
                    >
                      {attendance.status === "going" ? (
                        <Check className="h-3 w-3 stroke-[2.5px]" aria-hidden />
                      ) : null}
                      Going →
                    </button>
                    <button
                      type="button"
                      disabled={attendance.isLoading || attendance.isSaving}
                      onClick={async () => {
                        try {
                          await attendance.setAttendance(attendance.status === "interested" ? null : "interested");
                        } catch {
                          toast({ variant: "destructive", description: "Could not update RSVP." });
                        }
                      }}
                      className={cn(
                        "inline-flex items-center gap-1 text-xs font-medium uppercase tracking-widest transition-colors disabled:opacity-50",
                        attendance.status === "interested"
                          ? "text-text-primary"
                          : "text-text-secondary hover:text-text-primary",
                      )}
                    >
                      {attendance.status === "interested" ? (
                        <Bookmark className="h-3 w-3 fill-current" aria-hidden />
                      ) : null}
                      Interested →
                    </button>
                  </>
                ) : (
                  <Link
                    to={`/login?redirect=${encodeURIComponent(loginRedirectPath)}`}
                    className="text-xs font-medium uppercase tracking-widest text-text-secondary transition-colors hover:text-text-primary"
                  >
                    Log in to RSVP →
                  </Link>
                )}

                {eventCard ? (
                  <RecommendDialog mode="event" event={eventCard} open={recommendOpen} onOpenChange={setRecommendOpen} />
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    if (user) {
                      setRecommendOpen(true);
                    } else {
                      navigate(`/login?redirect=${encodeURIComponent(loginRedirectPath)}`);
                    }
                  }}
                  className="text-xs font-medium uppercase tracking-widest text-text-secondary transition-colors hover:text-text-primary"
                >
                  Recommend →
                </button>
              </div>
            </div>

            {/* ── DESCRIPTION ── */}
            {description ? (
              <section aria-label="About" className="border-b border-border-default py-8">
                <h2 className="mb-4 text-2xs font-medium uppercase tracking-widest text-text-secondary">About</h2>
                <p className="whitespace-pre-wrap text-base leading-relaxed text-text-primary">{descriptionShown}</p>
                {descLong ? (
                  <button
                    type="button"
                    onClick={() => setDescExpanded((v) => !v)}
                    className="mt-4 text-xs font-medium uppercase tracking-widest text-text-primary transition-colors hover:text-brand-primary"
                  >
                    {descExpanded ? "Show less" : "Read more →"}
                  </button>
                ) : null}
              </section>
            ) : null}

            {/* ── ORGANISER ── */}
            <section aria-label="Organiser" className="border-b border-border-default py-8">
              <h2 className="mb-4 text-2xs font-medium uppercase tracking-widest text-text-secondary">Organiser</h2>
              {event.claimStatus === "unclaimed" && !event.organiser ? (
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 rounded-full border border-border-default">
                    {event.submittedBy.avatarUrl ? (
                      <AvatarImage src={event.submittedBy.avatarUrl} alt="" />
                    ) : null}
                    <AvatarFallback className="text-sm">{initials(event.submittedBy.username)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm text-text-secondary">
                      Shared by{" "}
                      {event.submittedBy.username ? (
                        <span className="font-medium text-text-primary">@{event.submittedBy.username}</span>
                      ) : (
                        <span className="font-medium text-text-primary">a community member</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-text-disabled">Claim this event →</p>
                  </div>
                </div>
              ) : event.organiser ? (
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 rounded-full border border-border-default">
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
                        <BadgeCheck className="h-4 w-4 shrink-0 text-text-primary" aria-label="Verified" />
                      ) : null}
                    </div>
                    {event.isSelfHosted && event.claimStatus === "claimed" ? (
                      <p className="mt-0.5 text-2xs font-medium uppercase tracking-widest text-text-disabled">Host</p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 rounded-full border border-border-default">
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
                      <span className="font-medium text-text-primary">a community member</span>
                    )}
                  </p>
                </div>
              )}
            </section>

            {/* ── RELATED BUILDINGS ── */}
            {event.buildings.length > 0 ? (
              <section aria-label="Related buildings" className="border-b border-border-default py-8">
                <h2 className="mb-4 text-2xs font-medium uppercase tracking-widest text-text-secondary">Buildings</h2>
                <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {event.buildings.map((b) => (
                    <Link
                      key={b.buildingId}
                      // Locality URL not available: EventBuilding does not include locality_country_code/city_slug — requires event buildings query to join localities table
                      to={getBuildingUrl(b.buildingId, b.slug, null)}
                      className="flex w-36 shrink-0 flex-col gap-2 border border-border-default bg-surface-card p-2 transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                    >
                      <div className="aspect-card-compact w-full overflow-hidden bg-surface-muted">
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

            {/* ── EXTERNAL LINK ── */}
            {event.externalLink ? (
              <div className="py-8">
                <a
                  href={event.externalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-text-primary transition-colors hover:text-brand-primary"
                >
                  Get tickets / Register
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              </div>
            ) : null}

          </div>
        </div>
      </article>
    </AppLayout>
  );
}
