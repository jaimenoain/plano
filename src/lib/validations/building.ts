import * as z from "zod";

export const buildingSchema = z.object({
  name: z.string(),
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
  access: z.enum(['Open Access', 'Admission Fee', 'Customers Only', 'Appointment Only', 'Exterior View Only', 'No Access']).nullable().optional(),
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
});

export const editBuildingSchema = z.object({
  name: z.string().optional(),
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
  access: z.enum(['Open Access', 'Admission Fee', 'Customers Only', 'Appointment Only', 'Exterior View Only', 'No Access']).nullable().optional(),
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
  selected_attribute_ids: z.array(z.string().uuid())
    .optional()
    .refine((items) => !items || new Set(items).size === items.length, {
      message: "Duplicate attributes are not allowed",
    }),
});

export type BuildingSchema = z.infer<typeof buildingSchema>;
export type EditBuildingSchema = z.infer<typeof editBuildingSchema>;
