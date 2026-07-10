import { supabase } from "@/integrations/supabase/client";

/** One cell of the landing stats band. `value` is a live count, never a placeholder. */
export interface LandingStat {
  label: string;
  value: number;
  /** The cell stays hidden until the count reaches this, so no number lands on the
   *  landing page before it is worth showing. */
  minimum: number;
}

async function countRows(
  build: () => PromiseLike<{ count: number | null; error: { message: string } | null }>,
): Promise<number> {
  const { count, error } = await build();
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * Site-wide counts for the logged-out landing band. Every table below grants
 * anonymous SELECT, so these run un-authenticated with no RPC.
 */
export async function getLandingStats(): Promise<LandingStat[]> {
  const [buildings, cities, people, companies, members] = await Promise.all([
    countRows(() =>
      supabase
        .from("buildings")
        .select("id", { count: "exact", head: true })
        .or("is_deleted.is.null,is_deleted.eq.false"),
    ),
    countRows(() =>
      supabase
        .from("localities")
        .select("id", { count: "exact", head: true })
        .gt("buildings_count", 0),
    ),
    countRows(() => supabase.from("people").select("id", { count: "exact", head: true })),
    countRows(() => supabase.from("companies").select("id", { count: "exact", head: true })),
    // `role` is nullable, and `NULL <> 'test_user'` is NULL — a bare .neq() would
    // silently drop every profile that has no role.
    countRows(() =>
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .or("role.is.null,role.neq.test_user"),
    ),
  ]);

  return [
    { label: "Buildings catalogued", value: buildings, minimum: 1 },
    { label: "Cities", value: cities, minimum: 1 },
    { label: "Architects & practices", value: people + companies, minimum: 1 },
    // Pre-launch the membership is a couple of dozen people. The cell surfaces
    // itself once that number carries its own weight.
    { label: "Members", value: members, minimum: 1000 },
  ];
}
