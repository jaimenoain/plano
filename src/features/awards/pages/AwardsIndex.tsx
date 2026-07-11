import { useState, useMemo } from "react";
import { useSearchParams, Link, type MetaFunction } from "react-router";
import { Trophy, Medal, MapPin, Search, ChevronRight } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { AwardRecipientCard } from "../components/AwardRecipientCard";
import { AwardFilterSelect } from "../components/AwardFilterSelect";
import {
  useRecentRecipients,
  useAwardsStats,
  useAwardLeaderboard,
  usePersonAwardLeaderboard,
  useAwards,
} from "../hooks/useAwards";
import { cn } from "@/lib/utils";
import { getBuildingImageUrl } from "@/utils/image";

// ── Meta ─────────────────────────────────────────────────────

export const meta: MetaFunction = () => [
  { title: "Awards | Plano" },
  {
    name: "description",
    content:
      "Architecture's most recognised buildings, architects, and practices.",
  },
  { tagName: "link", rel: "canonical", href: "https://plano.app/awards" },
  { property: "og:title", content: "Awards | Plano" },
  {
    property: "og:description",
    content:
      "Architecture's most recognised buildings, architects, and practices.",
  },
  { property: "og:url", content: "https://plano.app/awards" },
  { property: "og:type", content: "website" },
];

// ── Tabs ─────────────────────────────────────────────────────

type Tab = "recent" | "leaderboard" | "directory";

const TABS: { id: Tab; label: string }[] = [
  { id: "recent", label: "Recent" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "directory", label: "Directory" },
];

// ── Frequency badge ───────────────────────────────────────────

function FrequencyBadge({ frequency }: { frequency: string }) {
  const label =
    frequency === "annual"
      ? "Annual"
      : frequency === "biennial"
        ? "Biennial"
        : "Ad hoc";
  return (
    <Badge
      variant="secondary"
      className="text-[10px] uppercase tracking-wider px-1.5 py-0 h-auto font-medium bg-surface-muted text-text-secondary border-none"
    >
      {label}
    </Badge>
  );
}

// ── Recent tab ───────────────────────────────────────────────

type RecipientTypeFilter = "all" | "building" | "person" | "company";

function RecentTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const typeFilter = (searchParams.get("type") as RecipientTypeFilter) || "all";
  const winnersOnly = searchParams.get("winners") === "true";
  const thisYearOnly = searchParams.get("year") === "true";
  const currentYear = new Date().getFullYear();

  const filters = {
    recipientType:
      typeFilter !== "all"
        ? (typeFilter as "building" | "person" | "company")
        : null,
    winnersOnly,
  };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useRecentRecipients(filters);

  const recipients = useMemo(
    () => data?.pages.flatMap((p) => p) ?? [],
    [data],
  );

  function setPill(key: string, value: string | null) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", "recent");
      if (value === null) next.delete(key);
      else next.set(key, value);
      return next;
    });
  }

  const pillBase =
    "text-xs font-medium px-3 py-1.5 rounded-full border transition-colors cursor-pointer select-none";
  const pillActive =
    "bg-text-primary text-surface-default border-text-primary";
  const pillInactive =
    "bg-surface-default text-text-secondary border-border-default hover:border-text-secondary";

  return (
    <div className="space-y-6">
      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { label: "All", key: "type", value: null, activeWhen: typeFilter === "all" },
            { label: "Buildings", key: "type", value: "building", activeWhen: typeFilter === "building" },
            { label: "People", key: "type", value: "person", activeWhen: typeFilter === "person" },
            { label: "Practices", key: "type", value: "company", activeWhen: typeFilter === "company" },
          ] as const
        ).map(({ label, key, value, activeWhen }) => (
          <button
            key={label}
            type="button"
            className={cn(pillBase, activeWhen ? pillActive : pillInactive)}
            onClick={() => setPill(key, value)}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          className={cn(pillBase, winnersOnly ? pillActive : pillInactive)}
          onClick={() => setPill("winners", winnersOnly ? null : "true")}
        >
          Winners only
        </button>
        <button
          type="button"
          className={cn(pillBase, thisYearOnly ? pillActive : pillInactive)}
          onClick={() => setPill("year", thisYearOnly ? null : "true")}
          title={`Filter to ${currentYear} recipients`}
        >
          This year
        </button>
      </div>

      {/* Recipients */}
      {isLoading ? (
        <div className="space-y-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-border-default">
              <Skeleton className="h-12 w-12 rounded-none shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ) : recipients.length === 0 ? (
        <EmptyState
          eyebrow="No recipients"
          message="No recipients match these filters."
          action={
            <button
              type="button"
              className="cta-link"
              onClick={() => setSearchParams({ tab: "recent" })}
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <div>
          {recipients.map((r) => (
            <AwardRecipientCard key={r.id} recipient={r} showAwardName />
          ))}

          {hasNextPage && (
            <button
              type="button"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="mt-6 text-xs font-medium uppercase tracking-[0.15em] text-text-primary hover:opacity-60 transition-opacity disabled:opacity-30"
            >
              {isFetchingNextPage ? "Loading…" : "Show more →"}
            </button>
          )}
        </div>
      )}

      {/* Suggest CTA */}
      <div className="pt-4 border-t border-border-default">
        <p className="text-xs text-text-secondary">
          Know of a missing award?{" "}
          <Link
            to="/search"
            className="underline underline-offset-2 hover:opacity-70 transition-opacity"
          >
            Find the building or person →
          </Link>
        </p>
      </div>
    </div>
  );
}

// ── Leaderboard tab ───────────────────────────────────────────

function LeaderboardTab() {
  const [selectedAward, setSelectedAward] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const { data: buildings = [], isLoading: buildingsLoading } =
    useAwardLeaderboard(selectedAward?.id, 50);
  const { data: people = [], isLoading: peopleLoading } =
    usePersonAwardLeaderboard(selectedAward?.id, 50);

  return (
    <div className="space-y-10">
      {/* Award selector */}
      <div className="space-y-2">
        <p className="eyebrow tracking-widest">
          Filter by award
        </p>
        <AwardFilterSelect
          selectedAwardId={selectedAward?.id ?? null}
          onAwardChange={(a) => setSelectedAward(a)}
          placeholder="All awards"
        />
      </div>

      {/* Buildings */}
      <div className="space-y-3">
        <h3 className="eyebrow tracking-widest">
          Buildings
        </h3>
        {buildingsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="w-7 h-5" />
                <Skeleton className="w-9 h-9 rounded-none shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : buildings.length === 0 ? (
          <p className="text-sm text-text-secondary">No data yet.</p>
        ) : (
          <div>
            {buildings.map((b, i) => (
              <div
                key={b.building_id}
                className="flex items-center gap-4 py-3 border-b border-border-default last:border-0"
              >
                <span
                  className={cn(
                    "w-7 text-center text-sm font-bold shrink-0",
                    i === 0 ? "text-text-primary" : "text-text-secondary",
                  )}
                >
                  {i + 1}
                </span>
                <div className="h-9 w-9 overflow-hidden bg-surface-muted shrink-0 border border-border-default">
                  {b.hero_image_url ? (
                    <img
                      src={getBuildingImageUrl(b.hero_image_url) ?? undefined}
                      alt={b.building_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <MapPin className="h-3 w-3 text-text-disabled" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/building/${b.building_slug}`}
                    className="text-sm font-bold hover:opacity-70 transition-opacity truncate block"
                  >
                    {b.building_name}
                  </Link>
                  <p className="text-2xs text-text-secondary truncate">
                    {b.city}, {b.country}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {b.win_count > 0 && (
                    <Badge
                      variant="secondary"
                      className="bg-surface-muted text-text-secondary border-border-default gap-1 px-1.5 py-0 text-[10px]"
                    >
                      <Medal className="h-2.5 w-2.5" />
                      {b.win_count}
                    </Badge>
                  )}
                  <p className="text-2xs text-text-disabled mt-0.5">
                    {b.award_score} pts
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* People */}
      <div className="space-y-3">
        <h3 className="eyebrow tracking-widest">
          People
        </h3>
        {peopleLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="w-7 h-5" />
                <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : people.length === 0 ? (
          <p className="text-sm text-text-secondary">No data yet.</p>
        ) : (
          <div>
            {people.map((p, i) => (
              <div
                key={p.person_id}
                className="flex items-center gap-4 py-3 border-b border-border-default last:border-0"
              >
                <span
                  className={cn(
                    "w-7 text-center text-sm font-bold shrink-0",
                    i === 0 ? "text-text-primary" : "text-text-secondary",
                  )}
                >
                  {i + 1}
                </span>
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={p.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs bg-surface-muted text-text-secondary">
                    {p.person_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/person/${p.person_slug}`}
                    className="text-sm font-bold hover:opacity-70 transition-opacity truncate block"
                  >
                    {p.person_name}
                  </Link>
                  <p className="text-2xs text-text-secondary">
                    {p.award_count} {p.award_count === 1 ? "recognition" : "recognitions"}
                  </p>
                </div>
                {p.win_count > 0 && (
                  <Badge
                    variant="secondary"
                    className="bg-surface-muted text-text-secondary border-border-default gap-1 px-1.5 py-0 text-[10px] shrink-0"
                  >
                    <Medal className="h-2.5 w-2.5" />
                    {p.win_count}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Directory tab ─────────────────────────────────────────────

function DirectoryTab() {
  const [query, setQuery] = useState("");
  const { data: awards = [], isLoading } = useAwards();

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return awards;
    return awards.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.awardingBodyName ?? "").toLowerCase().includes(q) ||
        (a.awardingBodyCompany?.name ?? "").toLowerCase().includes(q),
    );
  }, [awards, query]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-disabled pointer-events-none" />
        <Input
          placeholder="Search awards…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-border-default">
              <Skeleton className="h-8 w-8 rounded-sm shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState eyebrow="No awards found" message="Try a different search term." />
      ) : (
        <div>
          {filtered.map((a) => {
            const bodyName =
              a.awardingBodyCompany?.name ?? a.awardingBodyName ?? null;
            return (
              <Link
                key={a.id}
                to={`/award/${a.slug}`}
                className="flex items-center gap-4 py-3 border-b border-border-default last:border-0 group hover:opacity-70 transition-opacity"
              >
                {/* Initial tile */}
                <div className="h-8 w-8 rounded-sm bg-surface-muted border border-border-default shrink-0 flex items-center justify-center">
                  <Trophy className="h-3.5 w-3.5 text-text-disabled" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text-primary truncate">
                    {a.name}
                  </p>
                  <p className="text-2xs text-text-secondary truncate">
                    {bodyName}
                    {bodyName && a.editionCount ? " · " : ""}
                    {a.editionCount ? `${a.editionCount} editions` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <FrequencyBadge frequency={a.frequency} />
                  <ChevronRight className="h-4 w-4 text-text-disabled group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Right rail ────────────────────────────────────────────────

function RightRail({
  onSwitchTab,
}: {
  onSwitchTab: (tab: Tab) => void;
}) {
  const { data: stats } = useAwardsStats();
  const { data: topBuildings = [] } = useAwardLeaderboard(undefined, 3);
  const { data: topPeople = [] } = usePersonAwardLeaderboard(undefined, 3);
  const { data: allAwards = [] } = useAwards();

  const prestigiousAwards = useMemo(
    () =>
      [...allAwards]
        .sort((a, b) => (b.editionCount ?? 0) - (a.editionCount ?? 0))
        .slice(0, 5),
    [allAwards],
  );

  return (
    <div className="space-y-8">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-border-default rounded-sm p-4 text-center">
            <p className="text-2xl font-bold text-text-primary">
              {stats.awardCount}
            </p>
            <p className="eyebrow tracking-widest mt-1">
              Awards tracked
            </p>
          </div>
          <div className="border border-border-default rounded-sm p-4 text-center">
            <p className="text-2xl font-bold text-text-primary">
              {stats.recipientCount.toLocaleString()}
            </p>
            <p className="eyebrow tracking-widest mt-1">
              Recipients
            </p>
          </div>
        </div>
      )}

      {/* Most-awarded buildings */}
      {topBuildings.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="eyebrow tracking-widest">
              Most awarded buildings
            </h3>
            <button
              type="button"
              onClick={() => onSwitchTab("leaderboard")}
              className="text-2xs text-text-secondary hover:text-text-primary transition-colors underline underline-offset-2"
            >
              Full leaderboard →
            </button>
          </div>
          <div className="space-y-2">
            {topBuildings.map((b, i) => (
              <Link
                key={b.building_id}
                to={`/building/${b.building_slug}`}
                className="flex items-center gap-3 group"
              >
                <span className="text-xs font-bold text-text-disabled w-4 shrink-0">
                  {i + 1}
                </span>
                <div className="h-8 w-8 overflow-hidden bg-surface-muted shrink-0 border border-border-default">
                  {b.hero_image_url ? (
                    <img
                      src={getBuildingImageUrl(b.hero_image_url) ?? undefined}
                      alt={b.building_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <MapPin className="h-3 w-3 text-text-disabled" />
                    </div>
                  )}
                </div>
                <p className="text-xs font-medium text-text-primary group-hover:opacity-70 transition-opacity truncate">
                  {b.building_name}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Most-awarded people */}
      {topPeople.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="eyebrow tracking-widest">
              Most awarded people
            </h3>
            <button
              type="button"
              onClick={() => onSwitchTab("leaderboard")}
              className="text-2xs text-text-secondary hover:text-text-primary transition-colors underline underline-offset-2"
            >
              See all →
            </button>
          </div>
          <div className="space-y-2">
            {topPeople.map((p, i) => (
              <Link
                key={p.person_id}
                to={`/person/${p.person_slug}`}
                className="flex items-center gap-3 group"
              >
                <span className="text-xs font-bold text-text-disabled w-4 shrink-0">
                  {i + 1}
                </span>
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={p.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[10px] bg-surface-muted text-text-secondary">
                    {p.person_name[0]}
                  </AvatarFallback>
                </Avatar>
                <p className="text-xs font-medium text-text-primary group-hover:opacity-70 transition-opacity truncate">
                  {p.person_name}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Prestigious awards */}
      {prestigiousAwards.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="eyebrow tracking-widest">
              Prestigious awards
            </h3>
            <button
              type="button"
              onClick={() => onSwitchTab("directory")}
              className="text-2xs text-text-secondary hover:text-text-primary transition-colors underline underline-offset-2"
            >
              All {allAwards.length} awards →
            </button>
          </div>
          <div className="space-y-1">
            {prestigiousAwards.map((a) => (
              <Link
                key={a.id}
                to={`/award/${a.slug}`}
                className="flex items-center gap-3 py-2 group"
              >
                <div className="h-7 w-7 rounded-sm bg-surface-muted border border-border-default shrink-0 flex items-center justify-center">
                  <Trophy className="h-3 w-3 text-text-disabled" />
                </div>
                <p className="text-xs font-medium text-text-primary group-hover:opacity-70 transition-opacity truncate flex-1">
                  {a.name}
                </p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <FrequencyBadge frequency={a.frequency} />
                  {a.editionCount != null && (
                    <span className="text-2xs text-text-disabled">
                      {a.editionCount}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function AwardsIndex() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") as Tab) || "recent";

  function switchTab(next: Tab) {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("tab", next);
      // Clear per-tab filter params when switching away from recent
      if (next !== "recent") {
        p.delete("type");
        p.delete("winners");
        p.delete("year");
      }
      return p;
    });
  }

  return (
    <AppLayout title="Awards" showLogo={false}>
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24">
        {/* ── Heading ── */}
        <div className="mb-8 border-b border-border-default pb-8">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-text-primary leading-none">
            Awards
          </h1>
          <p className="mt-3 text-sm text-text-secondary">
            Architecture's most recognised buildings, architects, and practices.
          </p>
        </div>

        <div className="flex gap-12">
          {/* ── Main content ── */}
          <div className="flex-1 min-w-0">
            {/* Tab bar */}
            <div className="flex gap-0 mb-8 border-b border-border-default">
              {TABS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => switchTab(id)}
                  className={cn(
                    "px-1 pb-3 mr-6 text-sm font-medium transition-colors border-b-2 -mb-px",
                    tab === id
                      ? "border-text-primary text-text-primary"
                      : "border-transparent text-text-secondary hover:text-text-primary",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "recent" && <RecentTab />}
            {tab === "leaderboard" && <LeaderboardTab />}
            {tab === "directory" && <DirectoryTab />}
          </div>

          {/* ── Right rail (desktop only) ── */}
          <div className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-6">
              <RightRail onSwitchTab={switchTab} />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
