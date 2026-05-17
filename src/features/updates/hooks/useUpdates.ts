import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPublishedUpdates,
  fetchAllUpdates,
  fetchUpdateById,
  fetchUpdateBySlug,
  createUpdate,
  updateUpdate,
  deleteUpdate,
} from "../api/updates";
import type { CreateUpdatePayload, UpdateUpdatePayload } from "../types";

export const UPDATES_QUERY_KEY = ["plano-updates"] as const;

export function usePublishedUpdates() {
  return useQuery({
    queryKey: [...UPDATES_QUERY_KEY, "published"],
    queryFn: fetchPublishedUpdates,
    staleTime: 60_000,
  });
}

export function useAllUpdates() {
  return useQuery({
    queryKey: [...UPDATES_QUERY_KEY, "all"],
    queryFn: fetchAllUpdates,
    staleTime: 0,
  });
}

export function useUpdateById(id: string | undefined) {
  return useQuery({
    queryKey: [...UPDATES_QUERY_KEY, "id", id],
    queryFn: () => fetchUpdateById(id!),
    enabled: !!id,
    staleTime: 0,
  });
}

export function useUpdateBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: [...UPDATES_QUERY_KEY, "slug", slug],
    queryFn: () => fetchUpdateBySlug(slug!),
    enabled: !!slug,
    staleTime: 60_000,
  });
}

export function useCreateUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUpdatePayload) => createUpdate(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: UPDATES_QUERY_KEY }),
  });
}

export function useUpdateUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUpdatePayload }) =>
      updateUpdate(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: UPDATES_QUERY_KEY }),
  });
}

export function useDeleteUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteUpdate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: UPDATES_QUERY_KEY }),
  });
}
