import { useState, useMemo } from 'react';
import { Link } from 'react-router';
import { MetaHead } from '@/components/common/MetaHead';
import { AppLayout } from '@/components/layout/AppLayout';
import { LocalitySearchInput } from './LocalitySearchInput';
import { useGuidesLocalities, usePopularCollections } from './useGuides';
import { LocalityCard } from './LocalityCard';
import { CollectionGuideCard } from './CollectionGuideCard';
import {
  CONTINENTS,
  getContinent,
  type Continent,
} from './continents';
import { getCountryUrl } from '@/utils/url';

// ─── Skeleton helpers ─────────────────────────────────────────────────────────

function CardSkeleton({ aspectRatio = '4/3' }: { aspectRatio?: string }) {
  return (
    <div
      className="rounded-sm bg-surface-muted animate-pulse"
      style={{ aspectRatio }}
    />
  );
}

function CollectionSkeleton() {
  return (
    <div className="border-b border-border-default pb-6 last:border-0 space-y-3">
      <div className="rounded-sm bg-surface-muted animate-pulse" style={{ aspectRatio: '16/7' }} />
      <div className="space-y-1.5">
        <div className="h-4 bg-surface-muted rounded-sm animate-pulse w-3/4" />
        <div className="h-3 bg-surface-muted rounded-sm animate-pulse w-1/2" />
      </div>
    </div>
  );
}

// ─── Section label (matches editorial pattern from COMPONENT_SPEC) ────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-2xs font-medium uppercase tracking-widest text-text-secondary">
      {children}
    </p>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GuidesPage() {
  const [activeContinent, setActiveContinent] = useState<Continent>('Europe');
  const [showAllLocalities, setShowAllLocalities] = useState(false);

  const { data: localities = [], isLoading: localitiesLoading } = useGuidesLocalities();
  const { data: collections = [], isLoading: collectionsLoading } = usePopularCollections();

  // Group localities by continent
  const byContinent = useMemo(() => {
    const map = new Map<Continent, typeof localities>();
    for (const loc of localities) {
      const continent = getContinent(loc.countryCode);
      if (!map.has(continent)) map.set(continent, []);
      map.get(continent)!.push(loc);
    }
    return map;
  }, [localities]);

  const continentLocalities = byContinent.get(activeContinent) ?? [];
  const featuredLocalities = continentLocalities.slice(0, 3);
  const secondaryLocalities = showAllLocalities
    ? continentLocalities.slice(3)
    : continentLocalities.slice(3, 11);
  const hasMore = continentLocalities.length > 11 && !showAllLocalities;

  // Unique countries for the active continent, sorted by total buildings
  const countries = useMemo(() => {
    const map = new Map<string, { code: string; name: string; count: number }>();
    for (const loc of continentLocalities) {
      const existing = map.get(loc.countryCode);
      if (existing) {
        existing.count += loc.buildingsCount;
      } else {
        map.set(loc.countryCode, {
          code: loc.countryCode,
          name: loc.country,
          count: loc.buildingsCount,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [continentLocalities]);

  // Hardcoded headline stats — update periodically to match real DB counts.
  // Dynamic sum from the locality query is unreliable due to Supabase's default
  // row limit (1000), which silently truncates results for large datasets.
  const TOTAL_BUILDINGS = 18_236;
  const TOTAL_LOCALITIES = 6_619;

  return (
    <>
      <MetaHead
        title="Architecture guides"
        description={`Discover the world's best architecture by city. ${TOTAL_BUILDINGS.toLocaleString()} buildings across ${TOTAL_LOCALITIES.toLocaleString()} localities, curated by the Plano community.`}
        canonicalUrl="/guides"
      />

      <AppLayout>
      <div className="mx-auto min-h-screen w-full max-w-[1440px] bg-surface-default">

        {/* ── Zone 1: Hero ─────────────────────────────────────── */}
        <section className="border-b border-border-default px-4 sm:px-8 py-16 sm:py-20">
          <div className="max-w-2xl">
            <SectionLabel>Guides</SectionLabel>
            <h1 className="text-3xl sm:text-5xl font-bold text-text-primary mt-3 leading-tight tracking-tight">
              The world's architecture,<br />city by city.
            </h1>
            <p className="text-text-secondary text-sm mt-4">
              {TOTAL_BUILDINGS.toLocaleString()} buildings across {TOTAL_LOCALITIES.toLocaleString()} localities
            </p>
            <div className="mt-8 max-w-md">
              <LocalitySearchInput localities={localities} />
            </div>
          </div>
        </section>

        {/* ── Zone 2: Browse by destination ────────────────────── */}
        <section className="border-b border-border-default px-4 sm:px-8 py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <SectionLabel>Browse by destination</SectionLabel>
              <h2 className="text-2xl font-semibold tracking-tight leading-tight text-text-primary mt-1">
                Cities
              </h2>
            </div>
          </div>

          {/* Continent tabs */}
          <div className="flex gap-1 flex-wrap mb-8 -mx-1">
            {CONTINENTS.map((continent) => {
              const count = byContinent.get(continent)?.length ?? 0;
              if (count === 0 && !localitiesLoading) return null;
              return (
                <button
                  key={continent}
                  onClick={() => {
                    setActiveContinent(continent);
                    setShowAllLocalities(false);
                  }}
                  className={`inline-flex min-h-[44px] items-center justify-center px-3 text-xs font-medium uppercase tracking-widest rounded-sm transition-colors duration-100 ${
                    activeContinent === continent
                      ? 'bg-text-primary text-surface-default'
                      : 'bg-transparent text-text-secondary border border-border-default hover:border-border-strong hover:text-text-primary'
                  }`}
                >
                  {continent}
                </button>
              );
            })}
          </div>

          {/* Featured city cards (3-up) */}
          {localitiesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {[0, 1, 2].map((i) => <CardSkeleton key={i} aspectRatio="4/3" />)}
            </div>
          ) : featuredLocalities.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {featuredLocalities.map((loc) => (
                <LocalityCard key={loc.id} locality={loc} featured />
              ))}
            </div>
          ) : null}

          {/* Secondary localities — compact list (2 cols on sm+) */}
          {secondaryLocalities.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 mb-2 border-t border-border-default pt-4">
              {secondaryLocalities.map((loc) => (
                <LocalityCard key={loc.id} locality={loc} />
              ))}
            </div>
          )}

          {/* Show more / country list footer */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-default">
            {hasMore && (
              <button
                onClick={() => setShowAllLocalities(true)}
                className="text-xs font-medium uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors"
              >
                Show all {continentLocalities.length} localities →
              </button>
            )}
            {!hasMore && countries.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {countries.slice(0, 8).map((c) => (
                  <Link
                    key={c.code}
                    to={getCountryUrl(c.code)}
                    className="text-xs text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            )}
            <Link
              to="/architecture"
              className="text-xs font-medium uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors ml-auto"
            >
              Full catalogue →
            </Link>
          </div>
        </section>

        {/* ── Zone 3: Popular collections ───────────────────────── */}
        <section className="border-b border-border-default px-4 sm:px-8 py-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <SectionLabel>Curated by the community</SectionLabel>
              <h2 className="text-2xl font-semibold tracking-tight leading-tight text-text-primary mt-1">
                Popular collections
              </h2>
            </div>
            <Link
              to="/explore"
              className="text-xs font-medium uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors hidden sm:block"
            >
              Explore all →
            </Link>
          </div>

          {collectionsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-0">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <CollectionSkeleton key={i} />
              ))}
            </div>
          ) : collections.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-0">
              {collections.map((col) => (
                <CollectionGuideCard key={col.id} collection={col} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">
              No public collections yet.{' '}
              <Link to="/collections/new" className="underline">
                Create the first one →
              </Link>
            </p>
          )}

          <Link
            to="/explore"
            className="block text-center mt-8 text-xs font-medium uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors sm:hidden"
          >
            Explore all collections →
          </Link>
        </section>

        {/* ── Zone 4: CTA strip ─────────────────────────────────── */}
        <section className="px-4 sm:px-8 py-12">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex-1">
              <SectionLabel>Start exploring</SectionLabel>
              <h2 className="text-xl font-semibold tracking-tight leading-tight text-text-primary mt-1">
                Create your own guide
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                Build a collection, generate an itinerary, and share it with the world.
              </p>
            </div>
            <div className="flex gap-6 shrink-0">
              <Link
                to="/collections/new"
                className="text-xs font-medium uppercase tracking-widest text-text-primary transition-colors hover:text-text-secondary"
              >
                New collection →
              </Link>
              <Link
                to="/explore"
                className="text-xs font-medium uppercase tracking-widest text-text-secondary transition-colors hover:text-text-primary"
              >
                Explore map →
              </Link>
            </div>
          </div>
        </section>

      </div>
      </AppLayout>
    </>
  );
}
