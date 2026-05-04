import { useState } from "react";
import { useAwardsByPerson } from "../hooks/useAwards";
import { AwardRecipientCard } from "./AwardRecipientCard";
import { Trophy } from "lucide-react";
import { SuggestAwardButton } from "./SuggestAwardButton";
import { useAuth } from "@/features/auth/hooks/useAuth";

interface PersonAwardsSectionProps {
  personId: string;
  personName: string;
}

export function PersonAwardsSection({ personId, personName }: PersonAwardsSectionProps) {
  const { data: awards = [], isLoading } = useAwardsByPerson(personId);
  const [showAll, setShowAll] = useState(false);
  const { user } = useAuth();

  // For Phase 2, show only person-type recipients
  const personAwards = awards.filter(a => a.recipientType === 'person');

  if (isLoading) return null;
  if (personAwards.length === 0 && !user) return null;

  const displayedAwards = showAll ? personAwards : personAwards.slice(0, 5);
  const hasMore = personAwards.length > 5;

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
          Show all {personAwards.length} awards →
        </button>
      )}

      <div className="mt-8">
        <SuggestAwardButton 
          recipientType="person" 
          recipientId={personId} 
          recipientName={personName} 
        />
      </div>
    </section>
  );
}
