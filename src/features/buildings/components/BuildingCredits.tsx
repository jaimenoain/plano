import { useCallback, useReducer, useMemo, useState } from "react";
import { Link } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, ChevronDown, BadgeCheck, Flag, Users } from "lucide-react";
import type { BuildingCreditWithEntities, CreditRole, CreditTier, FlagReason } from "@/features/credits/types";
import { formatCreditRoleLabel } from "@/features/credits/formatCreditRole";
import { visiblePrimaryCredits } from "@/features/credits/buildingCreditDisplay";
import { AddCreditForm } from "@/features/credits/components/AddCreditForm";
import { flagCredit, buildingCreditsQueryKey } from "@/features/credits/api/credits";
import { markCreditFlaggedInSession, readSessionFlaggedCreditIds } from "@/features/credits/creditFlagSession";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getStorageAssetUrl } from "@/utils/image";
import { cn } from "@/lib/utils";

const FLAG_REASON_OPTIONS: { value: FlagReason; label: string }[] = [
  { value: "wrong_person", label: "Wrong person" },
  { value: "never_involved", label: "Never involved" },
  { value: "wrong_role", label: "Wrong role" },
  { value: "other", label: "Other" },
];

function useSessionFlaggedCreditBump() {
  const [version, bump] = useReducer((n: number) => n + 1, 0);
  const sessionIds = useMemo(() => {
    void version;
    return readSessionFlaggedCreditIds();
  }, [version]);
  const markAndBump = useCallback(
    (creditId: string) => {
      markCreditFlaggedInSession(creditId);
      bump();
    },
    [],
  );
  return { sessionIds, markAndBump };
}

function tierHeadingLabel(tier: CreditTier): string {
  if (tier === "primary") return "Primary";
  if (tier === "contributor") return "Contributor";
  return "Additional";
}

function tierShortDescription(tier: CreditTier): string {
  if (tier === "primary") return "Lead design team and core architecture credits.";
  if (tier === "contributor") return "Engineering, interiors, landscape, and specialist consultants.";
  return "Further collaborators and supporting roles.";
}

function groupByTier(credits: BuildingCreditWithEntities[]) {
  const primary: BuildingCreditWithEntities[] = [];
  const contributor: BuildingCreditWithEntities[] = [];
  const ancillary: BuildingCreditWithEntities[] = [];
  for (const c of credits) {
    if (c.creditTier === "primary") primary.push(c);
    else if (c.creditTier === "contributor") contributor.push(c);
    else ancillary.push(c);
  }
  return { primary, contributor, ancillary };
}

function sortRowsInRole(rows: BuildingCreditWithEntities[]): BuildingCreditWithEntities[] {
  return [...rows].sort((a, b) => {
    if (a.isLead !== b.isLead) return (b.isLead ? 1 : 0) - (a.isLead ? 1 : 0);
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    return a.id.localeCompare(b.id);
  });
}

function groupTierByRole(credits: BuildingCreditWithEntities[]): Map<CreditRole, BuildingCreditWithEntities[]> {
  const map = new Map<CreditRole, BuildingCreditWithEntities[]>();
  for (const c of credits) {
    const list = map.get(c.role) ?? [];
    list.push(c);
    map.set(c.role, list);
  }
  const roles = [...map.keys()].sort((a, b) =>
    formatCreditRoleLabel(a, null).localeCompare(formatCreditRoleLabel(b, null)),
  );
  const ordered = new Map<CreditRole, BuildingCreditWithEntities[]>();
  for (const r of roles) {
    const items = map.get(r);
    if (items) ordered.set(r, sortRowsInRole(items));
  }
  return ordered;
}

function yearRangeText(credit: BuildingCreditWithEntities): string | null {
  if (credit.yearFrom != null && credit.yearTo != null) {
    return `${credit.yearFrom}–${credit.yearTo}`;
  }
  if (credit.yearFrom != null) return String(credit.yearFrom);
  if (credit.yearTo != null) return String(credit.yearTo);
  return null;
}

function projectHref(url: string): string {
  const t = url.trim();
  if (!t) return t;
  return t.startsWith("http") ? t : `https://${t}`;
}

function creditAvatarSrc(credit: BuildingCreditWithEntities): string | undefined {
  return getStorageAssetUrl(credit.person?.avatarUrl ?? credit.company?.logoUrl);
}

function creditInitials(credit: BuildingCreditWithEntities): string {
  const name = credit.person?.name ?? credit.company?.name ?? "?";
  return name.slice(0, 2).toUpperCase();
}

function EntityLinks({
  credit,
  linkClassName,
}: {
  credit: BuildingCreditWithEntities;
  linkClassName?: string;
}) {
  const { person, company } = credit;
  if (!person && !company) {
    return <span className="text-text-secondary">Unknown entity</span>;
  }
  const linkCls = cn(
    "font-medium text-text-primary underline-offset-4 hover:underline",
    linkClassName,
  );
  return (
    <span className="flex flex-wrap items-baseline gap-x-1">
      {person ? (
        <Link to={`/person/${person.slug}`} className={linkCls}>
          {person.name}
        </Link>
      ) : null}
      {person && company ? <span className="text-text-secondary">@</span> : null}
      {company ? (
        <Link to={`/company/${company.slug}`} className={linkCls}>
          {company.name}
        </Link>
      ) : null}
    </span>
  );
}

function CreditFlagFormFields({
  reason,
  onReasonChange,
  notes,
  onNotesChange,
  disabled,
}: {
  reason: FlagReason | null;
  onReasonChange: (r: FlagReason) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium text-text-primary">Reason</legend>
        <div className="space-y-2">
          {FLAG_REASON_OPTIONS.map(({ value, label }) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 text-sm text-text-primary"
            >
              <input
                type="radio"
                name="credit-flag-reason"
                value={value}
                checked={reason === value}
                disabled={disabled}
                onChange={() => onReasonChange(value)}
                className="h-4 w-4 shrink-0 accent-brand-primary"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="space-y-2">
        <Label htmlFor="credit-flag-notes" className="text-text-primary">
          Notes <span className="font-normal text-text-secondary">(optional)</span>
        </Label>
        <Textarea
          id="credit-flag-notes"
          value={notes}
          disabled={disabled}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Add context for reviewers"
          maxLength={10000}
          className="min-h-20 resize-y"
        />
      </div>
    </div>
  );
}

function CreditFlagTrigger({
  creditId,
  buildingId,
  show,
  onReported,
}: {
  creditId: string;
  buildingId: string;
  show: boolean;
  onReported: () => void;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<FlagReason | null>(null);
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => {
      if (reason == null) {
        throw new Error("CreditFlagTrigger: missing reason");
      }
      return flagCredit(creditId, reason, notes.trim() || null);
    },
    onSuccess: () => {
      onReported();
      void queryClient.invalidateQueries({ queryKey: buildingCreditsQueryKey(buildingId) });
      toast({ title: "Credit reported — we'll review it" });
      setOpen(false);
      setNotes("");
      setReason(null);
    },
    onError: () => {
      toast({ variant: "destructive", title: "Could not send report" });
    },
  });

  if (!show) return null;

  const fields = (
    <CreditFlagFormFields
      reason={reason}
      onReasonChange={setReason}
      notes={notes}
      onNotesChange={setNotes}
      disabled={mutation.isPending}
    />
  );

  const actions = (
    <div className="mt-4 flex justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={mutation.isPending}
        onClick={() => setOpen(false)}
      >
        Cancel
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={mutation.isPending}
        onClick={() => {
          if (reason == null) {
            toast({ variant: "destructive", description: "Select a reason before submitting." });
            return;
          }
          mutation.mutate();
        }}
      >
        {mutation.isPending ? "Sending…" : "Submit report"}
      </Button>
    </div>
  );

  const triggerButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0 text-text-disabled hover:text-text-secondary"
      aria-label="Report issue with this credit"
    >
      <Flag className="h-3.5 w-3.5" aria-hidden />
    </Button>
  );

  if (isMobile) {
    return (
      <>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-text-disabled hover:text-text-secondary"
          aria-label="Report issue with this credit"
          onClick={() => setOpen(true)}
        >
          <Flag className="h-3.5 w-3.5" aria-hidden />
        </Button>
        <Sheet
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) {
              setNotes("");
              setReason(null);
            }
          }}
        >
          <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-none [&_button]:!rounded-none">
            <SheetHeader>
              <SheetTitle>Report credit</SheetTitle>
              <SheetDescription>
                Flag incorrect information. We review every report.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              {fields}
              {actions}
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setNotes("");
          setReason(null);
        }
      }}
    >
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      <PopoverContent className="w-80 rounded-none [&_button]:!rounded-none" align="end" sideOffset={8}>
        <p className="mb-4 text-sm text-text-secondary">Flag incorrect information. We review every report.</p>
        {fields}
        {actions}
      </PopoverContent>
    </Popover>
  );
}

function BuildingCreditRow({
  credit,
  className,
  buildingId,
  sessionFlaggedIds,
  onFlagSessionMarked,
  variant = "default",
}: {
  credit: BuildingCreditWithEntities;
  className?: string;
  buildingId: string;
  sessionFlaggedIds: Set<string>;
  onFlagSessionMarked: (creditId: string) => void;
  variant?: "default" | "spotlight";
}) {
  const years = yearRangeText(credit);
  const roleLabel = formatCreditRoleLabel(credit.role, credit.roleCustom);
  const project = credit.projectUrl?.trim() ?? "";
  const showFlag =
    credit.status !== "flagged" &&
    credit.status !== "hidden" &&
    !sessionFlaggedIds.has(credit.id);

  const avatarSrc = creditAvatarSrc(credit);
  const initials = creditInitials(credit);
  const isSpotlight = variant === "spotlight";

  return (
    <div
      className={cn(
        isSpotlight
          ? "rounded-none border border-border-default bg-surface-card p-8 lg:p-10 shadow-sm"
          : "rounded-none border border-border-default bg-surface-card p-4 shadow-sm",
        className,
      )}
    >
      <div
        className={cn(
          "flex gap-3",
          isSpotlight && "flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-6",
        )}
      >
        <Avatar
          className={cn(
            "shrink-0 rounded-none ring-1 ring-border-tertiary",
            isSpotlight ? "mt-0 h-20 w-20 ring-2 ring-border-default" : "mt-0.5 h-9 w-9",
          )}
        >
          <AvatarImage src={avatarSrc} alt={initials} />
          <AvatarFallback
            className={cn("rounded-none font-medium", isSpotlight ? "text-lg" : "text-xs")}
          >
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 w-full">
          <div
            className={cn(
              "flex flex-wrap items-start justify-between gap-2",
              isSpotlight && "sm:flex-nowrap",
            )}
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              {isSpotlight ? (
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-text-secondary w-full sm:text-left">
                  {roleLabel}
                </p>
              ) : null}
              <div
                className={cn(
                  "flex flex-wrap items-center gap-x-2 gap-y-0.5",
                  isSpotlight && "justify-center sm:justify-start",
                )}
              >
                <EntityLinks
                  credit={credit}
                  linkClassName={
                    isSpotlight ? "text-xl font-semibold tracking-tight sm:text-2xl" : undefined
                  }
                />
                {credit.isLead ? (
                  <span className="text-2xs font-medium uppercase tracking-widest text-text-secondary">
                    Lead
                  </span>
                ) : null}
                {credit.status === "verified" ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex shrink-0" tabIndex={0}>
                        <BadgeCheck
                          className={cn(
                            "text-text-primary",
                            isSpotlight ? "h-5 w-5" : "h-4 w-4",
                          )}
                          aria-label="Verified credit"
                        />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Verified credit</TooltipContent>
                  </Tooltip>
                ) : null}
                {credit.status === "flagged" ? (
                  <span className="text-2xs font-medium uppercase tracking-widest text-destructive">
                    Flagged
                  </span>
                ) : null}
              </div>
              {!isSpotlight ? (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-xs text-text-secondary">{roleLabel}</span>
                  {years ? (
                    <>
                      <span className="text-text-disabled">·</span>
                      <span className="text-xs text-text-secondary">{years}</span>
                    </>
                  ) : null}
                </div>
              ) : years ? (
                <p className="text-sm text-text-secondary tabular-nums">{years}</p>
              ) : null}
              {credit.contributionNotes?.trim() ? (
                <p
                  className={cn(
                    "leading-relaxed text-text-secondary",
                    isSpotlight ? "text-base max-w-xl mx-auto sm:mx-0" : "text-sm",
                  )}
                >
                  {credit.contributionNotes.trim()}
                </p>
              ) : null}
            </div>
            <div
              className={cn(
                "flex shrink-0 items-center gap-0.5",
                isSpotlight && "justify-center sm:justify-end w-full sm:w-auto pt-2 sm:pt-0",
              )}
            >
              {project ? (
                <a
                  href={projectHref(project)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center text-text-disabled hover:text-text-secondary"
                  aria-label="Open project link"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              ) : null}
              <CreditFlagTrigger
                creditId={credit.id}
                buildingId={buildingId}
                show={showFlag}
                onReported={() => onFlagSessionMarked(credit.id)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TierRoleSections({
  tier,
  credits,
  buildingId,
  sessionFlaggedIds,
  onFlagSessionMarked,
  showTierHeading = true,
}: {
  tier: CreditTier;
  credits: BuildingCreditWithEntities[];
  buildingId: string;
  sessionFlaggedIds: Set<string>;
  onFlagSessionMarked: (creditId: string) => void;
  showTierHeading?: boolean;
}) {
  if (credits.length === 0) return null;
  const byRole = groupTierByRole(credits);
  const tierTitle = `${tierHeadingLabel(tier)} credits`;
  const isContributorPanel = tier === "contributor";

  const inner = (
    <>
      {showTierHeading ? (
        <header className="mb-6 space-y-2">
          <h3 className="text-[10px] font-medium uppercase tracking-[0.22em] text-text-secondary">
            {tierTitle}
          </h3>
          <p className="max-w-xl text-sm leading-relaxed text-text-secondary">
            {tierShortDescription(tier)}
          </p>
        </header>
      ) : null}
      <div className="space-y-8">
        {[...byRole.entries()].map(([role, rows]) => (
          <div key={role}>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-primary">
              {formatCreditRoleLabel(role, rows[0]?.roleCustom ?? null)}
            </h4>
            <div className="space-y-3">
              {rows.map((c) => (
                <BuildingCreditRow
                  key={c.id}
                  credit={c}
                  buildingId={buildingId}
                  sessionFlaggedIds={sessionFlaggedIds}
                  onFlagSessionMarked={onFlagSessionMarked}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <section className="first:mt-0 min-w-0" aria-label={tierTitle}>
      {isContributorPanel ? (
        <div className="rounded-none border border-border-default bg-surface-muted p-6 lg:p-8">
          {inner}
        </div>
      ) : (
        inner
      )}
    </section>
  );
}

export interface BuildingCreditsProps {
  credits: BuildingCreditWithEntities[];
  buildingId: string;
  /** When true, show "Add a credit" and open the submission sheet (`AddCreditForm`). */
  isAuthenticated: boolean;
  /** When true, include `status = flagged` rows and show a Flagged badge (building moderators). */
  isAdmin?: boolean;
  /** Used in the tab intro and empty state. */
  buildingName?: string | null;
}

function CreditsEmptyState({
  buildingName,
  isAuthenticated,
  onAddClick,
}: {
  buildingName?: string | null;
  isAuthenticated: boolean;
  onAddClick: () => void;
}) {
  return (
    <div className="flex flex-col items-center rounded-none border border-dashed border-border-strong bg-surface-muted/50 px-6 py-14 text-center lg:px-12 lg:py-20">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-none border border-border-default bg-surface-card shadow-sm"
        aria-hidden
      >
        <Users className="h-7 w-7 text-text-secondary" />
      </div>
      <h3 className="mt-6 font-display text-2xl font-bold tracking-tight text-text-primary">
        No credits listed yet
      </h3>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-text-secondary">
        {buildingName?.trim() ? (
          <>
            Be the first to name the architects, engineers, and collaborators behind{" "}
            <span className="font-medium text-text-primary">{buildingName.trim()}</span>.{" "}
          </>
        ) : (
          <>Be the first to record who designed and built this project. </>
        )}
        Credits link professionals to their work—tag colleagues so they can discover and share this
        building.
      </p>
      <div className="mt-8">
        {isAuthenticated ? (
          <Button type="button" variant="default" size="sm" className="h-10 px-6" onClick={onAddClick}>
            Add a credit
          </Button>
        ) : (
          <Link
            to="/login"
            className="text-xs font-medium uppercase tracking-widest text-text-primary transition-colors hover:text-text-secondary"
          >
            Sign in to add credits →
          </Link>
        )}
      </div>
    </div>
  );
}

export function BuildingCredits({
  credits,
  buildingId,
  isAuthenticated,
  isAdmin = false,
  buildingName,
}: BuildingCreditsProps) {
  const [ancillaryOpen, setAncillaryOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const visibleCredits = useMemo(
    () => (isAdmin ? credits : credits.filter((c) => c.status !== "flagged")),
    [credits, isAdmin],
  );
  const { primary, contributor, ancillary } = groupByTier(visibleCredits);
  const { sessionIds, markAndBump } = useSessionFlaggedCreditBump();

  const hasBothTiers = primary.length > 0 && contributor.length > 0;

  const spotlightCredit =
    visibleCredits.length === 1 && visibleCredits[0].creditTier !== "ancillary"
      ? visibleCredits[0]
      : null;

  const addCreditFooter =
    isAuthenticated && visibleCredits.length > 0 ? (
      <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-border-default pt-8 lg:mt-12 lg:pt-10">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="uppercase tracking-widest"
          onClick={() => setAddOpen(true)}
        >
          Add a credit
        </Button>
      </div>
    ) : null;

  return (
    <section
      id="full-credits"
      className="scroll-mt-24"
      aria-labelledby="building-credits-heading"
    >
      <header className="mb-10 lg:mb-14">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-text-secondary">
          Project team
        </p>
        <h2
          id="building-credits-heading"
          className="mt-2 font-display text-3xl font-bold tracking-tight text-text-primary sm:text-4xl"
        >
          Credits
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-text-secondary">
          Everyone who shaped this building—designers, engineers, makers, and advisors. Add names so
          collaborators get credit and can share this page with their networks.
        </p>
      </header>

      {visibleCredits.length === 0 ? (
        <CreditsEmptyState
          buildingName={buildingName}
          isAuthenticated={isAuthenticated}
          onAddClick={() => setAddOpen(true)}
        />
      ) : spotlightCredit ? (
        <>
          <section aria-label={`${tierHeadingLabel(spotlightCredit.creditTier)} credits`}>
            <BuildingCreditRow
              credit={spotlightCredit}
              buildingId={buildingId}
              sessionFlaggedIds={sessionIds}
              onFlagSessionMarked={markAndBump}
              variant="spotlight"
            />
          </section>
          {ancillary.length > 0 ? (
            <div className="mt-10 lg:mt-12">
              <Collapsible open={ancillaryOpen} onOpenChange={setAncillaryOpen}>
                <CollapsibleTrigger
                  type="button"
                  className="flex w-full items-center justify-between rounded-none border border-border-default bg-surface-muted px-4 py-4 text-left transition-colors hover:bg-surface-muted/80 lg:px-5"
                >
                  <span className="text-xs font-semibold uppercase tracking-widest text-text-primary">
                    More credits ({ancillary.length})
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform text-text-secondary",
                      ancillaryOpen && "rotate-180",
                    )}
                    aria-hidden
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pt-6">
                    <TierRoleSections
                      tier="ancillary"
                      credits={ancillary}
                      buildingId={buildingId}
                      sessionFlaggedIds={sessionIds}
                      onFlagSessionMarked={markAndBump}
                      showTierHeading={false}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          ) : null}
          {addCreditFooter}
        </>
      ) : (
        <>
          <div
            className={cn(
              "grid grid-cols-1 gap-12",
              hasBothTiers && "lg:grid-cols-2 lg:gap-x-12 xl:gap-x-16",
            )}
          >
            <TierRoleSections
              tier="primary"
              credits={primary}
              buildingId={buildingId}
              sessionFlaggedIds={sessionIds}
              onFlagSessionMarked={markAndBump}
            />
            <TierRoleSections
              tier="contributor"
              credits={contributor}
              buildingId={buildingId}
              sessionFlaggedIds={sessionIds}
              onFlagSessionMarked={markAndBump}
            />
          </div>
          {ancillary.length > 0 ? (
            <div className="mt-12">
              <Collapsible open={ancillaryOpen} onOpenChange={setAncillaryOpen}>
                <CollapsibleTrigger
                  type="button"
                  className="flex w-full items-center justify-between rounded-none border border-border-default bg-surface-muted px-4 py-4 text-left transition-colors hover:bg-surface-muted/80 lg:px-5"
                >
                  <span className="text-xs font-semibold uppercase tracking-widest text-text-primary">
                    More credits ({ancillary.length})
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform text-text-secondary",
                      ancillaryOpen && "rotate-180",
                    )}
                    aria-hidden
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pt-8">
                    <TierRoleSections
                      tier="ancillary"
                      credits={ancillary}
                      buildingId={buildingId}
                      sessionFlaggedIds={sessionIds}
                      onFlagSessionMarked={markAndBump}
                      showTierHeading={false}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          ) : null}
          {addCreditFooter}
        </>
      )}

      {isAuthenticated ? (
        <Sheet open={addOpen} onOpenChange={setAddOpen}>
          <SheetContent
            side="right"
            className="flex w-full flex-col overflow-hidden rounded-none sm:max-w-lg sm:px-6 [&_button]:!rounded-none [&_input]:!rounded-none [&_textarea]:!rounded-none"
          >
            {addOpen ? (
              <AddCreditForm
                buildingId={buildingId}
                buildingName={buildingName}
                existingCredits={credits}
                onRequestClose={() => setAddOpen(false)}
              />
            ) : null}
          </SheetContent>
        </Sheet>
      ) : null}
    </section>
  );
}


export interface BuildingCreditsPreviewProps {
  credits: BuildingCreditWithEntities[];
  /** Shows an "Add credit →" anchor when the user is signed in. */
  isAuthenticated?: boolean;
}

function CreditPreviewRow({
  credit,
  showLead,
}: {
  credit: BuildingCreditWithEntities;
  showLead: boolean;
}) {
  const { person, company } = credit;
  const primaryName = person?.name ?? company?.name ?? "Unknown";
  const avatarSrc = creditAvatarSrc(credit);
  const initials = creditInitials(credit);

  return (
    <div className="flex items-center gap-2.5">
      <Avatar className="h-7 w-7 shrink-0 rounded-none ring-1 ring-border-tertiary">
        <AvatarImage src={avatarSrc} alt={primaryName} />
        <AvatarFallback className="rounded-none text-[10px] font-medium">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-1">
        {person ? (
          <Link
            to={`/person/${person.slug}`}
            className="text-sm font-medium text-text-primary underline-offset-4 hover:underline"
          >
            {person.name}
          </Link>
        ) : null}
        {person && company ? <span className="text-xs text-text-secondary">@</span> : null}
        {company ? (
          <Link
            to={`/company/${company.slug}`}
            className="text-sm font-medium text-text-primary underline-offset-4 hover:underline"
          >
            {company.name}
          </Link>
        ) : null}
        {!person && !company ? (
          <span className="text-sm text-text-secondary">Unknown</span>
        ) : null}
        {showLead && credit.isLead ? (
          <span className="text-2xs font-medium uppercase tracking-widest text-text-disabled">
            Lead
          </span>
        ) : null}
        {credit.status === "verified" ? (
          <BadgeCheck className="h-3 w-3 shrink-0 self-center text-text-primary" aria-label="Verified" />
        ) : null}
      </div>
    </div>
  );
}

export function BuildingCreditsPreview({
  credits,
  isAuthenticated = false,
}: BuildingCreditsPreviewProps) {
  const visibleCredits = useMemo(
    () => credits.filter((c) => c.status !== "flagged" && c.status !== "hidden"),
    [credits],
  );

  // Group primary credits by role (preserving natural sort order)
  const primaryByRole = useMemo(() => {
    const primary = sortRowsInRole(visiblePrimaryCredits(visibleCredits));
    const map = new Map<CreditRole, BuildingCreditWithEntities[]>();
    for (const c of primary) {
      const list = map.get(c.role) ?? [];
      list.push(c);
      map.set(c.role, list);
    }
    return [...map.entries()];
  }, [visibleCredits]);

  const totalCount = visibleCredits.length;
  const previewCount = primaryByRole.reduce((acc, [, rows]) => acc + rows.length, 0);
  const hiddenCount = Math.max(0, totalCount - previewCount);

  if (totalCount === 0) {
    return (
      <div>
        <p className="text-sm text-text-secondary">No credits listed yet.</p>
        {isAuthenticated ? (
          <a
            href="#full-credits"
            className="mt-3 block text-[10px] font-medium uppercase tracking-widest text-text-disabled transition-colors hover:text-text-primary"
          >
            Add credit →
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {primaryByRole.map(([role, roleCredits]) => (
        <div key={role}>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-text-secondary">
            {formatCreditRoleLabel(role, roleCredits[0]?.roleCustom ?? null)}
          </p>
          <div className="space-y-1.5">
            {roleCredits.map((credit) => (
              <CreditPreviewRow
                key={credit.id}
                credit={credit}
                showLead={roleCredits.length > 1}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <a
          href="#full-credits"
          className="text-[10px] font-medium uppercase tracking-widest text-text-disabled transition-colors hover:text-text-primary"
        >
          {hiddenCount > 0 ? `All ${totalCount} credits ↓` : "View credits ↓"}
        </a>
        {isAuthenticated ? (
          <>
            <span className="text-text-disabled" aria-hidden>·</span>
            <a
              href="#full-credits"
              className="text-[10px] font-medium uppercase tracking-widest text-text-disabled transition-colors hover:text-text-primary"
            >
              Add credit →
            </a>
          </>
        ) : null}
      </div>
    </div>
  );
}
