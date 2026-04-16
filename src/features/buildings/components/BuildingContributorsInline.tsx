// src/features/buildings/components/BuildingContributorsInline.tsx

import { Skeleton } from '@/components/ui/skeleton';
import { useBuildingContributors } from '@/features/buildings/hooks/useBuildingContributors';
import type { ContributorUser } from '@/features/buildings/api/contributors';

const MAX_NAMED = 3;

interface BuildingContributorsInlineProps {
  buildingId: string;
}

export function BuildingContributorsInline({ buildingId }: BuildingContributorsInlineProps) {
  const { data: entries, isLoading } = useBuildingContributors(buildingId);

  if (isLoading) {
    return <Skeleton className="mt-1 h-3 w-48" />;
  }

  if (!entries || entries.length === 0) return null;

  // Deduplicate: one entry per user, preserving first-seen order.
  const seen = new Set<string>();
  const users: ContributorUser[] = [];
  for (const entry of entries) {
    if (!seen.has(entry.user.id)) {
      seen.add(entry.user.id);
      users.push(entry.user);
    }
  }

  const named = users.slice(0, MAX_NAMED);
  const remaining = users.length - named.length;

  function formatNames() {
    const names = named.map((u) => u.username);
    if (remaining > 0) {
      return `${names.join(", ")} and ${remaining} ${remaining === 1 ? "other" : "others"}`;
    }
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  }

  return (
    <a
      href="#contributors"
      className="group inline-block text-xs text-text-disabled transition-colors hover:text-text-secondary"
    >
      Thank you {formatNames()}
    </a>
  );
}
