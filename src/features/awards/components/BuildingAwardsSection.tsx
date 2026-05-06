import { useState } from "react";
import { useAwardsByBuilding } from "../hooks/useAwards";
import { AwardRecipientCard } from "./AwardRecipientCard";
import { SuggestAwardButton } from "./SuggestAwardButton";

interface BuildingAwardsSectionProps {
  buildingId: string;
  buildingName: string;
}

export function BuildingAwardsSection({ buildingId, buildingName }: BuildingAwardsSectionProps) {
  const { data: awards = [], isLoading } = useAwardsByBuilding(buildingId);
  const [showAll, setShowAll] = useState(false);

  if (isLoading) return null;
  if (awards.length === 0) return null;

  const displayedAwards = showAll ? awards : awards.slice(0, 5);
  const hasMore = awards.length > 5;

  return (
    <section className="py-8">
      <div className="mb-6 flex items-center gap-3">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
          Awards
        </h2>
      </div>

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
