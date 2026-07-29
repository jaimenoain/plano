import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CompanyCreditWithBuilding, CreditRole, CreditTier } from "../types";
import { formatCreditRoleLabel } from "../formatCreditRole";
import { CompanyCreditCard } from "./CompanyCreditCard";

const ALL_ROLES = "__all__" as const;
type RoleFilter = typeof ALL_ROLES | CreditRole;

function tierLabel(tier: CreditTier): string {
  if (tier === "primary") return "Primary";
  if (tier === "contributor") return "Contributor";
  return "Additional";
}

/**
 * A practice is usually credited in several roles on the same buildings, so its
 * portfolio groups by role *inside* each tier — unlike the person page, which
 * groups by tier alone.
 */
function groupTierByRole(
  credits: CompanyCreditWithBuilding[],
): Map<CreditRole, CompanyCreditWithBuilding[]> {
  const map = new Map<CreditRole, CompanyCreditWithBuilding[]>();
  for (const c of credits) {
    const list = map.get(c.role) ?? [];
    list.push(c);
    map.set(c.role, list);
  }
  const roles = [...map.keys()].sort((a, b) =>
    formatCreditRoleLabel(a, null).localeCompare(formatCreditRoleLabel(b, null)),
  );
  const ordered = new Map<CreditRole, CompanyCreditWithBuilding[]>();
  for (const r of roles) {
    const items = map.get(r);
    if (items) ordered.set(r, items);
  }
  return ordered;
}

function RoleGroupedCreditsList({ credits }: { credits: CompanyCreditWithBuilding[] }) {
  if (credits.length === 0) return null;
  const byRole = groupTierByRole(credits);
  return (
    <div className="space-y-10">
      {[...byRole.entries()].map(([role, rows]) => (
        <div key={role}>
          <h3 className="mb-4 text-sm font-medium text-text-primary">
            {formatCreditRoleLabel(role, null)}
          </h3>
          <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-2">
            {rows.map((c) => (
              <CompanyCreditCard key={c.id} credit={c} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TierRoleSections({ tier, credits }: { tier: CreditTier; credits: CompanyCreditWithBuilding[] }) {
  if (credits.length === 0) return null;
  return (
    <section className="mt-16 first:mt-0">
      <h2 className="eyebrow mb-6 flex items-center justify-between border-b border-border-default pb-3 tracking-widest">
        <span>{tierLabel(tier)} credits</span>
        <span className="meta-code text-text-disabled">{String(credits.length).padStart(2, "0")}</span>
      </h2>
      <RoleGroupedCreditsList credits={credits} />
    </section>
  );
}

/** Portfolio tab body: a role filter over credits grouped by tier, ancillary collapsed. */
export function CompanyPortfolioSection({ credits }: { credits: CompanyCreditWithBuilding[] }) {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>(ALL_ROLES);
  const [ancillaryOpen, setAncillaryOpen] = useState(false);

  const roleOptions = useMemo(() => {
    const set = new Set<CreditRole>();
    for (const c of credits) set.add(c.role);
    return [...set].sort((a, b) =>
      formatCreditRoleLabel(a, null).localeCompare(formatCreditRoleLabel(b, null)),
    );
  }, [credits]);

  const filteredCredits = useMemo(
    () => (roleFilter === ALL_ROLES ? credits : credits.filter((c) => c.role === roleFilter)),
    [credits, roleFilter],
  );

  const byTier = useMemo(() => {
    const primary: CompanyCreditWithBuilding[] = [];
    const contributor: CompanyCreditWithBuilding[] = [];
    const ancillary: CompanyCreditWithBuilding[] = [];
    for (const c of filteredCredits) {
      if (c.creditTier === "primary") primary.push(c);
      else if (c.creditTier === "contributor") contributor.push(c);
      else ancillary.push(c);
    }
    return { primary, contributor, ancillary };
  }, [filteredCredits]);

  if (credits.length === 0) {
    return (
      <EmptyState
        eyebrow="No public credits yet"
        message="Buildings this practice is credited on will appear here."
      />
    );
  }

  return (
    <div>
      {roleOptions.length > 1 ? (
        <div className="mb-10 flex flex-col gap-1 sm:items-end">
          <span className="text-2xs font-medium uppercase tracking-widest text-text-secondary">Role</span>
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
            <SelectTrigger
              className="h-11 w-full border-border-default sm:w-56"
              aria-label="Filter credits by role"
            >
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_ROLES}>All roles</SelectItem>
              {roleOptions.map((r) => (
                <SelectItem key={r} value={r}>
                  {formatCreditRoleLabel(r, null)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {filteredCredits.length === 0 ? (
        <p className="text-sm text-text-secondary">No credits match this role.</p>
      ) : (
        <>
          <TierRoleSections tier="primary" credits={byTier.primary} />
          <TierRoleSections tier="contributor" credits={byTier.contributor} />
          {byTier.ancillary.length > 0 ? (
            <section className="mt-16 first:mt-0">
              <Collapsible open={ancillaryOpen} onOpenChange={setAncillaryOpen}>
                <CollapsibleTrigger
                  type="button"
                  className="flex min-h-[44px] w-full items-center justify-between border-b border-border-default py-3 text-left text-xs font-medium uppercase tracking-widest text-text-secondary hover:text-text-primary"
                >
                  <span>Additional credits ({byTier.ancillary.length})</span>
                  <ChevronDown
                    className={cn("h-4 w-4 shrink-0 transition-transform", ancillaryOpen && "rotate-180")}
                    aria-hidden
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pt-4">
                    <RoleGroupedCreditsList credits={byTier.ancillary} />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
