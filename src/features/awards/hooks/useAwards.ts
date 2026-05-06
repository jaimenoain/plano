import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  getAwards,
  getAwardById,
  getAwardBySlug,
  getEditionsByAward,
  getEditionById,
  getCategoriesByAward,
  getRecipientsByEdition,
  getAwardsByBuilding,
  getAwardsByPerson,
  getAwardsByCompany,
  getRecentRecipients,
  getAwardsStats,
  createAward,
  updateAward,
  deleteAward,
  createEdition,
  updateEdition,
  deleteEdition,
  createCategory,
  updateCategory,
  deleteCategory,
  createRecipient,
  deleteRecipient,
  type RecentRecipientFilters,
} from "@/features/awards/api/awards";

// ── Cache keys ───────────────────────────────────────────────

export const awardKeys = {
  all: ["awards"] as const,
  lists: () => [...awardKeys.all, "list"] as const,
  detail: (id: string) => [...awardKeys.all, "detail", id] as const,
  detailBySlug: (slug: string) => [...awardKeys.all, "detail-slug", slug] as const,
  editions: (awardId: string) => [...awardKeys.all, "editions", awardId] as const,
  edition: (editionId: string) => [...awardKeys.all, "edition", editionId] as const,
  categories: (awardId: string) => [...awardKeys.all, "categories", awardId] as const,
  recipients: (editionId: string) => [...awardKeys.all, "recipients", editionId] as const,
  byBuilding: (buildingId: string) => [...awardKeys.all, "building", buildingId] as const,
  byPerson: (personId: string) => [...awardKeys.all, "person", personId] as const,
  byCompany: (companyId: string) => [...awardKeys.all, "company", companyId] as const,
};

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

// ── Queries ──────────────────────────────────────────────────

export function useAwards() {
  return useQuery({
    queryKey: awardKeys.lists(),
    queryFn: getAwards,
    staleTime: STALE_TIME,
  });
}

export function useAward(awardId: string) {
  return useQuery({
    queryKey: awardKeys.detail(awardId),
    queryFn: () => getAwardById(awardId),
    enabled: awardId.length > 0,
    staleTime: STALE_TIME,
  });
}

export function useAwardBySlug(slug: string) {
  return useQuery({
    queryKey: awardKeys.detailBySlug(slug),
    queryFn: () => getAwardBySlug(slug),
    enabled: slug.length > 0,
    staleTime: STALE_TIME,
  });
}

export function useEditionsByAward(awardId: string) {
  return useQuery({
    queryKey: awardKeys.editions(awardId),
    queryFn: () => getEditionsByAward(awardId),
    enabled: awardId.length > 0,
    staleTime: STALE_TIME,
  });
}

export function useEdition(editionId: string) {
  return useQuery({
    queryKey: awardKeys.edition(editionId),
    queryFn: () => getEditionById(editionId),
    enabled: editionId.length > 0,
    staleTime: STALE_TIME,
  });
}

export function useCategoriesByAward(awardId: string) {
  return useQuery({
    queryKey: awardKeys.categories(awardId),
    queryFn: () => getCategoriesByAward(awardId),
    enabled: awardId.length > 0,
    staleTime: STALE_TIME,
  });
}

export function useRecipientsByEdition(editionId: string) {
  return useQuery({
    queryKey: awardKeys.recipients(editionId),
    queryFn: () => getRecipientsByEdition(editionId),
    enabled: editionId.length > 0,
    staleTime: STALE_TIME,
  });
}

export function useAwardsByBuilding(buildingId: string) {
  return useQuery({
    queryKey: awardKeys.byBuilding(buildingId),
    queryFn: () => getAwardsByBuilding(buildingId),
    enabled: buildingId.length > 0,
    staleTime: STALE_TIME,
  });
}

export function useAwardsByPerson(personId: string) {
  return useQuery({
    queryKey: awardKeys.byPerson(personId),
    queryFn: () => getAwardsByPerson(personId),
    enabled: personId.length > 0,
    staleTime: STALE_TIME,
  });
}

export function useAwardsByCompany(companyId: string) {
  return useQuery({
    queryKey: awardKeys.byCompany(companyId),
    queryFn: () => getAwardsByCompany(companyId),
    enabled: companyId.length > 0,
    staleTime: STALE_TIME,
  });
}

export function useAwardLeaderboard(awardId?: string, limit = 50) {
  return useQuery({
    queryKey: [...awardKeys.all, "leaderboard", awardId, limit],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_award_leaderboard", {
        p_award_id: awardId || null,
        p_limit: limit,
      });
      if (error) throw error;
      return data as unknown as any[];
    },
    staleTime: STALE_TIME,
  });
}

// ── Mutations ────────────────────────────────────────────────

export function useCreateAward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createAward,
    onSuccess: () => qc.invalidateQueries({ queryKey: awardKeys.lists() }),
  });
}

export function useUpdateAward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ awardId, payload }: { awardId: string; payload: Record<string, unknown> }) =>
      updateAward(awardId, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: awardKeys.lists() });
      qc.invalidateQueries({ queryKey: awardKeys.detail(vars.awardId) });
    },
  });
}

export function useDeleteAward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteAward,
    onSuccess: () => qc.invalidateQueries({ queryKey: awardKeys.lists() }),
  });
}

export function useCreateEdition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createEdition,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: awardKeys.editions(vars.award_id) });
    },
  });
}

export function useUpdateEdition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ editionId, payload }: { editionId: string; payload: Record<string, unknown> }) =>
      updateEdition(editionId, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: awardKeys.edition(vars.editionId) });
      qc.invalidateQueries({ queryKey: awardKeys.all });
    },
  });
}

export function useDeleteEdition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteEdition,
    onSuccess: () => qc.invalidateQueries({ queryKey: awardKeys.all }),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCategory,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: awardKeys.categories(vars.award_id) });
    },
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, payload }: { categoryId: string; payload: Record<string, unknown> }) =>
      updateCategory(categoryId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: awardKeys.all }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => qc.invalidateQueries({ queryKey: awardKeys.all }),
  });
}

export function useCreateRecipient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createRecipient,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: awardKeys.recipients(vars.edition_id) });
    },
  });
}

export function useDeleteRecipient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteRecipient,
    onSuccess: () => qc.invalidateQueries({ queryKey: awardKeys.all }),
  });
}

// ── Suggestions ──────────────────────────────────────────────

import {
  createSuggestion,
  getSuggestions,
  getSuggestionById,
  approveSuggestion,
  rejectSuggestion,
  getAwardsByBody,
} from "@/features/awards/api/awards";

export const suggestionKeys = {
  all: ["award-suggestions"] as const,
  lists: (status?: string) => [...suggestionKeys.all, "list", status || "all"] as const,
  detail: (id: string) => [...suggestionKeys.all, "detail", id] as const,
};

export function useCreateSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSuggestion,
    onSuccess: () => qc.invalidateQueries({ queryKey: suggestionKeys.all }),
  });
}

export function useSuggestions(status?: string) {
  return useQuery({
    queryKey: suggestionKeys.lists(status),
    queryFn: () => getSuggestions(status),
    staleTime: STALE_TIME,
  });
}

export function useSuggestion(id: string) {
  return useQuery({
    queryKey: suggestionKeys.detail(id),
    queryFn: () => getSuggestionById(id),
    enabled: id.length > 0,
    staleTime: STALE_TIME,
  });
}

export function useApproveSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: approveSuggestion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: suggestionKeys.all });
      qc.invalidateQueries({ queryKey: awardKeys.all });
    },
  });
}

export function useRejectSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => rejectSuggestion(id, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: suggestionKeys.all }),
  });
}

export function useAwardsByBody(companyId: string) {
  return useQuery({
    queryKey: [...awardKeys.all, "by-body", companyId],
    queryFn: () => getAwardsByBody(companyId),
    enabled: companyId.length > 0,
    staleTime: STALE_TIME,
  });
}

// ── Awards Hub hooks ─────────────────────────────────────────

export function useRecentRecipients(filters: Omit<RecentRecipientFilters, 'offset' | 'limit'> = {}) {
  return useInfiniteQuery({
    queryKey: [...awardKeys.all, "recent", filters],
    queryFn: ({ pageParam }) =>
      getRecentRecipients({ ...filters, offset: pageParam as number, limit: 20 }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === 20 ? allPages.length * 20 : undefined,
    initialPageParam: 0,
    staleTime: STALE_TIME,
  });
}

export function useAwardsStats() {
  return useQuery({
    queryKey: [...awardKeys.all, "stats"],
    queryFn: getAwardsStats,
    staleTime: STALE_TIME,
  });
}

export function usePersonAwardLeaderboard(awardId?: string, limit = 50) {
  return useQuery({
    queryKey: [...awardKeys.all, "person-leaderboard", awardId, limit],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_person_award_leaderboard", {
        p_award_id: awardId || null,
        p_limit: limit,
      });
      if (error) throw error;
      return data as Array<{
        person_id: string;
        person_name: string;
        person_slug: string;
        avatar_url: string | null;
        award_count: number;
        win_count: number;
      }>;
    },
    staleTime: STALE_TIME,
  });
}
