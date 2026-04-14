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
      <section id="contributors" className="mt-12 border-t border-border-default pt-10 pb-12">
        <p className="mb-6 text-[10px] font-medium uppercase tracking-widest text-text-secondary">
          Community contributors
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ContributorCardSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  if (!entries || entries.length === 0) return null;

  return (
    <section id="contributors" className="mt-12 border-t border-border-default pt-10 pb-12">
      <p className="mb-6 text-[10px] font-medium uppercase tracking-widest text-text-secondary">
        Community contributors
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
      <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border-tertiary transition-shadow group-hover:ring-border-secondary">
        <AvatarImage src={resolvedAvatarUrl} alt={username} />
        <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-widest text-text-secondary">
          {roleLabel}
        </p>
        <p className="truncate text-sm font-medium text-text-primary">
          @{username}
        </p>
        {detail && (
          <p className="truncate text-[10px] text-text-secondary">
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
      <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-3.5 w-24" />
      </div>
    </div>
  );
}
