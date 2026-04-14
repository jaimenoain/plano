// src/features/buildings/components/BuildingContributorsSection.tsx

import { Link } from 'react-router';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { getStorageAssetUrl } from '@/utils/image';
import { useBuildingContributors } from '@/features/buildings/hooks/useBuildingContributors';

interface BuildingContributorsSectionProps {
  buildingId: string;
}

export function BuildingContributorsSection({ buildingId }: BuildingContributorsSectionProps) {
  const { data: entries, isLoading } = useBuildingContributors(buildingId);

  if (isLoading) {
    return (
      <section id="contributors" className="mt-12 border-t border-border-default px-4 pt-8 pb-12">
        <ContributorsSectionHeading />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <ContributorCardSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  if (!entries || entries.length === 0) return null;

  return (
    <section id="contributors" className="mt-12 border-t border-border-default px-4 pt-8 pb-12">
      <ContributorsSectionHeading />
      <div className="mt-4 grid grid-cols-2 gap-3">
        {entries.map((entry, i) => (
          <ContributorCard
            key={`${entry.role}-${entry.user.id}-${i}`}
            username={entry.user.username}
            avatarUrl={entry.user.avatarUrl}
            roleLabel={entry.label}
            detail={entry.detail}
          />
        ))}
      </div>
    </section>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ContributorsSectionHeading() {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
      Community contributors
    </p>
  );
}

interface ContributorCardProps {
  username:  string;
  avatarUrl: string | null;
  roleLabel: string;
  detail?:   string;
}

function ContributorCard({ username, avatarUrl, roleLabel, detail }: ContributorCardProps) {
  const initials = username.slice(0, 2).toUpperCase();
  const resolvedAvatarUrl = getStorageAssetUrl(avatarUrl);

  return (
    <Link
      to={`/profile/${username}`}
      className="group flex items-center gap-3 rounded-lg border border-border-tertiary bg-background-secondary px-3 py-3 no-underline transition-colors hover:border-border-secondary hover:bg-background-primary"
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={resolvedAvatarUrl} alt={username} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-text-tertiary">
          {roleLabel}
        </p>
        <p className="truncate text-sm font-medium text-text-primary">
          @{username}
        </p>
        {detail && (
          <p className="truncate font-mono text-[9px] uppercase tracking-[0.1em] text-text-tertiary">
            {detail}
          </p>
        )}
      </div>
    </Link>
  );
}

function ContributorCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-tertiary bg-background-secondary px-3 py-3">
      <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="h-3.5 w-28" />
      </div>
    </div>
  );
}
