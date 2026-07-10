import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { getBuildingImageUrl } from "@/utils/image";
import { PeopleYouMayKnow } from "@/features/connect/components/PeopleYouMayKnow";

import { FeedPassportCard } from "./FeedPassportCard";

type TrendingArchitect = {
  id: string;
  name: string;
  slug: string | null;
  avatar_url: string | null;
  building_count: number;
};

type RecentBuilding = {
  id: string;
  slug: string | null;
  name: string;
  city: string | null;
  country: string | null;
  year_completed: number | null;
  hero_image_url: string | null;
  community_preview_url: string | null;
};

async function fetchTrendingArchitects(): Promise<TrendingArchitect[]> {
  const sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: posts, error: postsError } = await supabase
    .from("building_posts")
    .select("building_id")
    .eq("visibility", "public")
    .gte("created_at", sinceIso)
    .not("building_id", "is", null);

  if (postsError) throw postsError;

  const buildingIds = Array.from(
    new Set((posts ?? []).map((p) => p.building_id).filter(Boolean) as string[]),
  );
  if (buildingIds.length === 0) return [];

  const { data: credits, error: creditsError } = await supabase
    .from("building_credits")
    .select(
      `
      building_id,
      person:people!building_credits_person_id_fkey(id, name, slug, avatar_url)
    `,
    )
    .in("building_id", buildingIds)
    .eq("role", "design_architecture")
    .in("status", ["active", "verified"])
    .not("person_id", "is", null);

  if (creditsError) throw creditsError;

  const byPerson = new Map<string, { person: TrendingArchitect; buildings: Set<string> }>();
  for (const credit of (credits ?? []) as unknown as Array<{
    building_id: string;
    person: { id: string; name: string; slug: string | null; avatar_url: string | null } | null;
  }>) {
    const person = credit.person;
    if (!person) continue;
    const entry = byPerson.get(person.id);
    if (entry) {
      entry.buildings.add(credit.building_id);
    } else {
      byPerson.set(person.id, {
        person: { ...person, building_count: 0 },
        buildings: new Set([credit.building_id]),
      });
    }
  }

  return Array.from(byPerson.values())
    .map(({ person, buildings }) => ({ ...person, building_count: buildings.size }))
    .sort((a, b) => b.building_count - a.building_count)
    .slice(0, 5);
}

async function fetchRecentBuildings(): Promise<RecentBuilding[]> {
  const { data, error } = await supabase
    .from("buildings")
    .select(
      "id, slug, name, city, country, year_completed, hero_image_url, community_preview_url",
    )
    .neq("is_deleted", true)
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) throw error;
  return (data ?? []) as RecentBuilding[];
}

function ModuleHeader({ title }: { title: string }) {
  return (
    <h2 className="mb-3.5 text-[11px] font-medium uppercase tracking-widest text-text-disabled">
      {title}
    </h2>
  );
}

function TrendingArchitectsModule() {
  const { data, isLoading } = useQuery({
    queryKey: ["feed-sidebar", "trending-architects"],
    queryFn: fetchTrendingArchitects,
    staleTime: 10 * 60 * 1000,
  });

  return (
    <section className="border-t border-border-default pt-9">
      <ModuleHeader title="Trending architects" />
      {isLoading ? (
        <ul>
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-surface-muted shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-2/3 rounded bg-surface-muted" />
                <div className="h-2.5 w-1/3 rounded bg-surface-muted" />
              </div>
            </li>
          ))}
        </ul>
      ) : !data || data.length === 0 ? (
        <p className="text-xs text-text-disabled">
          No activity yet this week.
        </p>
      ) : (
        <ul>
          {data.map((architect, index) => {
            const href = architect.slug ? `/person/${architect.slug}` : null;
            const row = (
              <div className="flex min-w-0 flex-1 items-baseline gap-3 py-2.5">
                <span className="shrink-0 font-mono text-[11px] tracking-[0.04em] text-text-disabled">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold leading-snug text-text-primary">
                    {architect.name}
                  </div>
                  <div className="mt-0.5 text-[11px] text-text-secondary">
                    {architect.building_count}{" "}
                    {architect.building_count === 1 ? "building" : "buildings"}
                  </div>
                </div>
              </div>
            );
            return (
              <li
                key={architect.id}
                className="border-b border-border-default last:border-b-0"
              >
                {href ? (
                  <Link
                    to={href}
                    className="block transition-opacity hover:opacity-80"
                  >
                    {row}
                  </Link>
                ) : (
                  row
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function RecentBuildingsModule() {
  const { data, isLoading } = useQuery({
    queryKey: ["feed-sidebar", "recent-buildings"],
    queryFn: fetchRecentBuildings,
    staleTime: 10 * 60 * 1000,
  });

  return (
    <section className="border-t border-border-default pt-9">
      <ModuleHeader title="Recently added" />
      {isLoading ? (
        <ul className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 animate-pulse">
              <div className="h-12 w-12 rounded-none bg-surface-muted shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-2/3 rounded bg-surface-muted" />
                <div className="h-2.5 w-1/3 rounded bg-surface-muted" />
              </div>
            </li>
          ))}
        </ul>
      ) : !data || data.length === 0 ? (
        <p className="text-xs text-text-disabled">
          No buildings yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {data.map((building) => {
            const href = `/building/${building.id}${building.slug ? `/${building.slug}` : ""}`;
            const imagePath = building.hero_image_url ?? building.community_preview_url;
            const image = imagePath ? getBuildingImageUrl(imagePath) : undefined;
            const location = [building.city, building.country].filter(Boolean).join(", ");
            return (
              <li key={building.id}>
                <Link
                  to={href}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  {image ? (
                    <img
                      src={image}
                      alt=""
                      loading="lazy"
                      className="h-12 w-12 shrink-0 rounded-none object-cover bg-surface-muted"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-none bg-surface-muted shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 leading-tight">
                    <div className="text-sm font-medium text-text-primary truncate">
                      {building.name}
                    </div>
                    {location && (
                      <div className="text-xs text-text-disabled mt-0.5 truncate">
                        {location}
                        {building.year_completed ? ` · ${building.year_completed}` : ""}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function SidebarFooter() {
  const links: Array<{ to: string; label: string }> = [
    { to: "/about", label: "About" },
    { to: "/connect", label: "Find people" },
    { to: "/explore", label: "Explore" },
    { to: "/updates", label: "Updates" },
  ];

  return (
    <section className="border-t border-border-default pt-9 pb-2">
      <nav className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-[11px] text-text-disabled">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="transition-colors hover:text-text-primary"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <p className="mt-3 text-[10px] uppercase tracking-[0.12em] text-text-disabled">
        Plano · 2026
      </p>
    </section>
  );
}

export function FeedSidebar() {
  return (
    <div className="space-y-0">
      <FeedPassportCard />
      <PeopleYouMayKnow layout="stacked" />
      <TrendingArchitectsModule />
      <RecentBuildingsModule />
      <SidebarFooter />
    </div>
  );
}
