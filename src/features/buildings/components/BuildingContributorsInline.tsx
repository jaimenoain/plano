// src/features/buildings/components/BuildingContributorsInline.tsx

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { getStorageAssetUrl } from '@/utils/image';
import { useBuildingContributors } from '@/features/buildings/hooks/useBuildingContributors';
import type { ContributorUser } from '@/features/buildings/api/contributors';
import { cn } from '@/lib/utils';

const MAX_FACES = 5;

interface BuildingContributorsInlineProps {
  buildingId: string;
}

export function BuildingContributorsInline({ buildingId }: BuildingContributorsInlineProps) {
  const { data: entries, isLoading } = useBuildingContributors(buildingId);

  if (isLoading) {
    return (
      <div className="mt-4 flex items-center gap-2.5">
        <div className="flex items-center">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn("h-5 w-5 rounded-full ring-2 ring-background-primary", i > 0 && "-ml-1.5")}
            />
          ))}
        </div>
        <Skeleton className="h-2.5 w-24" />
      </div>
    );
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

  const visible = users.slice(0, MAX_FACES);
  const overflow = users.length - visible.length;

  return (
    <a
      href="#contributors"
      className="group mt-4 flex items-center gap-2.5 no-underline hover:no-underline"
    >
      {/* Facepile */}
      <div className="flex items-center">
        {visible.map((user, i) => {
          const avatarSrc = getStorageAssetUrl(user.avatarUrl);
          const initials = user.username.slice(0, 2).toUpperCase();
          return (
            <Avatar
              key={user.id}
              className={cn(
                "h-5 w-5 ring-2 ring-background-primary",
                i > 0 && "-ml-1.5",
              )}
            >
              <AvatarImage src={avatarSrc} alt={user.username} />
              <AvatarFallback className="text-[8px] font-medium">{initials}</AvatarFallback>
            </Avatar>
          );
        })}
        {overflow > 0 && (
          <div className="-ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-background-secondary text-[8px] font-medium text-text-secondary ring-2 ring-background-primary">
            +{overflow}
          </div>
        )}
      </div>
      <span className="text-[10px] font-medium uppercase tracking-widest text-text-disabled transition-colors group-hover:text-text-primary">
        {users.length === 1 ? "1 contributor →" : `${users.length} contributors →`}
      </span>
    </a>
  );
}
