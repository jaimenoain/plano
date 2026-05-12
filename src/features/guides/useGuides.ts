import { useQuery } from '@tanstack/react-query';
import { getGuidesLocalities, getPopularCollections } from './guidesApi';

export const guidesKeys = {
  all: ['guides'] as const,
  localities: () => [...guidesKeys.all, 'localities'] as const,
  collections: () => [...guidesKeys.all, 'collections'] as const,
};

export function useGuidesLocalities() {
  return useQuery({
    queryKey: guidesKeys.localities(),
    queryFn: getGuidesLocalities,
    staleTime: 1000 * 60 * 10, // 10 min — locality counts change slowly
  });
}

export function useTopGuideLocalities(limit = 4) {
  return useQuery({
    queryKey: [...guidesKeys.localities(), 'top', limit],
    queryFn: () => getGuidesLocalities(limit),
    staleTime: 1000 * 60 * 10,
  });
}

export function usePopularCollections() {
  return useQuery({
    queryKey: guidesKeys.collections(),
    queryFn: () => getPopularCollections(12),
    staleTime: 1000 * 60 * 5,
  });
}
