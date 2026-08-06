import { useCallback, useReducer, useMemo, useState } from "react";
import { Link } from "react-router";
import { ExternalLink, ChevronDown, BadgeCheck, NotebookPen, ImageIcon, Pencil } from "lucide-react";
import {
  AddCreditForm,
  CreditNoteSheet,
  creditRoleGroup,
  EditCreditForm,
  formatCreditRoleLabel,
  markCreditFlaggedInSession,
  NotifyCreditedEntitiesStep,
  readSessionFlaggedCreditIds,
  visiblePrimaryCredits,
  type BuildingCreditWithEntities,
  type CreditRole,
  type CreditTier,
} from "@/features/credits";
import { CreditFlagTrigger } from "./CreditFlagTrigger";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getStorageAssetUrl } from "@/utils/image";
import { cn } from "@/lib/utils";

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

/**
 * Who may correct this credit — the client-side mirror of the
 * `building_credits_update` policy's open branch (20271202000000).
 *
 * Any signed-in member may edit an `active` credit, the same openness the rest
 * of the building record already has. A `verified` credit was confirmed by the
 * credited party and a `flagged`/`hidden` one is under moderation: those stay
 * with admins (and, via their own surfaces, claimed people and company
 * stewards, whom the client cannot identify from a credit row alone).
 *
 * The rule is necessarily stated twice — here and in SQL. If it changes, both
 * move together; `BuildingCredits.test.tsx` and the migration guard pin each side.
 */
export function canEditCredit(
  credit: BuildingCreditWithEntities,
  viewer: { currentUserId?: string | null; isAdmin?: boolean },
): boolean {
  if (viewer.isAdmin) return true;
  if (!viewer.currentUserId) return false;
  return credit.status === "active";
}

function tierHeadingLabel(tier: CreditTier): string {
  if (tier === "primary") return "Primary";
  if (tier === "contributor") return "Contributor";
  return "Additional";
}

function tierEyebrowLabel(tier: CreditTier): string {
  if (tier === "primary") return "Primary";
  if (tier === "contributor") return "Contributors";
  return "Additional";
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

interface RoleGroup {
  key: string;
  label: string;
  rows: BuildingCreditWithEntities[];
}

/**
 * Group a tier's credits by resolved role so each role heads exactly one ledger group.
 * Custom wordings that match a standard role merge into it (see `creditRoleGroup`).
 */
function groupTierByRoleLabel(credits: BuildingCreditWithEntities[]): RoleGroup[] {
  const map = new Map<string, RoleGroup>();
  for (const c of credits) {
    const { key, label } = creditRoleGroup(c.role, c.roleCustom);
    const group = map.get(key) ?? { key, label, rows: [] };
    group.rows.push(c);
    map.set(key, group);
  }
  return [...map.values()]
    .map((g) => ({ ...g, rows: sortRowsInRole(g.rows) }))
    .sort((a, b) => a.label.localeCompare(b.label));
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

function CreditLedgerEntry({
  credit,
  buildingId,
  buildingName,
  sessionFlaggedIds,
  onFlagSessionMarked,
  currentUserId,
  isAdmin,
  allCredits,
}: {
  credit: BuildingCreditWithEntities;
  buildingId: string;
  buildingName?: string | null;
  sessionFlaggedIds: Set<string>;
  onFlagSessionMarked: (creditId: string) => void;
  currentUserId?: string | null;
  isAdmin?: boolean;
  allCredits: BuildingCreditWithEntities[];
}) {
  const [noteSheetOpen, setNoteSheetOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const canEdit = canEditCredit(credit, { currentUserId, isAdmin });
  const years = yearRangeText(credit);
  const project = credit.projectUrl?.trim() ?? "";
  const showFlag =
    credit.status !== "flagged" &&
    credit.status !== "hidden" &&
    !sessionFlaggedIds.has(credit.id);

  // Show note CTA when the signed-in user submitted this credit.
  const isOwner = Boolean(currentUserId && credit.addedByUserId === currentUserId);

  return (
    <div className="group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <EntityLinks credit={credit} linkClassName="text-[15px]" />
          {credit.isLead ? (
            <span className="text-2xs font-medium uppercase tracking-widest text-text-secondary">
              Lead
            </span>
          ) : null}
          {credit.status === "verified" ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex shrink-0 self-center" tabIndex={0}>
                  <BadgeCheck className="h-4 w-4 text-text-primary" aria-label="Verified credit" />
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
          {years ? (
            <>
              <span className="text-text-disabled" aria-hidden>
                ·
              </span>
              <span className="text-sm tabular-nums text-text-secondary">{years}</span>
            </>
          ) : null}
        </div>
        <div className="-mt-1 flex shrink-0 items-center gap-0.5">
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
              {isOwner ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-text-disabled hover:text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={credit.note ? "Edit your note" : "Add a note about your work"}
                      onClick={() => setNoteSheetOpen(true)}
                    >
                      <NotebookPen className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {credit.note ? "Edit your note" : "Add a note about your work"}
                  </TooltipContent>
                </Tooltip>
              ) : null}
              {canEdit ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-text-disabled hover:text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Edit this credit"
                      onClick={() => setEditSheetOpen(true)}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit this credit</TooltipContent>
                </Tooltip>
              ) : null}
          <CreditFlagTrigger
            creditId={credit.id}
            buildingId={buildingId}
            show={showFlag}
            onReported={() => onFlagSessionMarked(credit.id)}
          />
        </div>
      </div>

      {credit.contributionNotes?.trim() ? (
        <p className="mt-1 text-sm leading-relaxed text-text-secondary">
          {credit.contributionNotes.trim()}
        </p>
      ) : null}

      {/* Inline note display */}
      {credit.note ? (
        <div className="mt-3 space-y-3 rounded-none border-l-2 border-border-default pl-4">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-text-disabled">
                  {isOwner ? "Your note" : "Note from the team"}
                </p>
                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-text-secondary">
                  {credit.note.content}
                </p>
              </div>
              {credit.note.imageUrls.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {credit.note.imageUrls.map((url) => (
                    <img
                      key={url}
                      src={getStorageAssetUrl(url) ?? url}
                      alt=""
                      className="h-20 w-20 rounded-none object-cover ring-1 ring-border-default"
                    />
                  ))}
                  <span className="flex items-center gap-1 text-xs text-text-disabled">
                    <ImageIcon className="h-3 w-3" aria-hidden />
                    {credit.note.imageUrls.length}
                  </span>
                </div>
              ) : null}
          {isOwner ? (
            <button
              type="button"
              onClick={() => setNoteSheetOpen(true)}
              className="text-xs text-text-disabled underline-offset-2 hover:text-text-secondary hover:underline"
            >
              Edit note
            </button>
          ) : null}
        </div>
      ) : isOwner ? (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setNoteSheetOpen(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-text-disabled underline-offset-2 hover:text-text-secondary hover:underline"
          >
            <NotebookPen className="h-3.5 w-3.5" aria-hidden />
            Add a note about your work
          </button>
        </div>
      ) : null}

      {/* Credit edit sheet */}
      {canEdit ? (
        <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
          <SheetContent
            side="right"
            className="flex w-full flex-col overflow-hidden rounded-none sm:max-w-lg sm:px-6 [&_button]:rounded-none! [&_input]:rounded-none! [&_textarea]:rounded-none!"
          >
            {editSheetOpen ? (
              <EditCreditForm
                credit={credit}
                buildingId={buildingId}
                existingCredits={allCredits}
                onRequestClose={() => setEditSheetOpen(false)}
              />
            ) : null}
          </SheetContent>
        </Sheet>
      ) : null}

      {/* Note edit sheet */}
      {isOwner ? (
        <Sheet open={noteSheetOpen} onOpenChange={setNoteSheetOpen}>
          <SheetContent
            side="right"
            className="flex w-full flex-col overflow-hidden rounded-none sm:max-w-lg sm:px-6 [&_button]:rounded-none! [&_textarea]:rounded-none!"
          >
            {noteSheetOpen ? (
              <CreditNoteSheet
                creditId={credit.id}
                buildingId={buildingId}
                buildingName={buildingName}
                creditRole={credit.role}
                creditRoleCustom={credit.roleCustom}
                existingNote={credit.note}
                onClose={() => setNoteSheetOpen(false)}
              />
            ) : null}
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}

function TierLedger({
  tier,
  credits,
  buildingId,
  buildingName,
  sessionFlaggedIds,
  onFlagSessionMarked,
  currentUserId,
  isAdmin,
  allCredits,
  showTierEyebrow = true,
}: {
  tier: CreditTier;
  credits: BuildingCreditWithEntities[];
  buildingId: string;
  buildingName?: string | null;
  sessionFlaggedIds: Set<string>;
  onFlagSessionMarked: (creditId: string) => void;
  currentUserId?: string | null;
  isAdmin?: boolean;
  allCredits: BuildingCreditWithEntities[];
  showTierEyebrow?: boolean;
}) {
  if (credits.length === 0) return null;
  const groups = groupTierByRoleLabel(credits);
  const tierTitle = `${tierHeadingLabel(tier)} credits`;

  return (
    <section className="min-w-0" aria-label={tierTitle}>
      {showTierEyebrow ? (
        <h3 className="mb-3 text-[10px] font-medium uppercase tracking-[0.15em] text-text-secondary">
          {tierEyebrowLabel(tier)}
        </h3>
      ) : null}
      <dl className="divide-y divide-border-default">
        {groups.map(({ key, label, rows }) => (
          <div
            key={key}
            className="grid grid-cols-[110px_1fr] items-baseline gap-4 py-3.5 sm:grid-cols-[140px_1fr] sm:gap-6"
          >
            <dt className="text-[11px] font-medium uppercase tracking-widest text-text-disabled">
              {label}
            </dt>
            <dd className="min-w-0 space-y-3">
              {rows.map((c) => (
                <CreditLedgerEntry
                  key={c.id}
                  credit={c}
                  buildingId={buildingId}
                  buildingName={buildingName}
                  sessionFlaggedIds={sessionFlaggedIds}
                  onFlagSessionMarked={onFlagSessionMarked}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  allCredits={allCredits}
                />
              ))}
            </dd>
          </div>
        ))}
      </dl>
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
  /** Signed-in user's id — used to identify credits that belong to the current user. */
  currentUserId?: string | null;
  /** Controlled open state for the add-credit sheet (optional; internal state used if omitted). */
  addOpen?: boolean;
  onAddOpenChange?: (open: boolean) => void;
  /** Suppress the built-in "Credits" heading when the host already renders one (Edit building). */
  hideHeading?: boolean;
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
  const name = buildingName?.trim();
  return (
    <EmptyState
      eyebrow="No credits listed yet"
      message={
        name
          ? `Be the first to name the architects, engineers, and collaborators behind ${name}.`
          : "Be the first to record who designed and built this project."
      }
      action={
        isAuthenticated ? (
          <button type="button" className="cta-link" onClick={onAddClick}>
            Add a credit
          </button>
        ) : (
          <Link to="/login" className="cta-link">
            Sign in to add credits
          </Link>
        )
      }
    />
  );
}

export function BuildingCredits({
  credits,
  buildingId,
  isAuthenticated,
  isAdmin = false,
  buildingName,
  currentUserId,
  addOpen: addOpenProp,
  onAddOpenChange,
  hideHeading = false,
}: BuildingCreditsProps) {
  const [ancillaryOpen, setAncillaryOpen] = useState(false);
  const [addOpenInternal, setAddOpenInternal] = useState(false);
  const addOpen = addOpenProp !== undefined ? addOpenProp : addOpenInternal;
  const setAddOpen = onAddOpenChange ?? setAddOpenInternal;
  // Non-null while the optional "email the people you credited" step is showing.
  // Reached from the success toast, never in the way of the save itself.
  const [notifyCreditIds, setNotifyCreditIds] = useState<string[] | null>(null);
  const visibleCredits = useMemo(
    () => (isAdmin ? credits : credits.filter((c) => c.status !== "flagged")),
    [credits, isAdmin],
  );
  const { primary, contributor, ancillary } = groupByTier(visibleCredits);
  const { sessionIds, markAndBump } = useSessionFlaggedCreditBump();

  // Tier eyebrows only earn their place when the list actually spans tiers.
  const multiTier = [primary, contributor, ancillary].filter((t) => t.length > 0).length > 1;

  const addCreditFooter =
    isAuthenticated && visibleCredits.length > 0 ? (
      <div className="mt-10 border-t border-border-default pt-8 lg:mt-12 lg:pt-10">
        <button type="button" className="cta-link" onClick={() => setAddOpen(true)}>
          Add a credit
        </button>
      </div>
    ) : null;

  return (
    <section
      id="full-credits"
      className="scroll-mt-24"
      aria-labelledby={hideHeading ? undefined : "building-credits-heading"}
    >
      {hideHeading ? null : (
        <header className="mb-8 flex items-baseline justify-between gap-6 border-b border-border-default pb-4">
          <h2 id="building-credits-heading" className="text-2xl font-semibold tracking-[-0.02em] text-text-primary md:text-[28px]">
            Credits
          </h2>
          {visibleCredits.length > 0 ? (
            <span className="eyebrow tracking-[0.15em]">{visibleCredits.length} {visibleCredits.length === 1 ? "credit" : "credits"}</span>
          ) : null}
        </header>
      )}

      {visibleCredits.length === 0 ? (
        <CreditsEmptyState
          buildingName={buildingName}
          isAuthenticated={isAuthenticated}
          onAddClick={() => setAddOpen(true)}
        />
      ) : (
        <>
          <div className="space-y-12 lg:space-y-16">
            <TierLedger
              tier="primary"
              credits={primary}
              buildingId={buildingId}
              buildingName={buildingName}
              sessionFlaggedIds={sessionIds}
              onFlagSessionMarked={markAndBump}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              allCredits={visibleCredits}
              showTierEyebrow={multiTier}
            />
            <TierLedger
              tier="contributor"
              credits={contributor}
              buildingId={buildingId}
              buildingName={buildingName}
              sessionFlaggedIds={sessionIds}
              onFlagSessionMarked={markAndBump}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              allCredits={visibleCredits}
              showTierEyebrow={multiTier}
            />
          </div>
          {ancillary.length > 0 ? (
            <div className={cn((primary.length > 0 || contributor.length > 0) && "mt-12")}>
              <Collapsible open={ancillaryOpen} onOpenChange={setAncillaryOpen}>
                <CollapsibleTrigger
                  type="button"
                  className="group flex w-full items-center justify-between border-t border-border-default py-4 text-left"
                >
                  <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-text-secondary transition-colors group-hover:text-text-primary">
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
                  <div className="pt-2">
                    <TierLedger
                      tier="ancillary"
                      credits={ancillary}
                      buildingId={buildingId}
                      buildingName={buildingName}
                      sessionFlaggedIds={sessionIds}
                      onFlagSessionMarked={markAndBump}
                      currentUserId={currentUserId}
                      isAdmin={isAdmin}
                      allCredits={visibleCredits}
                      showTierEyebrow={false}
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
        <>
          <Sheet open={addOpen} onOpenChange={setAddOpen}>
            <SheetContent
              side="right"
              className="flex w-full flex-col overflow-hidden rounded-none sm:max-w-lg sm:px-6 [&_button]:rounded-none! [&_input]:rounded-none! [&_textarea]:rounded-none!"
            >
              {addOpen ? (
                <AddCreditForm
                  buildingId={buildingId}
                  existingCredits={credits}
                  onSaved={() => setAddOpen(false)}
                  onRequestNotify={(creditIds) => {
                    setAddOpen(false);
                    setNotifyCreditIds(creditIds);
                  }}
                />
              ) : null}
            </SheetContent>
          </Sheet>

          <Sheet
            open={notifyCreditIds !== null}
            onOpenChange={(next) => {
              if (!next) setNotifyCreditIds(null);
            }}
          >
            <SheetContent
              side="right"
              className="flex w-full flex-col overflow-hidden rounded-none sm:max-w-lg sm:px-6 [&_button]:rounded-none! [&_input]:rounded-none! [&_textarea]:rounded-none!"
            >
              {notifyCreditIds !== null ? (
                <NotifyCreditedEntitiesStep
                  creditIds={notifyCreditIds}
                  buildingId={buildingId}
                  buildingName={buildingName}
                  onRequestClose={() => setNotifyCreditIds(null)}
                />
              ) : null}
            </SheetContent>
          </Sheet>
        </>
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
