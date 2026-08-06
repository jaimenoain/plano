import { supabase } from "@/integrations/supabase/client";

/**
 * Whether `slug` is free for a building. `excludeId` skips the building being
 * edited so its own slug never reads as taken. Errors resolve to available:
 * a failed check must not block the form.
 */
export async function checkSlugAvailability(
  slug: string,
  excludeId?: string,
): Promise<boolean> {
  if (!slug) return true;

  const { data, error } = await supabase.rpc("check_slug_availability", {
    target_slug: slug,
    ...(excludeId ? { exclude_id: excludeId } : {}),
  });

  if (error) return true;
  return data;
}
