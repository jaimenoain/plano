import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { PersonCreditWithBuilding } from "../types";
import { PersonCreditCard } from "./PersonCreditCard";

function tierLabel(tier: "primary" | "contributor" | "ancillary"): string {
  if (tier === "primary") return "Primary";
  if (tier === "contributor") return "Contributor";
  return "Additional";
}

function groupByTier(credits: PersonCreditWithBuilding[]) {
  const primary: PersonCreditWithBuilding[] = [];
  const contributor: PersonCreditWithBuilding[] = [];
  const ancillary: PersonCreditWithBuilding[] = [];
  for (const c of credits) {
    if (c.creditTier === "primary") primary.push(c);
    else if (c.creditTier === "contributor") contributor.push(c);
    else ancillary.push(c);
  }
  return { primary, contributor, ancillary };
}

function CreditTierSection({
  tier,
  credits,
}: {
  tier: "primary" | "contributor" | "ancillary";
  credits: PersonCreditWithBuilding[];
}) {
  if (credits.length === 0) return null;
  return (
    <section className="mt-16 first:mt-0">
      <h2 className="eyebrow mb-6 flex items-center justify-between border-b border-border-default pb-3 tracking-widest">
        <span>{tierLabel(tier)} credits</span>
        <span className="meta-code text-text-disabled">{String(credits.length).padStart(2, "0")}</span>
      </h2>
      <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-2">
        {credits.map((c) => (
          <PersonCreditCard key={c.id} credit={c} />
        ))}
      </div>
    </section>
  );
}

/** Portfolio tab body: credits grouped by tier, ancillary collapsed. */
export function PersonPortfolioSection({ credits }: { credits: PersonCreditWithBuilding[] }) {
  const [ancillaryOpen, setAncillaryOpen] = useState(false);
  const { primary, contributor, ancillary } = useMemo(() => groupByTier(credits), [credits]);

  if (credits.length === 0) {
    return (
      <EmptyState
        eyebrow="No public credits yet"
        message="Buildings this person is credited on will appear here."
      />
    );
  }

  return (
    <div>
      <CreditTierSection tier="primary" credits={primary} />
      <CreditTierSection tier="contributor" credits={contributor} />
      {ancillary.length > 0 ? (
        <section className="mt-16 first:mt-0">
          <Collapsible open={ancillaryOpen} onOpenChange={setAncillaryOpen}>
            <CollapsibleTrigger
              type="button"
              className="flex min-h-[44px] w-full items-center justify-between border-b border-border-default py-3 text-left text-xs font-medium uppercase tracking-widest text-text-secondary hover:text-text-primary"
            >
              <span>Additional credits ({ancillary.length})</span>
              <ChevronDown
                className={cn("h-4 w-4 shrink-0 transition-transform", ancillaryOpen && "rotate-180")}
                aria-hidden
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pt-4">
                {ancillary.map((c) => (
                  <PersonCreditCard key={c.id} credit={c} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </section>
      ) : null}
    </div>
  );
}
