import { Link, useParams } from "react-router";
import { Globe, Flag, MapPin, Loader2, ArrowLeft } from "lucide-react";
import { useUpdateBySlug } from "@/features/updates/hooks/useUpdates";
import type { GeoScope } from "@/features/updates/types";
import { Badge } from "@/components/ui/badge";

const GEO_ICONS: Record<GeoScope, typeof Globe> = {
  global: Globe,
  national: Flag,
  local: MapPin,
};

export function meta() {
  return [{ title: "Update | Plano" }];
}

export default function UpdateDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: update, isLoading } = useUpdateBySlug(slug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-default flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
      </div>
    );
  }

  if (!update) {
    return (
      <div className="min-h-screen bg-surface-default flex flex-col items-center justify-center gap-4">
        <p className="text-text-secondary">Post not found.</p>
        <Link to="/updates" className="text-sm text-text-primary hover:underline underline-offset-2">
          ← Back to Updates
        </Link>
      </div>
    );
  }

  const GeoIcon = GEO_ICONS[update.geoScope];
  const geoLabel =
    update.geoScope === "local"
      ? (update.localityCity ?? update.countryCode ?? "Local")
      : update.geoScope === "national"
        ? (update.countryCode ?? "National")
        : "Global";

  const formattedDate = update.publishedAt
    ? new Date(update.publishedAt).toLocaleDateString("en-GB", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-surface-default text-text-primary">
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <Link
          to="/updates"
          className="mb-10 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.15em] text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          All updates
        </Link>

        <article className="space-y-8">
          {update.heroImageUrl && (
            <img
              src={update.heroImageUrl}
              alt={update.title}
              className="w-full aspect-[16/7] object-cover rounded-lg"
            />
          )}

          <header className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              {formattedDate && (
                <time className="text-xs text-text-secondary">{formattedDate}</time>
              )}
              <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                <GeoIcon className="h-3 w-3" />
                {geoLabel}
              </span>
              {update.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>

            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{update.title}</h1>

            {update.excerpt && (
              <p className="text-lg text-text-secondary leading-relaxed">{update.excerpt}</p>
            )}
          </header>

          {update.body && (
            <div className="max-w-prose text-base leading-relaxed text-text-secondary whitespace-pre-wrap">
              {update.body}
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
