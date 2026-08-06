import { CreditedEntitiesSelect, type CreditedEntityTag } from "@/features/credits";
import { ArchitectStatement } from "./ArchitectStatement";
import { BuildingFormSection, BuildingFormLabel } from "./building-form-ui";

interface DesignCreditsSectionProps {
  /** Hidden on the Edit building page, which manages credits in its own ledger (Task 2.5). */
  showPicker: boolean;
  selected: CreditedEntityTag[];
  onSelectedChange: (next: CreditedEntityTag[]) => void;
  /** The signed-in user is a verified architect credited on this building. */
  isVerifiedCreditClaim: boolean;
  architectStatement: string;
  onArchitectStatementChange: (next: string) => void;
}

/** Primary design credits, plus the statement a credited verified architect may write. */
export function DesignCreditsSection({
  showPicker,
  selected,
  onSelectedChange,
  isVerifiedCreditClaim,
  architectStatement,
  onArchitectStatementChange,
}: DesignCreditsSectionProps) {
  return (
    <BuildingFormSection title={showPicker ? "Design credits" : "Architect statement"}>
      {showPicker && (
        <div className="space-y-2">
          <BuildingFormLabel>Primary credits</BuildingFormLabel>
          <CreditedEntitiesSelect
            selected={selected}
            onChange={onSelectedChange}
            placeholder="Search people or companies…"
          />
          <p className="text-xs text-text-secondary">
            Add everyone who should appear as a primary design credit. Create a new person or company if needed.
          </p>
        </div>
      )}

      {isVerifiedCreditClaim && (
        <div className="space-y-2 border border-border-default rounded-sm p-4 bg-surface-muted/30">
          <ArchitectStatement
            statement={architectStatement}
            isEditing={true}
            onChange={onArchitectStatementChange}
          />
        </div>
      )}
    </BuildingFormSection>
  );
}
