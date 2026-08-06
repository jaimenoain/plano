import { ChevronDown } from "lucide-react";
import { tierLabel, type CreditEntryRow } from "../addCreditFormRow";
import { CREDIT_TIERS } from "../api/credits";
import type { CreditTier } from "../types";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface CreditDetailsDisclosureProps {
  /** Namespaces the field ids — a row key when adding, a constant when editing. */
  idPrefix: string;
  row: CreditEntryRow;
  disabled: boolean;
  /** Rendered under the lead checkbox when another credit already leads this role. */
  leadHint: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatch: (next: Partial<CreditEntryRow>) => void;
}

/**
 * The credit fields that most people never touch, folded away behind one
 * trigger. Person, Company and Role stay in the open above this: naming an
 * architect is the common errand and it should cost three fields, not nine
 * (Roadmap Task 2.3).
 *
 * Shared by `AddCreditForm` and `EditCreditForm` so the two forms cannot drift.
 */
export function CreditDetailsDisclosure({
  idPrefix,
  row,
  disabled,
  leadHint,
  open,
  onOpenChange,
  onPatch,
}: CreditDetailsDisclosureProps) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger
        type="button"
        className="group flex w-full items-center justify-between border-t border-border-default py-3 text-left"
      >
        <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-text-secondary transition-colors group-hover:text-text-primary">
          {open ? "Hide details" : "Show more details"}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-text-secondary transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-tier`} className="text-text-primary">
              Credit tier
            </Label>
            <Select
              value={row.creditTier}
              disabled={disabled}
              onValueChange={(v) => onPatch({ creditTier: v as CreditTier })}
            >
              <SelectTrigger id={`${idPrefix}-tier`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CREDIT_TIERS.map((tier) => (
                  <SelectItem key={tier} value={tier}>
                    {tierLabel(tier)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id={`${idPrefix}-lead`}
              checked={row.isLead}
              disabled={disabled}
              onCheckedChange={(c) => onPatch({ isLead: c === true })}
            />
            <Label
              htmlFor={`${idPrefix}-lead`}
              className="cursor-pointer text-sm font-normal text-text-primary"
            >
              Lead for this role on this building
            </Label>
          </div>
          {leadHint ? <p className="text-sm text-text-secondary">{leadHint}</p> : null}

          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-notes`} className="text-text-primary">
              Contribution notes <span className="font-normal text-text-secondary">(max 500)</span>
            </Label>
            <Textarea
              id={`${idPrefix}-notes`}
              value={row.contributionNotes}
              disabled={disabled}
              onChange={(e) => onPatch({ contributionNotes: e.target.value })}
              maxLength={500}
              className="min-h-20 resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-yf`} className="text-text-primary">
                Year from
              </Label>
              <Input
                id={`${idPrefix}-yf`}
                inputMode="numeric"
                value={row.yearFrom}
                disabled={disabled}
                onChange={(e) => onPatch({ yearFrom: e.target.value })}
                placeholder="e.g. 2018"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-yt`} className="text-text-primary">
                Year to
              </Label>
              <Input
                id={`${idPrefix}-yt`}
                inputMode="numeric"
                value={row.yearTo}
                disabled={disabled}
                onChange={(e) => onPatch({ yearTo: e.target.value })}
                placeholder="e.g. 2020"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-url`} className="text-text-primary">
              Project URL <span className="font-normal text-text-secondary">(optional)</span>
            </Label>
            <Input
              id={`${idPrefix}-url`}
              value={row.projectUrl}
              disabled={disabled}
              onChange={(e) => onPatch({ projectUrl: e.target.value })}
              placeholder="https://…"
              maxLength={2000}
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
