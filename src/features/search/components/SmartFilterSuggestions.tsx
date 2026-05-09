import { useMemo } from "react";
import { useTaxonomy } from "@/hooks/useTaxonomy";
import {
  suggestSmartFilters,
  type SmartSuggestion,
} from "@/features/search/utils/smartFilterSuggestions";
import type { PersonSummary, CompanySummary } from "@/features/credits/types";

interface SmartFilterSuggestionsProps {
  query: string;
  people: PersonSummary[];
  companies: CompanySummary[];
  /**
   * Called after a chip is applied. Lets the parent clear the search input so
   * the page transitions from Find mode into filtered Browse mode.
   */
  onApplied?: () => void;
}

const APPLY_EVENT = "plano:apply-smart-filter";

interface ApplyEventDetail {
  key: "category" | "typology" | "attribute" | "person" | "creditCompany";
  value: string | { id: string; name: string };
}

/**
 * Phase 4 — surfaces clickable filter chips above search results when the
 * user's query matches a known taxonomy value or top entity result. Clicking
 * a chip applies the filter and clears the query, switching from Find mode
 * to filtered Browse mode.
 *
 * Why an event, not direct state manipulation: the canonical owner of filter
 * URL state is `useBuildingSearch` (mounted in `FilterDrawer`), which lives
 * outside this component's tree. Writing URL params directly here loses to
 * `useBuildingSearch`'s sync effect, which clears any param it doesn't know
 * about from its local state. Dispatching to that hook keeps it the source
 * of truth.
 */
export function SmartFilterSuggestions({
  query,
  people,
  companies,
  onApplied,
}: SmartFilterSuggestionsProps) {
  const { functionalCategories, functionalTypologies, attributes } = useTaxonomy();

  const suggestions = useMemo(
    () =>
      suggestSmartFilters({
        query,
        taxonomy: { functionalCategories, functionalTypologies, attributes },
        people,
        companies,
      }),
    [query, functionalCategories, functionalTypologies, attributes, people, companies],
  );

  if (suggestions.length === 0) return null;

  const handleApply = (s: SmartSuggestion) => {
    window.dispatchEvent(
      new CustomEvent<ApplyEventDetail>(APPLY_EVENT, { detail: buildEventDetail(s) }),
    );
    onApplied?.();
  };

  return (
    <div className="px-4 pt-4 pb-2">
      <p className="text-2xs font-medium tracking-widest uppercase text-text-secondary mb-2">
        Filter by
      </p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => handleApply(s)}
            className="inline-flex items-center gap-1.5 border border-border-default bg-surface-card px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface-muted/60 transition-colors"
          >
            <span>{s.label}</span>
            {s.count != null && (
              <span className="text-text-disabled">({s.count})</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function buildEventDetail(s: SmartSuggestion): ApplyEventDetail {
  switch (s.apply.key) {
    case "category":
      return { key: "category", value: s.apply.value };
    case "typologies":
      return { key: "typology", value: s.apply.value };
    case "attributes":
      return { key: "attribute", value: s.apply.value };
    case "people":
      return { key: "person", value: s.apply.value };
    case "creditCompany":
      return { key: "creditCompany", value: s.apply.value };
  }
}
