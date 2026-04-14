// src/features/buildings/components/BuildingContributorsInline.tsx

import { Skeleton } from '@/components/ui/skeleton';
import { useBuildingContributors } from '@/features/buildings/hooks/useBuildingContributors';
import type { ContributorUser } from '@/features/buildings/api/contributors';

const MAX_VISIBLE = 4;

interface BuildingContributorsInlineProps {
  buildingId: string;
}

export function BuildingContributorsInline({ buildingId }: BuildingContributorsInlineProps) {
  const { data: entries, isLoading } = useBuildingContributors(buildingId);

  if (isLoading) {
    return (
      <div className="mt-4 px-4">
        <Skeleton className="h-4 w-64" />
      </div>
    );
  }

  if (!entries || entries.length === 0) return null;

  // Deduplicate: one entry per user, preserving first-seen order.
  const seen  = new Set<string>();
  const users: ContributorUser[] = [];
  for (const entry of entries) {
    if (!seen.has(entry.user.id)) {
      seen.add(entry.user.id);
      users.push(entry.user);
    }
  }

  const visible  = users.slice(0, MAX_VISIBLE);
  const overflow = users.length - MAX_VISIBLE;

  return (
    <a
      href="#contributors"
      className="group mt-4 flex items-baseline gap-1.5 px-4 py-1 no-underline hover:no-underline"
    >
      <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary transition-colors group-hover:text-text-secondary">
        Contributed by
      </span>
      <span className="min-w-0 font-mono text-[10px] uppercase tracking-[0.12em] text-text-secondary transition-colors group-hover:text-text-primary">
        {visible.map((user, i) => (
          <span key={user.id}>
            {i > 0 && <span className="text-text-tertiary">,&nbsp;</span>}
            <span className="transition-colors group-hover:text-text-primary">
              @{user.username}
            </span>
          </span>
        ))}
        {overflow > 0 && (
          <span className="text-text-tertiary">&nbsp;+{overflow} more</span>
        )}
      </span>
      <span
        aria-hidden="true"
        className="shrink-0 font-mono text-[10px] text-text-tertiary transition-colors group-hover:text-text-secondary"
      >
        →
      </span>
    </a>
  );
}
