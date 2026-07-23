
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RatingDots } from "@/components/ui/rating-dots";
import { AWARD_TIERS, MichelinRatingInput } from "@/components/ui/michelin-rating-input";
import { cn } from "@/lib/utils";

export type BuildingStatus = 'pending' | 'visited' | 'ignored' | null;

interface PersonalRatingButtonProps {
  buildingId: string;
  initialRating: number | null;
  onRate: (buildingId: string, rating: number) => void;
  status?: BuildingStatus;
  isLoading?: boolean; // Renamed from isPending for clarity
  label?: string;
  variant?: 'popover' | 'inline' | 'collapsible';
  /**
   * Optional callback to be notified when the popover opens/closes
   */
  onOpenChange?: (open: boolean) => void;
}

export function PersonalRatingButton({
  buildingId,
  initialRating,
  onRate,
  isLoading = false,
  label = "Rate",
  variant = 'popover',
  onOpenChange
}: PersonalRatingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };

  // If initialRating is provided, display it.
  const hasRated = initialRating !== null && initialRating > 0;

  // MichelinRatingInput's four tiers are discrete choices (0 = "Interesting" is a
  // real earned tier, not "unrated"), so there is no toggle-off-on-reclick affordance
  // here — that was specific to the old hand-rolled 3-circle picker's clear gesture.
  const handleChange = (value: number) => {
    onRate(buildingId, value);
    if (variant === 'popover' || variant === 'collapsible') {
      handleOpenChange(false);
    }
  };

  const ratingInput = (
    <MichelinRatingInput
      value={initialRating ?? 0}
      onChange={handleChange}
      disabled={isLoading}
    />
  );

  if (variant === 'inline') {
    return ratingInput;
  }

  // Collapsible: show only the chosen tier as a summary row that mirrors a
  // selected MichelinRatingInput row; clicking it expands the full four-tier
  // picker inline (no floating dropdown), and selecting collapses it again.
  if (variant === 'collapsible') {
    const selectedTier = AWARD_TIERS.find((t) => t.value === initialRating);

    return (
      <div className="relative">
        <AnimatePresence initial={false}>
          {isOpen ? (
            <motion.div
              key="editor"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="mb-1 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => handleOpenChange(false)}
                  className="inline-flex items-center gap-1 rounded-sm px-1 py-0.5 text-[10px] font-medium uppercase tracking-widest text-text-disabled transition-colors hover:text-text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-accent"
                >
                  <ChevronUp className="h-3 w-3" />
                  Done
                </button>
              </div>
              {ratingInput}
            </motion.div>
          ) : (
            <motion.button
              key="summary"
              type="button"
              aria-label="Edit rating"
              aria-expanded={false}
              disabled={isLoading}
              onClick={() => handleOpenChange(true)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className={cn(
                "group flex w-full items-center justify-between gap-4 rounded-sm border px-3 py-2 text-left transition-colors",
                "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                hasRated
                  ? "border-border-strong bg-surface-muted hover:bg-surface-muted"
                  : "border-dashed border-border-default bg-surface-card hover:bg-surface-muted",
              )}
            >
              {hasRated && selectedTier ? (
                <>
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-text-primary">
                      {selectedTier.label}
                    </span>
                    <span className="text-xs text-text-secondary">{selectedTier.hint}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="flex h-4 min-w-[3.25rem] items-center justify-end">
                      <RatingDots rating={initialRating} size="md" />
                    </span>
                    <Pencil className="h-3.5 w-3.5 shrink-0 text-text-disabled opacity-0 transition-opacity group-hover:opacity-100" />
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium text-text-secondary">
                    Rate this building
                  </span>
                  <Plus className="h-4 w-4 shrink-0 text-text-disabled" />
                </>
              )}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant={hasRated ? "default" : "ghost"}
          size="sm"
          className={`
            h-8 transition-all gap-1.5
            ${hasRated
              ? "bg-brand-primary/10 hover:bg-brand-primary/20 text-text-primary hover:text-text-primary border-brand-primary/20 border"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-muted"
            }
          `}
        >
          {hasRated ? (
            <RatingDots rating={initialRating} size="sm" />
          ) : (
            <span className="text-xs">{label}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="center" sideOffset={5}>
        {ratingInput}
      </PopoverContent>
    </Popover>
  );
}
