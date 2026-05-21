import { useState } from "react";
import { useLoaderData, Link, type MetaFunction } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Trophy, MapPin, Calendar, LayoutList, Shield, Settings } from "lucide-react";
import { awardLoader, type AwardLoaderData } from "./AwardPage.loader";
import { AwardLeaderboardDialog } from "../components/AwardLeaderboardDialog";
import { ClaimAwardDialog } from "../components/ClaimAwardDialog";
import { Button } from "@/components/ui/button";
import { useMyAwardClaimRequest, useIsAwardAdmin, useUpcomingEventsByAward } from "@/features/awards/hooks/useAwards";
import { getEditionDisplayLabel, editionEventTypeLabels } from "@/features/awards/types/awards";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export { awardLoader as loader } from "./AwardPage.loader";

export const meta: MetaFunction<typeof awardLoader> = ({ data }) => {
  if (!data) return [{ title: "Plano" }];
  const d = data as AwardLoaderData;
  return [
    { title: d.metaTitle },
    { name: "description", content: d.description },
    { property: "og:title", content: d.metaTitle },
    { property: "og:description", content: d.description },
    { property: "og:url", content: d.canonical },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { tagName: "link", rel: "canonical", href: d.canonical },
  ];
};

export default function AwardPage() {
  const { award, editions, admins } = useLoaderData() as AwardLoaderData;
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [claimOpen, setClaimOpen]             = useState(false);

  // Client-side auth checks (no SSR session in the loader).
  const { data: sessionUser } = useQuery({
    queryKey: ["session-user"],
    queryFn:  async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
    staleTime: 60_000,
  });
  const isLoggedIn = Boolean(sessionUser);

  const { data: myRequest }       = useMyAwardClaimRequest(award.id);
  const { data: isAwardAdmin }    = useIsAwardAdmin(award.id);
  const { data: upcomingEvents = [] } = useUpcomingEventsByAward(award.id);

  const ownerAdmin = admins.find((a) => a.role === "owner");

  const awardingBody = award.awardingBodyCompany ? (
    <Link 
      to={`/company/${award.awardingBodyCompany.slug}`}
      className="text-text-primary hover:underline"
    >
      {award.awardingBodyCompany.name}
    </Link>
  ) : award.awardingBodyName;

  return (
    <AppLayout showBack title={award.name} showHeader>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="border-b border-border-default pb-10">
          <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="p-2 bg-brand-primary/5 rounded-sm">
                    <Trophy className="w-8 h-8 text-brand-primary" />
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight text-text-primary md:text-5xl lg:text-6xl">
                    {award.name}
                  </h1>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-secondary">
                  {awardingBody && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">By</span>
                      {awardingBody}
                    </div>
                  )}
                  {award.country && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {award.country}
                    </div>
                  )}
                  <Badge variant="secondary" className="uppercase tracking-widest text-[10px] font-bold px-2 py-0.5 bg-surface-muted text-text-secondary border-none h-auto">
                    {award.frequency.replace('_', ' ')}
                  </Badge>

                  {/* Claimed / verified badge */}
                  {award.claimStatus !== "unclaimed" && (
                    <Badge
                      variant="secondary"
                      className="gap-1 uppercase tracking-widest text-[10px] font-bold px-2 py-0.5 bg-feedback-success/10 text-feedback-success border-none h-auto"
                    >
                      <Shield className="h-2.5 w-2.5" />
                      {award.claimStatus === "verified" ? "Verified" : "Official"}
                      {ownerAdmin?.profile?.username && ` · ${ownerAdmin.profile.username}`}
                    </Badge>
                  )}
                </div>

                {award.website && (
                  <a
                    href={award.website.startsWith('http') ? award.website : `https://${award.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-widest text-text-primary hover:underline"
                  >
                    Official Website
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs font-bold uppercase tracking-widest h-9"
                  onClick={() => setLeaderboardOpen(true)}
                >
                  <LayoutList className="h-4 w-4" />
                  View Leaderboard
                </Button>

                {/* Award admin portal link — only visible to the award's own admins. */}
                {isAwardAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-xs font-bold uppercase tracking-widest h-9"
                    asChild
                  >
                    <Link to={`/award/${award.slug}/admin`}>
                      <Settings className="h-4 w-4" />
                      Manage award
                    </Link>
                  </Button>
                )}

                {/* Claim CTA — only shown when award is unclaimed. */}
                {award.claimStatus === "unclaimed" && isLoggedIn && !isAwardAdmin && (
                  myRequest?.status === "pending" ? (
                    <Badge
                      variant="secondary"
                      className="gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-surface-muted text-text-secondary border-none self-start"
                    >
                      <Shield className="h-3 w-3" />
                      Claim under review
                    </Badge>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-xs font-medium uppercase tracking-widest h-9 text-text-secondary hover:text-text-primary"
                      onClick={() => setClaimOpen(true)}
                    >
                      <Shield className="h-4 w-4" />
                      Claim this award
                    </Button>
                  )
                )}
              </div>
            </div>

            {award.description && (
              <p className="max-w-2xl text-base leading-relaxed text-text-secondary">
                {award.description}
              </p>
            )}
          </div>
        </header>

        {/* What's Next — only shown when there are upcoming events */}
        {upcomingEvents.length > 0 && (
          <section className="mt-10 border-b border-border-default pb-10">
            <h2 className="mb-6 text-xs font-medium uppercase tracking-widest text-text-secondary">
              What's Next
            </h2>
            <div className="divide-y divide-border-default">
              {upcomingEvents.map((ev) => {
                const d = new Date(ev.eventDate + "T12:00:00");
                return (
                  <div key={ev.id} className="flex items-start gap-5 py-4 first:pt-0 last:pb-0">
                    <div className="w-14 shrink-0 text-center">
                      <div className="text-2xl font-bold tabular-nums text-text-primary leading-none">
                        {d.toLocaleDateString(undefined, { day: "numeric" })}
                      </div>
                      <div className="text-xs uppercase tracking-widest text-text-secondary mt-0.5">
                        {d.toLocaleDateString(undefined, { month: "short" })}
                      </div>
                      <div className="text-xs text-text-secondary">
                        {d.getFullYear()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="text-sm font-semibold text-text-primary">
                        {editionEventTypeLabels[ev.eventType]}
                      </div>
                      {ev.location && (
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-text-secondary">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {ev.location}
                        </div>
                      )}
                      {ev.notes && (
                        <div className="mt-0.5 text-xs text-text-secondary">{ev.notes}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="mt-12">
          <h2 className="mb-8 text-xs font-medium uppercase tracking-widest text-text-secondary">
            Editions ({editions.length})
          </h2>

          <div className="space-y-1">
            {editions.length === 0 ? (
              <p className="text-sm text-text-secondary italic">No editions listed yet.</p>
            ) : (
              editions.map((edition) => (
                <Link
                  key={edition.id}
                  to={`/award/${award.slug}/${edition.slug ?? edition.year ?? 'edition'}`}
                  className="group flex items-center justify-between p-4 -mx-4 hover:bg-surface-muted transition-colors border-b border-border-default last:border-0"
                >
                  <div className="flex items-center gap-6 min-w-0">
                    <div className="flex flex-col items-center justify-center w-12 h-12 bg-surface-muted group-hover:bg-surface-card rounded-sm border border-border-default transition-colors">
                      <span className="text-lg font-bold text-text-primary">
                        {getEditionDisplayLabel(edition) || '??'}
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
                        {getEditionDisplayLabel(edition) ? `${award.name} ${getEditionDisplayLabel(edition)}` : award.name}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-text-secondary mt-0.5">
                        {edition.ceremonyLocation && (
                          <div className="flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3" />
                            {edition.ceremonyLocation}
                          </div>
                        )}
                        {edition.editionDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(edition.editionDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Trophy className="w-3 h-3" />
                          {edition.recipientCount || 0} recipients
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-medium uppercase tracking-widest text-text-secondary group-hover:text-text-primary transition-colors">
                    View →
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>

      <AwardLeaderboardDialog
        awardId={award.id}
        awardName={award.name}
        open={leaderboardOpen}
        onOpenChange={setLeaderboardOpen}
      />

      <ClaimAwardDialog
        awardId={award.id}
        awardName={award.name}
        open={claimOpen}
        onOpenChange={setClaimOpen}
      />
    </AppLayout>
  );
}
