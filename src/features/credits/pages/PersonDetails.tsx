import { useEffect, useMemo, useState } from "react";
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
import { ExternalLink, ChevronDown, Pencil, BadgeCheck } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { Person, PersonCreditWithBuilding } from "@/features/credits/types";
import { PersonCreditCard } from "@/features/credits/components/PersonCreditCard";
import { EditPersonForm } from "@/features/credits/components/EditPersonForm";
import { getPerson, personQueryKey } from "@/features/credits/api/people";
import { ClaimPersonDialog } from "@/features/credits/components/ClaimPersonDialog";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { personDetailsLoader, type PersonDetailsLoaderData } from "./PersonDetails.loader";

export { personDetailsLoader as loader } from "./PersonDetails.loader";

export const meta: MetaFunction<typeof personDetailsLoader> = ({ data }) => {
  if (!data) return [{ title: "Plano" }];
  const d = data as PersonDetailsLoaderData;
  return [
    { title: d.metaTitle },
    { name: "description", content: d.description },
    { property: "og:title", content: d.metaTitle },
    { property: "og:description", content: d.description },
    { property: "og:image", content: d.ogImage },
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

function tierLabel(tier: "primary" | "contributor" | "ancillary"): string {
  if (tier === "primary") return "Primary";
  if (tier === "contributor") return "Contributor";
  return "Additional";
}

function groupByTier(credits: PersonCreditWithBuilding[]) {
  const primary: PersonCreditWithBuilding[] = [];
  const contributor: PersonCreditWithBuilding[] = [];
  const ancillary: PersonCreditWithBuilding[] = [];
  for (const c of credits) {
    if (c.creditTier === "primary") primary.push(c);
    else if (c.creditTier === "contributor") contributor.push(c);
    else ancillary.push(c);
  }
  return { primary, contributor, ancillary };
}

function personInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function HydrateFallback() {
  return (
    <AppLayout showBack title="Loading…">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-8 h-24 w-24 rounded-full" />
        <Skeleton className="mb-4 h-10 w-2/3 max-w-md" />
        <Skeleton className="mb-8 h-20 w-full" />
        <Skeleton className="h-40 w-full" />
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
          <Button asChild size="lg" variant="default" className="min-w-[200px]">
            <Link to="/explore">Browse buildings</Link>
          </Button>
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

function CreditTierSection({
  tier,
  credits,
}: {
  tier: "primary" | "contributor" | "ancillary";
  credits: PersonCreditWithBuilding[];
}) {
  if (credits.length === 0) return null;
  return (
    <section className="mt-12 first:mt-0">
      <h2 className="mb-6 text-xs font-medium uppercase tracking-widest text-text-secondary">
        {tierLabel(tier)} credits
      </h2>
      <div>
        {credits.map((c) => (
          <PersonCreditCard key={c.id} credit={c} />
        ))}
      </div>
    </section>
  );
}

export default function PersonDetails() {
  const loaderData = useLoaderData() as PersonDetailsLoaderData;
  const { slug: slugParam } = useParams();
  const slug = slugParam?.trim() ?? "";
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const revalidator = useRevalidator();
  const { user } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [ancillaryOpen, setAncillaryOpen] = useState(false);

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

  const { primary, contributor, ancillary } = useMemo(() => groupByTier(credits), [credits]);

  const lifeSpan =
    person.birthYear != null || person.deathYear != null
      ? [person.birthYear ?? "?", person.deathYear ?? "—"].join("–")
      : null;

  const showUnclaimedBanner = person.claimStatus === "unclaimed";

  return (
    <AppLayout showBack>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
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
        <header className="border-b border-border-default pb-10">
          <div className="flex flex-col-reverse gap-8 sm:flex-row sm:items-start sm:gap-12 lg:gap-20">
            <div className="min-w-0 flex-1 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <h1 className="text-4xl font-bold tracking-tight text-text-primary md:text-5xl lg:text-6xl">
                    {person.name}
                  </h1>
                  {person.claimStatus === "verified" ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex shrink-0 text-text-primary" tabIndex={0}>
                          <BadgeCheck className="h-8 w-8 md:h-9 md:w-9" aria-label="Identity verified by Plano" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Identity verified by Plano</TooltipContent>
                    </Tooltip>
                  ) : null}
                </div>
                {isOwner ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 border-border-default"
                    onClick={() => setEditOpen(true)}
                  >
                    <Pencil className="mr-2 h-4 w-4" aria-hidden />
                    Edit
                  </Button>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
                {person.nationality ? <span>{person.nationality}</span> : null}
                {lifeSpan ? <span>{lifeSpan}</span> : null}
                {person.locationNote ? <span>{person.locationNote}</span> : null}
              </div>
              {person.website?.trim() ? (
                <a
                  href={person.website.trim().startsWith("http") ? person.website.trim() : `https://${person.website.trim()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-widest text-text-primary hover:underline"
                >
                  Website
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              ) : null}
              {person.bio?.trim() ? (
                <p className="max-w-2xl text-base leading-relaxed text-text-secondary">{person.bio.trim()}</p>
              ) : null}
            </div>
            {person.avatarUrl ? (
              <div className="shrink-0 self-start">
                <Avatar className="h-32 w-32 shrink-0 rounded-none border border-border-default sm:h-40 sm:w-40">
                  <AvatarImage src={person.avatarUrl} alt="" />
                  <AvatarFallback className="rounded-none" />
                </Avatar>
              </div>
            ) : null}
          </div>
        </header>

        {showUnclaimedBanner ? (
          <div className="mt-10 rounded-sm border border-border-default bg-surface-muted px-4 py-4 sm:px-5">
            <p className="mb-2 text-sm font-medium text-text-primary">This profile hasn&apos;t been claimed yet</p>
            <p className="mb-3 text-sm text-text-secondary">
              If this is you or you represent this person, you can link this profile to your Plano account.
            </p>
            {user ? (
              <Button
                type="button"
                variant="default"
                size="sm"
                className="text-xs font-medium uppercase tracking-widest"
                onClick={() => setClaimOpen(true)}
              >
                Claim this profile
              </Button>
            ) : (
              <Link
                to={`/auth?redirect=${encodeURIComponent(`/person/${slug}`)}`}
                className="inline-flex text-xs font-medium uppercase tracking-widest text-text-primary hover:underline"
              >
                Log in to claim →
              </Link>
            )}
          </div>
        ) : null}

        <div className="mt-12">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-widest text-text-secondary">Credits</h2>
          {credits.length === 0 ? (
            <p className="mt-4 text-sm text-text-secondary">No public credits on Plano yet.</p>
          ) : (
            <>
              <CreditTierSection tier="primary" credits={primary} />
              <CreditTierSection tier="contributor" credits={contributor} />
              {ancillary.length > 0 ? (
                <section className="mt-12">
                  <Collapsible open={ancillaryOpen} onOpenChange={setAncillaryOpen}>
                    <CollapsibleTrigger
                      type="button"
                      className="flex w-full items-center justify-between border-b border-border-default py-3 text-left text-xs font-medium uppercase tracking-widest text-text-secondary hover:text-text-primary"
                    >
                      <span>
                        Additional credits ({ancillary.length})
                      </span>
                      <ChevronDown
                        className={cn("h-4 w-4 shrink-0 transition-transform", ancillaryOpen && "rotate-180")}
                        aria-hidden
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="pt-4">
                        {ancillary.map((c) => (
                          <PersonCreditCard key={c.id} credit={c} />
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
