import { useState } from "react";
import { useLoaderData, Link, type MetaFunction } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Trophy, MapPin, Calendar, LayoutList } from "lucide-react";
import { awardLoader, type AwardLoaderData } from "./AwardPage.loader";
import { cn } from "@/lib/utils";
import { AwardLeaderboardDialog } from "../components/AwardLeaderboardDialog";
import { Button } from "@/components/ui/button";

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
  const { award, editions } = useLoaderData() as AwardLoaderData;
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

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
              </div>
            </div>

            {award.description && (
              <p className="max-w-2xl text-base leading-relaxed text-text-secondary">
                {award.description}
              </p>
            )}
          </div>
        </header>

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
                  to={`/award/${award.slug}/${edition.year || 'edition'}`}
                  className="group flex items-center justify-between p-4 -mx-4 hover:bg-surface-muted transition-colors border-b border-border-default last:border-0"
                >
                  <div className="flex items-center gap-6 min-w-0">
                    <div className="flex flex-col items-center justify-center w-12 h-12 bg-surface-muted group-hover:bg-surface-card rounded-sm border border-border-default transition-colors">
                      <span className="text-lg font-bold text-text-primary">
                        {edition.year || '??'}
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
                        {edition.year ? `${award.name} ${edition.year}` : award.name}
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
    </AppLayout>
  );
}
