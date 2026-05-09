import { useState } from "react";
import { useAwardsByCompany } from "../hooks/useAwards";
import { AwardRecipientCard } from "./AwardRecipientCard";
import { Trophy } from "lucide-react";
import { SuggestAwardButton } from "./SuggestAwardButton";

interface CompanyAwardsSectionProps {
  companyId: string;
  companyName: string;
}

export function CompanyAwardsSection({ companyId, companyName }: CompanyAwardsSectionProps) {
  const { data: awards = [], isLoading } = useAwardsByCompany(companyId);
  const [showAll, setShowAll] = useState(false);

  // For Phase 2, show only company-type recipients
  const companyAwards = awards.filter(a => a.recipientType === 'company');

  if (isLoading) return null;
  if (companyAwards.length === 0) return null;

  const displayedAwards = showAll ? companyAwards : companyAwards.slice(0, 5);
  const hasMore = companyAwards.length > 5;

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
  );
}
