/**
 * MyBuildingStatusBlock
 *
 * The one block that answers "where does this building stand with me?" — the
 * viewer's status (untouched / saved / visited / hidden) and the mark they gave
 * it — rendered identically on the building detail page and the building detail
 * drawer so the two surfaces cannot drift.
 *
 * Marks are AWARDS, not a score. This component never renders empty/outlined
 * slots, never numbers a choice, and never says "of 3": it delegates the whole
 * mark affordance to PersonalRatingButton → MichelinRatingInput, whose four
 * tiers are named (Interesting → Masterpiece) and show only earned dots.
 * See design-system/README.md and docs/DESIGN_TOKENS.md §10.
 *
 * Purely presentational: each surface keeps its own mutation hook
 * (useBuildingInteractions on the page, useBuildingStatusActions in the drawer)
 * and passes the resulting state back down, so changes appear without a reload.
 */
import { Bookmark, Check, Circle, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PersonalRatingButton } from "./PersonalRatingButton";

export type MyBuildingStatus = "visited" | "pending" | "ignored" | null;

interface MyBuildingStatusBlockProps {
  buildingId: string;
  status: MyBuildingStatus;
  rating: number | null;
  onStatusChange: (status: "visited" | "pending" | "ignored") => Promise<void> | void;
  onRate: (buildingId: string, rating: number) => Promise<void> | void;
  isSaving?: boolean;
  /** Spacing/type scale only — structure and copy are identical either way. */
  density?: "page" | "drawer";
}

const EYEBROW =
  "text-[11px] font-medium uppercase tracking-widest text-text-disabled";

function StatusToggle({
  active,
  disabled,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-10 items-center justify-center gap-2 border px-3 text-sm font-medium transition-colors",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "border-brand-primary bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover"
          : "border-border-default bg-surface-card text-text-primary hover:bg-surface-muted",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

export function MyBuildingStatusBlock({
  buildingId,
  status,
  rating,
  onStatusChange,
  onRate,
  isSaving = false,
  density = "page",
}: MyBuildingStatusBlockProps) {
  const isVisited = status === "visited";
  const isSaved = status === "pending";
  const isHidden = status === "ignored";
  const isTracked = isVisited || isSaved;

  const pad = density === "drawer" ? "p-3" : "p-4";
  const gap = density === "drawer" ? "space-y-3" : "space-y-4";

  return (
    <section
      aria-label="My status and mark"
      className={cn("border border-border-default bg-surface-card", pad, gap)}
    >
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className={EYEBROW}>My status</span>
          <span className="text-sm font-medium text-text-primary">
            {isVisited
              ? "Visited"
              : isSaved
                ? "Saved"
                : isHidden
                  ? "Hidden"
                  : "Not on your map"}
          </span>
        </div>

        {isHidden ? (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm text-text-secondary">
              <EyeOff className="h-4 w-4 shrink-0" aria-hidden />
              This building won&apos;t appear on your map or in suggestions.
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={isSaving}
              className="h-9 w-full text-[10px] font-bold uppercase tracking-wider"
              onClick={() => void onStatusChange("ignored")}
            >
              Unhide
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <StatusToggle
                active={isVisited}
                disabled={isSaving}
                onClick={() => void onStatusChange("visited")}
                icon={
                  <Check
                    className={cn("h-4 w-4 shrink-0", isVisited && "stroke-[3px]")}
                    aria-hidden
                  />
                }
                label="Visited"
              />
              <StatusToggle
                active={isSaved}
                disabled={isSaving}
                onClick={() => void onStatusChange("pending")}
                icon={
                  isSaved ? (
                    <Bookmark className="h-4 w-4 shrink-0 fill-current" aria-hidden />
                  ) : (
                    <Bookmark className="h-4 w-4 shrink-0" aria-hidden />
                  )
                }
                label={isSaved ? "Saved" : "Save"}
              />
            </div>
            {!isTracked && (
              <p className="flex items-center gap-2 text-xs text-text-secondary">
                <Circle className="h-3 w-3 shrink-0 text-text-disabled" aria-hidden />
                Save it for later, or mark it visited.
              </p>
            )}
            <Button
              variant="ghost"
              size="sm"
              disabled={isSaving}
              className="h-8 w-full justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-secondary hover:text-text-primary"
              onClick={() => void onStatusChange("ignored")}
            >
              <EyeOff className="h-3.5 w-3.5" aria-hidden />
              Hide from my map
            </Button>
          </>
        )}
      </div>

      {isTracked && (
        <div className="space-y-2 border-t border-border-default pt-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className={EYEBROW}>My mark</span>
            <span className="text-[10px] text-text-disabled">An honour, not a score</span>
          </div>
          <PersonalRatingButton
            variant="collapsible"
            buildingId={buildingId}
            initialRating={rating ?? 0}
            status={status}
            isLoading={isSaving}
            onRate={onRate}
          />
        </div>
      )}
    </section>
  );
}
