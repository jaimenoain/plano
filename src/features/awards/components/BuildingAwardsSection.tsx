import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAwardsByBuilding } from "../hooks/useAwards";
import { AwardRecipientCard } from "./AwardRecipientCard";
import { SuggestAwardButton } from "./SuggestAwardButton";

interface BuildingAwardsSectionProps {
  buildingId: string;
  buildingName: string;
  /**
   * `"rail"` (default) keeps the compact micro-label head used inside the
   * right-rail info module. `"feature"` renders the main-column section-head
   * grammar (28px semibold + count eyebrow + hairline rule) for the Info tab.
   */
  variant?: "rail" | "feature";
}

export function BuildingAwardsSection({
  buildingId,
  buildingName,
  variant = "rail",
}: BuildingAwardsSectionProps) {
  const { data: awards = [], isLoading } = useAwardsByBuilding(buildingId);
  const [showAll, setShowAll] = useState(false);

  if (isLoading) return null;
  if (awards.length === 0) return null;

  const displayedAwards = showAll ? awards : awards.slice(0, 5);
  const hasMore = awards.length > 5;

  return (
    <section className={cn(variant === "rail" && "py-8")}>
      {variant === "feature" ? (
        <div className="mb-8 flex items-baseline justify-between border-b border-border-default pb-4">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] text-text-primary md:text-[28px]">
            Awards
          </h2>
          <span className="eyebrow tracking-[0.15em]">
            {awards.length} {awards.length === 1 ? "award" : "awards"}
          </span>
        </div>
      ) : (
        <div className="mb-6 flex items-center gap-3">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
            Awards
          </h2>
        </div>
      )}

      <div className="divide-y divide-border-default">
        {displayedAwards.map((award) => (
          <AwardRecipientCard
            key={award.id}
            recipient={award}
            showAwardName
          />
        ))}
      </div>

      {hasMore && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-6 text-xs font-medium uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors"
        >
          Show all {awards.length} awards →
        </button>
      )}

      <div className="mt-8">
        <SuggestAwardButton
          recipientType="building"
          recipientId={buildingId}
          recipientName={buildingName}
        />
      </div>
    </section>
  );
}
