import { useState } from "react";
import { useAwardsByBuilding } from "../hooks/useAwards";
import { AwardRecipientCard } from "./AwardRecipientCard";
import { Trophy } from "lucide-react";
import { SuggestAwardButton } from "./SuggestAwardButton";
import { useAuth } from "@/features/auth/hooks/useAuth";

interface BuildingAwardsSectionProps {
  buildingId: string;
  buildingName: string;
}

export function BuildingAwardsSection({ buildingId, buildingName }: BuildingAwardsSectionProps) {
  const { data: awards = [], isLoading } = useAwardsByBuilding(buildingId);
  const [showAll, setShowAll] = useState(false);
  const { user } = useAuth();

  if (isLoading) return null;
  if (awards.length === 0 && !user) return null;

  const displayedAwards = showAll ? awards : awards.slice(0, 5);
  const hasMore = awards.length > 5;

  return (
    <section className="mt-12 border-t border-border-default pt-10">
      <div className="mb-6 flex items-center gap-3">
        <h2 className="text-xs font-medium uppercase tracking-widest text-text-secondary">
          Awards
        </h2>
        <Trophy className="w-3.5 h-3.5 text-text-secondary" />
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
