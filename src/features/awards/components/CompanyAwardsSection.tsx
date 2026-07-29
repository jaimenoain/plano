import { useState } from "react";
import { useAwardsByCompany } from "../hooks/useAwards";
import { AwardRecipientCard } from "./AwardRecipientCard";
import { SuggestAwardButton } from "./SuggestAwardButton";
import { AdministeredAwardsSection } from "./AdministeredAwardsSection";
import { EmptyState } from "@/components/ui/empty-state";

interface CompanyAwardsSectionProps {
  companyId: string;
  companyName: string;
}

/**
 * Awards tab body on the company page — the practice's wins as a divided
 * recipient list, then any awards it administers. Mirrors
 * `PersonAwardsSection`: no section chrome of its own, canonical empty state.
 */
export function CompanyAwardsSection({ companyId, companyName }: CompanyAwardsSectionProps) {
  const { data: awards = [], isLoading } = useAwardsByCompany(companyId);
  const [showAll, setShowAll] = useState(false);

  // Company-type recipients only; person recipients belong on person pages.
  const companyAwards = awards.filter((a) => a.recipientType === "company");

  if (isLoading) return null;

  if (companyAwards.length === 0) {
    return (
      <>
        <AdministeredAwardsSection companyId={companyId} />
        <EmptyState
          eyebrow="No awards yet"
          message="Awards and honors this practice receives will appear here."
          action={
            <SuggestAwardButton
              recipientType="company"
              recipientId={companyId}
              recipientName={companyName}
            />
          }
        />
      </>
    );
  }

  const displayedAwards = showAll ? companyAwards : companyAwards.slice(0, 5);
  const hasMore = companyAwards.length > 5;

  return (
    <>
      <section>
        <div className="divide-y divide-border-default">
          {displayedAwards.map((award) => (
            <AwardRecipientCard key={award.id} recipient={award} showAwardName />
          ))}
        </div>

        {hasMore && !showAll && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="mt-6 text-xs font-medium uppercase tracking-widest text-text-secondary transition-colors hover:text-text-primary"
          >
            Show all {companyAwards.length} awards →
          </button>
        )}

        <div className="mt-8">
          <SuggestAwardButton
            recipientType="company"
            recipientId={companyId}
            recipientName={companyName}
          />
        </div>
      </section>

      <AdministeredAwardsSection companyId={companyId} hasWinsAbove />
    </>
  );
}
