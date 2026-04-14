// src/features/buildings/hooks/useBuildingContributors.ts

import { useQuery } from '@tanstack/react-query';
import {
  getBuildingContributors,
  buildingContributorsQueryKey,
} from '@/features/buildings/api/contributors';

export function useBuildingContributors(buildingId: string | undefined) {
  return useQuery({
    queryKey:  buildingContributorsQueryKey(buildingId ?? ''),
    queryFn:   () => getBuildingContributors(buildingId!),
    enabled:   !!buildingId,
    staleTime: 1000 * 60 * 5, // 5 min — contributor lists change rarely
  });
}
