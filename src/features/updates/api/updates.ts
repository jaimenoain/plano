import { supabase } from "@/integrations/supabase/client";
import type { PlanoUpdate, CreateUpdatePayload, UpdateUpdatePayload } from "../types";

const db = supabase;

function rowToUpdate(row: Record<string, unknown>): PlanoUpdate {
  return {
    id: row.id as string,
    title: row.title as string,
    slug: row.slug as string,
    excerpt: (row.excerpt as string | null) ?? null,
    body: (row.body as string | null) ?? null,
    heroImageUrl: (row.hero_image_url as string | null) ?? null,
    tags: (row.tags as string[]) ?? [],
    geoScope: (row.geo_scope as PlanoUpdate["geoScope"]) ?? "global",
    countryCode: (row.country_code as string | null) ?? null,
    localityId: (row.locality_id as string | null) ?? null,
    localityCity: row.localities
      ? ((row.localities as Record<string, unknown>).city as string)
      : null,
    publishedAt: (row.published_at as string | null) ?? null,
    authorId: row.author_id as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

const SELECT_COLS =
  "id, title, slug, excerpt, body, hero_image_url, tags, geo_scope, country_code, locality_id, localities(city), published_at, author_id, created_at, updated_at";

export async function fetchPublishedUpdates(): Promise<PlanoUpdate[]> {
  const { data, error } = await db
    .from("plano_updates")
    .select(SELECT_COLS)
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToUpdate);
}

export async function fetchAllUpdates(): Promise<PlanoUpdate[]> {
  const { data, error } = await db
    .from("plano_updates")
    .select(SELECT_COLS)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToUpdate);
}

export async function fetchUpdateBySlug(slug: string): Promise<PlanoUpdate | null> {
  const { data, error } = await db
    .from("plano_updates")
    .select(SELECT_COLS)
    .eq("slug", slug)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data ? rowToUpdate(data) : null;
}

export async function fetchUpdateById(id: string): Promise<PlanoUpdate | null> {
  const { data, error } = await db
    .from("plano_updates")
    .select(SELECT_COLS)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data ? rowToUpdate(data) : null;
}

export async function createUpdate(payload: CreateUpdatePayload): Promise<PlanoUpdate> {
  const { data, error } = await db
    .from("plano_updates")
    .insert(payload)
    .select(SELECT_COLS)
    .single();

  if (error) throw error;
  return rowToUpdate(data);
}

export async function updateUpdate(
  id: string,
  payload: UpdateUpdatePayload,
): Promise<PlanoUpdate> {
  const { data, error } = await db
    .from("plano_updates")
    .update(payload)
    .eq("id", id)
    .select(SELECT_COLS)
    .single();

  if (error) throw error;
  return rowToUpdate(data);
}

export async function deleteUpdate(id: string): Promise<void> {
  const { error } = await db.from("plano_updates").delete().eq("id", id);
  if (error) throw error;
}
