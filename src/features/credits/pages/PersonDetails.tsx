import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Link,
  useLoaderData,
  useParams,
  useRevalidator,
  useRouteError,
  isRouteErrorResponse,
  useSearchParams,
  type MetaFunction,
} from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EntityStatsBand } from "@/components/entity/EntityStatsBand";
import { EntityTabs, type EntityTab } from "@/components/entity/EntityTabs";
import type { Person } from "../types";
import { EditPersonForm } from "../components/EditPersonForm";
import { getPerson, personQueryKey } from "@/features/credits/api/people";
import { ClaimPersonDialog } from "../components/ClaimPersonDialog";
import { PersonHero } from "../components/PersonHero";
import { PersonPortfolioSection } from "../components/PersonPortfolioSection";
import { PersonAboutSection } from "../components/PersonAboutSection";
import { FollowPersonButton } from "../components/FollowPersonButton";
import { PersonFollowersDialog } from "../components/PersonFollowersDialog";
import { getPersonFollowerCount, personFollowKeys } from "../api/personFollows";
import { PersonAwardsSection, useAwardsByPerson } from "@/features/awards";
import { FollowButton } from "@/features/profile";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { personDetailsLoader, type PersonDetailsLoaderData } from "./PersonDetails.loader";

export { personDetailsLoader as loader } from "./PersonDetails.loader";

export const meta: MetaFunction<typeof personDetailsLoader> = ({ loaderData: data }) => {
  if (!data) return [{ title: "Plano" }];
  const d = data as PersonDetailsLoaderData;
  return [
    { title: d.metaTitle },
    { name: "description", content: d.description },
    { property: "og:title", content: d.metaTitle },
    { property: "og:description", content: d.description },
    { property: "og:image", content: d.ogImage },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:url", content: d.canonical },
    { property: "og:type", content: "profile" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: d.metaTitle },
    { name: "twitter:description", content: d.description },
    { name: "twitter:image", content: d.ogImage },
    { tagName: "link", rel: "canonical", href: d.canonical },
    { "script:ld+json": d.structuredData },
  ];
};

type SectionKey = "portfolio" | "awards" | "about";

const SECTION_KEYS: SectionKey[] = ["portfolio", "awards", "about"];

export function HydrateFallback() {
  return (
    <AppLayout showBack title="Loading…" showLogo={false} fullWidth>
      <div className="mx-auto max-w-[1120px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 pt-10 pb-2 sm:flex-row sm:items-start sm:gap-8">
          <Skeleton className="size-20 shrink-0 rounded-full sm:size-26" />
          <div className="min-w-0 flex-1 pt-6">
            <Skeleton className="mb-4 h-10 w-2/3 max-w-md" />
            <Skeleton className="h-16 w-full max-w-lg" />
          </div>
        </div>
        <Skeleton className="mt-12 h-24 w-full" />
        <Skeleton className="mt-16 h-40 w-full" />
      </div>
    </AppLayout>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const { slug } = useParams();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <AppLayout showBack>
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-8 text-center">
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-text-primary">Person not found</h1>
          <p className="mb-6 max-w-md text-sm leading-relaxed text-text-secondary md:text-base">
            We couldn&apos;t find a profile
            {slug ? (
              <>
                {" "}
                <span className="font-mono text-text-primary">({slug})</span>
              </>
            ) : null}
            . The link may be wrong or the page was removed.
          </p>
          <Link
            to="/explore"
            className="text-xs font-medium uppercase tracking-widest text-text-primary transition-opacity hover:opacity-70"
          >
            Browse buildings →
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showBack>
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-8 text-center">
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-text-primary">Something went wrong</h1>
        <p className="mb-6 max-w-md text-sm text-text-secondary">Please try again in a moment.</p>
        <Button asChild size="lg" variant="default">
          <Link to="/">Home</Link>
        </Button>
      </div>
    </AppLayout>
  );
}

export default function PersonDetails() {
  const loaderData = useLoaderData() as PersonDetailsLoaderData;
  const { slug: slugParam } = useParams();
  const slug = slugParam?.trim() ?? "";
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const revalidator = useRevalidator();
  const { user } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [followersOpen, setFollowersOpen] = useState(false);

  const { data: queryData } = useQuery({
    queryKey: personQueryKey(slug),
    queryFn: () => getPerson(slug),
    enabled: Boolean(slug),
    initialData: { person: loaderData.person, credits: loaderData.credits },
    staleTime: 60_000,
  });

  const person = queryData?.person ?? loaderData.person;
  const credits = queryData?.credits ?? loaderData.credits;

  const isOwner = Boolean(user?.id && person.claimedByUserId === user.id);

  useEffect(() => {
    if (searchParams.get("edit") !== "1" || !isOwner) return;
    setEditOpen(true);
  }, [searchParams, isOwner]);

  const handlePersonSaved = (updated: Person) => {
    queryClient.setQueryData(personQueryKey(slug), (prev) => {
      if (!prev) return prev;
      return { ...prev, person: updated };
    });
    void queryClient.invalidateQueries({ queryKey: personQueryKey(slug) });
    revalidator.revalidate();
  };

  const handlePersonClaimed = (updated: Person) => {
    handlePersonSaved(updated);
    setEditOpen(true);
  };

  // Awards drive a stats cell and the Awards tab count; the section body
  // shares the same query, so this costs no extra fetch.
  const { data: awards = [], isLoading: awardsLoading } = useAwardsByPerson(person.id);
  const awardCount = awards.filter((a) => a.recipientType === "person").length;

  // Follower count branches on claim state inside the api fn; keyed per person.
  const { data: followerCount } = useQuery({
    queryKey: personFollowKeys.count(person.id, person.claimedByUserId),
    queryFn: () => getPersonFollowerCount(person),
    staleTime: 60_000,
  });

  const { buildingCount, roleCount } = useMemo(() => {
    const buildings = new Set<string>();
    const roles = new Set<string>();
    for (const c of credits) {
      buildings.add(c.building.id);
      roles.add(c.role === "other" && c.roleCustom ? c.roleCustom : c.role);
    }
    return { buildingCount: buildings.size, roleCount: roles.size };
  }, [credits]);

  const sectionParam = searchParams.get("section") as SectionKey | null;
  const activeSection: SectionKey =
    sectionParam && SECTION_KEYS.includes(sectionParam) ? sectionParam : "portfolio";

  const handleSectionChange = useCallback(
    (section: SectionKey) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (section === "portfolio") next.delete("section");
          else next.set("section", section);
          return next;
        },
        { replace: true, preventScrollReset: true },
      );
    },
    [setSearchParams],
  );

  const lifeSpan =
    person.birthYear != null || person.deathYear != null
      ? [person.birthYear ?? "?", person.deathYear ?? "—"].join("–")
      : null;

  const showUnclaimedBanner = person.claimStatus === "unclaimed";

  const tabs: EntityTab<SectionKey>[] = [
    { key: "portfolio", label: "Portfolio", count: credits.length },
    { key: "awards", label: "Awards", count: awardsLoading ? null : awardCount },
    { key: "about", label: "About", count: null },
  ];

  return (
    <AppLayout title={person.name} showLogo={false} showBack fullWidth>
      {isOwner ? (
        <EditPersonForm
          open={editOpen}
          onOpenChange={setEditOpen}
          person={person}
          onSaved={handlePersonSaved}
        />
      ) : null}
      {user && person.claimStatus === "unclaimed" ? (
        <ClaimPersonDialog
          personId={person.id}
          personSlug={slug}
          personName={person.name}
          open={claimOpen}
          onOpenChange={setClaimOpen}
          onClaimed={handlePersonClaimed}
        />
      ) : null}

      <div className="mx-auto max-w-[1120px] px-4 sm:px-6 lg:px-8">
        <PersonHero
          person={person}
          lifeSpan={lifeSpan}
          isOwner={isOwner}
          onEdit={() => setEditOpen(true)}
          visitorActions={
            person.claimedByUserId ? (
              // Claimed: following the person IS following the claiming user.
              <FollowButton
                userId={person.claimedByUserId}
                className="min-h-11 px-5 text-xs sm:h-7 sm:min-h-0 sm:px-4"
              />
            ) : (
              <FollowPersonButton
                personId={person.id}
                personName={person.name}
                className="min-h-11 px-5 text-xs sm:h-7 sm:min-h-0 sm:px-4"
              />
            )
          }
        />

        <EntityStatsBand
          cells={[
            { key: "buildings", value: buildingCount, label: "Buildings" },
            { key: "awards", value: awardsLoading ? "—" : awardCount, label: "Awards" },
            {
              key: "followers",
              value: followerCount ?? "—",
              label: "Followers",
              onClick: () => setFollowersOpen(true),
            },
            { key: "roles", value: roleCount, label: "Roles" },
          ]}
        />

        <PersonFollowersDialog person={person} open={followersOpen} onOpenChange={setFollowersOpen} />
      </div>

      {showUnclaimedBanner ? (
        <div className="mx-auto max-w-[1120px] px-4 pt-12 sm:px-6 lg:px-8">
          <div className="rounded-none border border-border-default bg-surface-muted px-4 py-4 sm:px-5">
            <p className="mb-2 text-sm font-medium text-text-primary">This profile hasn&apos;t been claimed yet</p>
            <p className="mb-3 text-sm text-text-secondary">
              If this is you or you represent this person, you can link this profile to your Plano account.
            </p>
            {user ? (
              <button
                type="button"
                className="text-xs font-medium uppercase tracking-widest text-text-primary transition-opacity hover:opacity-70"
                onClick={() => setClaimOpen(true)}
              >
                Claim this profile →
              </button>
            ) : (
              <Link
                to={`/login?redirect=${encodeURIComponent(`/person/${slug}`)}`}
                className="inline-flex text-xs font-medium uppercase tracking-widest text-text-primary hover:underline"
              >
                Log in to claim →
              </Link>
            )}
          </div>
        </div>
      ) : null}

      <div className="mt-16">
        <EntityTabs tabs={tabs} activeKey={activeSection} onChange={handleSectionChange} />
      </div>

      <div className="mx-auto max-w-[1120px] px-4 sm:px-6 lg:px-8">
        <div className="min-h-[60vh] pt-16 pb-10">
          {activeSection === "portfolio" && <PersonPortfolioSection credits={credits} />}
          {activeSection === "awards" && (
            <PersonAwardsSection personId={person.id} personName={person.name} />
          )}
          {activeSection === "about" && <PersonAboutSection person={person} lifeSpan={lifeSpan} />}
        </div>
      </div>
    </AppLayout>
  );
}
