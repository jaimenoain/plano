import { redirect, type LoaderFunctionArgs } from "react-router";
import { getAwardBySlug, isCurrentUserAwardAdmin } from "@/features/awards/api/awards";
import { supabase } from "@/integrations/supabase/client";

export interface AwardAdminLoaderData {
  awardId:   string;
  awardName: string;
  awardSlug: string;
}

export async function awardAdminLoader({ params }: LoaderFunctionArgs): Promise<AwardAdminLoaderData> {
  const { slug } = params;
  if (!slug) throw new Response("Slug required", { status: 400 });

  // Require authentication.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw redirect(`/sign-in?redirect=/award/${slug}/admin`);

  // Load award.
  let award;
  try {
    award = await getAwardBySlug(slug);
  } catch {
    throw new Response("Award not found", { status: 404 });
  }

  // Gate: must be an award admin for this award.
  const isAdmin = await isCurrentUserAwardAdmin(award.id);
  if (!isAdmin) throw redirect(`/award/${slug}`);

  return {
    awardId:   award.id,
    awardName: award.name,
    awardSlug: award.slug,
  };
}
