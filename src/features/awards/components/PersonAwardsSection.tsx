import { useState } from "react";
import { useAwardsByPerson } from "../hooks/useAwards";
import { AwardRecipientCard } from "./AwardRecipientCard";
import { SuggestAwardButton } from "./SuggestAwardButton";
import { EmptyState } from "@/components/ui/empty-state";

interface PersonAwardsSectionProps {
  personId: string;
  personName: string;
}

/** Awards tab body on the person page — a divided recipient list, or the canonical empty state. */
export function PersonAwardsSection({ personId, personName }: PersonAwardsSectionProps) {
  const { data: awards = [], isLoading } = useAwardsByPerson(personId);
  const [showAll, setShowAll] = useState(false);

  const personAwards = awards.filter(a => a.recipientType === 'person');

  if (isLoading) return null;

  if (personAwards.length === 0) {
    return (
      <EmptyState
        eyebrow="No awards yet"
        message="Awards and honors this person receives will appear here."
        action={
          <SuggestAwardButton recipientType="person" recipientId={personId} recipientName={personName} />
        }
      />
    );
  }

  const displayedAwards = showAll ? personAwards : personAwards.slice(0, 5);
  const hasMore = personAwards.length > 5;

  return (
    <section>
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
