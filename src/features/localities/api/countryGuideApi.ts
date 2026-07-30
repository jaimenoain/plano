import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AppSupabaseClient = SupabaseClient<Database>;

// ---------------------------------------------------------------------------
// Boundary schema for `public.get_country_guide` (one jsonb payload per page).
// ---------------------------------------------------------------------------

const CountryCitySchema = z.object({
  city: z.string(),
  city_slug: z.string(),
  buildings_count: z.number().int(),
  /** Best-photographed building in the city; only sent for card rows. */
  preview_image_url: z.string().nullable(),
  lat: z.coerce.number().nullable(),
  lng: z.coerce.number().nullable(),
  /** Up to three building names; only sent for card rows. */
  highlights: z.array(z.string()),
});

const CountryEssentialSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string().nullable(),
  short_id: z.number().int().nullable(),
  city: z.string().nullable(),
  city_slug: z.string().nullable(),
  year_completed: z.number().int().nullable(),
  image_url: z.string().nullable(),
});

/** An open-ended band has a null bound: `to_year: null` = "and later". */
const CountryEraSchema = z.object({
  from_year: z.number().int().nullable(),
  to_year: z.number().int().nullable(),
  count: z.number().int(),
});

const CountryPracticeSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  buildings: z.number().int(),
});

const CountryContributorSchema = z.object({
  user_id: z.string(),
  username: z.string(),
  avatar_url: z.string().nullable(),
  buildings_logged: z.number().int(),
  photos_uploaded: z.number().int(),
  is_ambassador: z.boolean(),
});

const CountryCollectionSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  owner_username: z.string(),
  owner_avatar_url: z.string().nullable(),
  building_count: z.number().int(),
  preview_image_urls: z.array(z.string().nullable()),
});

const CountryTotalsSchema = z.object({
  code: z.string(),
  name: z.string().nullable(),
  cities: z.number().int(),
  buildings: z.number().int(),
  /** Buildings with a completion year — the denominator behind the era spread. */
  dated: z.number().int(),
  first_year: z.number().int().nullable(),
  last_year: z.number().int().nullable(),
  practices: z.number().int(),
  contributors: z.number().int(),
  photos: z.number().int(),
});

const CountryGuideSchema = z.object({
  country: CountryTotalsSchema,
  cities: z.array(CountryCitySchema),
  essentials: z.array(CountryEssentialSchema),
  eras: z.array(CountryEraSchema),
  practices: z.array(CountryPracticeSchema),
  contributors: z.array(CountryContributorSchema),
  collections: z.array(CountryCollectionSchema),
});

export type CountryGuide = z.infer<typeof CountryGuideSchema>;
export type CountryCity = z.infer<typeof CountryCitySchema>;
export type CountryEssential = z.infer<typeof CountryEssentialSchema>;
export type CountryEra = z.infer<typeof CountryEraSchema>;
export type CountryPractice = z.infer<typeof CountryPracticeSchema>;
export type CountryContributor = z.infer<typeof CountryContributorSchema>;
export type CountryCollection = z.infer<typeof CountryCollectionSchema>;
export type CountryTotals = z.infer<typeof CountryTotalsSchema>;

/** Parses a raw `get_country_guide` payload. Throws on a shape mismatch. */
export function parseCountryGuide(payload: unknown): CountryGuide {
  return CountryGuideSchema.parse(payload);
}

/**
 * Server-side: the whole country guide in one round trip.
 *
 * Returns null when the RPC errors, and a payload with `cities: []` for a
 * country code we hold no localities for — the caller turns that into a 404.
 */
export async function getCountryGuide(
  supabaseClient: AppSupabaseClient,
  countryCode: string,
): Promise<CountryGuide | null> {
  const { data, error } = await supabaseClient.rpc("get_country_guide", {
    p_country_code: countryCode.toUpperCase(),
  });

  if (error || data == null) return null;
  return parseCountryGuide(data);
}
