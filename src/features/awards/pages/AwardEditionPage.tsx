import { useLoaderData, Link, type MetaFunction } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Trophy, MapPin, Calendar, ChevronRight } from "lucide-react";
import { awardEditionLoader, type AwardEditionLoaderData } from "./AwardEditionPage.loader";
import { AwardRecipientCard } from "../components/AwardRecipientCard";
import type { AwardRecipientDTO } from "../types/awards";

export { awardEditionLoader as loader } from "./AwardEditionPage.loader";

export const meta: MetaFunction<typeof awardEditionLoader> = ({ data }) => {
  if (!data) return [{ title: "Plano" }];
  const d = data as AwardEditionLoaderData;
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

export default function AwardEditionPage() {
  const { award, edition, recipients } = useLoaderData() as AwardEditionLoaderData;

  // Group recipients by category
  const recipientsByCategory = recipients.reduce((acc, recipient) => {
    const categoryName = recipient.category?.name || "Other";
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(recipient);
    return acc;
  }, {} as Record<string, AwardRecipientDTO[]>);

  const categories = Object.keys(recipientsByCategory).sort();

  return (
    <AppLayout showBack title={`${award.name} ${edition.year}`} showHeader>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-12">
          <nav className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-widest text-text-secondary mb-6">
            <Link to="/" className="hover:text-text-primary">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link to={`/award/${award.slug}`} className="hover:text-text-primary truncate max-w-[200px]">
              {award.name}
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-text-primary">{edition.year}</span>
          </nav>

          <div className="flex flex-col gap-4">
            <h1 className="text-3xl font-bold tracking-tight text-text-primary md:text-5xl">
              {award.name} {edition.year}
            </h1>
            
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-secondary">
              {edition.ceremonyLocation && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {edition.ceremonyLocation}
                </div>
              )}
              {edition.editionDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(edition.editionDate).toLocaleDateString(undefined, { dateStyle: 'long' })}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                {recipients.length} Recipients
              </div>
            </div>
          </div>
        </header>

        <div className="space-y-16">
          {categories.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-border-default rounded-sm">
              <p className="text-sm text-text-secondary">No recipients listed for this edition yet.</p>
            </div>
          ) : (
            categories.map((categoryName) => (
              <section key={categoryName}>
                {categoryName !== 'Main Award' && (
                  <h2 className="mb-6 text-xs font-medium uppercase tracking-widest text-text-secondary border-b border-border-default pb-3">
                    {categoryName}
                  </h2>
                )}
                <div className="grid grid-cols-1 gap-1">
                  {recipientsByCategory[categoryName].map((recipient) => (
                    <AwardRecipientCard 
                      key={recipient.id} 
                      recipient={recipient} 
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
