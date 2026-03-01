import * as z from "zod";

import { supabase } from "@/integrations/supabase/client";

export const buildingSchema = z.object({
  name: z.string(),
  slug: z.string().optional(),
  alt_name: z.string().nullable().optional(),
  aliases: z.array(z.string()).optional().default([]),
  hero_image_url: z.string().nullable().optional(),
  // Preprocess handles conversion from string input (e.g. from HTML input) to number or null
  year_completed: z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return null;
    const parsed = typeof val === 'string' ? parseInt(val, 10) : Number(val);
    return isNaN(parsed) ? null : parsed;
  }, z.number({ invalid_type_error: "Year must be a number" })
    .int("Year must be an integer")
    .min(0, "Year must be positive")
    .max(new Date().getFullYear() + 10, "Year cannot be in the far future")
    .nullable()),
  status: z.enum(['Built', 'Under Construction', 'Unbuilt', 'Demolished', 'Temporary']).nullable().optional(),
  access_level: z.enum(['public', 'private', 'restricted', 'commercial']).nullable().optional(),
  access_logistics: z.enum(['walk-in', 'booking_required', 'tour_only', 'exterior_only']).nullable().optional(),
  access_cost: z.enum(['free', 'paid', 'customers_only']).nullable().optional(),
  access_notes: z.string().max(500, "Notes must be less than 500 characters").nullable().optional(),
  // Updated to accept Architect objects
  architects: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(['individual', 'studio'])
    })
  ),
  functional_category_id: z.union([
      z.string().uuid(),
      z.literal(""),
      z.null(),
      z.undefined()
  ]).transform(val => (val === "" || val === undefined) ? null : val),
  functional_typology_ids: z.array(z.string().uuid())
    .refine((items) => new Set(items).size === items.length, {
      message: "Duplicate typologies are not allowed",
    }),
  selected_attribute_ids: z.array(z.string().uuid())
    .optional()
    .refine((items) => !items || new Set(items).size === items.length, {
      message: "Duplicate attributes are not allowed",
    }),
}).refine(async (data) => {
  if (!data.slug) return true;

  const { data: isAvailable, error } = await supabase.rpc('check_slug_availability', {
    target_slug: data.slug,
    exclude_id: null,
  });

  if (error) {
    console.error("Error checking slug availability in validation:", error);
    return true; // Don't block submission on DB error
  }

  return isAvailable;
}, {
  message: "This name generates a URL that is already taken. Please add a numerical suffix to your intended URL slug or change the name.",
  path: ["name"]
});

export const editBuildingSchema = z.object({
  name: z.string().optional(),
  slug: z.string().optional(),
  alt_name: z.string().nullable().optional(),
  aliases: z.array(z.string()).optional().default([]),
  hero_image_url: z.string().nullable().optional(),
  year_completed: z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return null;
    const parsed = typeof val === 'string' ? parseInt(val, 10) : Number(val);
    return isNaN(parsed) ? null : parsed;
  }, z.number({ invalid_type_error: "Year must be a number" })
    .int("Year must be an integer")
    .min(0, "Year must be positive")
    .max(new Date().getFullYear() + 10, "Year cannot be in the far future")
    .nullable()),
  status: z.enum(['Built', 'Under Construction', 'Unbuilt', 'Demolished', 'Temporary']).nullable().optional(),
  access_level: z.enum(['public', 'private', 'restricted', 'commercial']).nullable().optional(),
  access_logistics: z.enum(['walk-in', 'booking_required', 'tour_only', 'exterior_only']).nullable().optional(),
  access_cost: z.enum(['free', 'paid', 'customers_only']).nullable().optional(),
  access_notes: z.string().max(500, "Notes must be less than 500 characters").nullable().optional(),
  architects: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(['individual', 'studio'])
    })
  ).optional(),
  functional_category_id: z.union([
      z.string().uuid(),
      z.literal(""),
      z.null(),
      z.undefined()
  ]).transform(val => (val === "" || val === undefined) ? null : val),
  functional_typology_ids: z.array(z.string().uuid())
    .optional()
    .refine((items) => !items || new Set(items).size === items.length, {
      message: "Duplicate typologies are not allowed",
    }),
  id: z.string().optional(),
  selected_attribute_ids: z.array(z.string().uuid())
    .optional()
    .refine((items) => !items || new Set(items).size === items.length, {
      message: "Duplicate attributes are not allowed",
    }),
}).refine(async (data) => {
  if (!data.slug) return true;

  const { data: isAvailable, error } = await supabase.rpc('check_slug_availability', {
    target_slug: data.slug,
    exclude_id: data.id || null,
  });

  if (error) {
    console.error("Error checking slug availability in validation:", error);
    return true;
  }

  return isAvailable;
}, {
  message: "This name generates a URL that is already taken. Please add a numerical suffix to your intended URL slug or change the name.",
  path: ["name"]
});

export type BuildingSchema = z.infer<typeof buildingSchema>;
export type EditBuildingSchema = z.infer<typeof editBuildingSchema>;
