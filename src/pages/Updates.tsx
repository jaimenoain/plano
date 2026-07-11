import { Link } from "react-router";
import { Globe, Flag, MapPin, Loader2 } from "lucide-react";
import { SITE_URL } from "@/features/buildings/utils/structuredData";
import { usePublishedUpdates } from "@/features/updates/hooks/useUpdates";
import type { PlanoUpdate, GeoScope } from "@/features/updates/types";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

const PAGE_TITLE = "Plano Updates";
const PAGE_DESCRIPTION = "Product news, new cities, and community highlights from the Plano team.";

export function meta() {
  return [
    { title: `${PAGE_TITLE} | Plano` },
    { name: "description", content: PAGE_DESCRIPTION },
    { property: "og:title", content: `${PAGE_TITLE} | Plano` },
    { property: "og:description", content: PAGE_DESCRIPTION },
    { property: "og:url", content: `${SITE_URL}/updates` },
    { tagName: "link", rel: "canonical", href: `${SITE_URL}/updates` },
  ];
}

const GEO_ICONS: Record<GeoScope, typeof Globe> = {
  global: Globe,
  national: Flag,
  local: MapPin,
};

function geoLabel(update: PlanoUpdate): string {
  if (update.geoScope === "local") return update.localityCity ?? update.countryCode ?? "Local";
  if (update.geoScope === "national") return update.countryCode ?? "National";
  return "Global";
}

function UpdateCard({ update }: { update: PlanoUpdate }) {
  const GeoIcon = GEO_ICONS[update.geoScope];
  const formattedDate = update.publishedAt
    ? new Date(update.publishedAt).toLocaleDateString("en-GB", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <article className="group flex flex-col border-t border-border-default pt-8">
      {update.heroImageUrl && (
        <Link to={`/updates/${update.slug}`} className="mb-5 block overflow-hidden">
          <img
            src={update.heroImageUrl}
            alt={update.title}
            className="w-full aspect-16/7 object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </Link>
      )}

      <div className="flex items-center gap-3 mb-3">
        {formattedDate && (
          <time className="text-xs text-text-secondary">{formattedDate}</time>
        )}
        <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
          <GeoIcon className="h-3 w-3" />
          {geoLabel(update)}
        </span>
        {update.tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs">
            {tag}
          </Badge>
        ))}
      </div>

      <Link to={`/updates/${update.slug}`} className="group/title">
        <h2 className="text-xl font-semibold tracking-tight text-text-primary group-hover/title:underline underline-offset-2 mb-2">
          {update.title}
        </h2>
      </Link>

      {update.excerpt && (
        <p className="text-text-secondary text-sm leading-relaxed line-clamp-3">{update.excerpt}</p>
      )}
    </article>
  );
}

export default function Updates() {
  const { data: updates = [], isLoading } = usePublishedUpdates();

  return (
    <div className="min-h-screen w-full bg-surface-default text-text-primary">
      <div className="mx-auto py-16 px-4 max-w-[1120px]">
        <header className="mb-16 space-y-4">
          <p className="eyebrow tracking-widest">Updates</p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Plano Updates</h1>
          <p className="text-lg text-text-secondary leading-relaxed">
            Product news, new cities, and community highlights from the Plano team.
          </p>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
          </div>
        ) : updates.length === 0 ? (
          <EmptyState
            eyebrow="No updates yet"
            message="Product news, new cities, and community highlights will appear here — check back soon."
          />
        ) : (
          <div className="space-y-12">
            {updates.map((u) => (
              <UpdateCard key={u.id} update={u} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
