import * as z from "zod";

export const buildingSchema = z.object({
  name: z.string().min(1, "Name is required"),
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
  // Updated to accept Architect objects
  architects: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(['individual', 'studio'])
    })
  ),
  functional_category_id: z.string().uuid("Category is required"),
  functional_typology_ids: z.array(z.string().uuid())
    .min(1, "At least one typology is required")
    .refine((items) => new Set(items).size === items.length, {
      message: "Duplicate typologies are not allowed",
    }),
  selected_attribute_ids: z.array(z.string().uuid())
    .optional()
    .refine((items) => !items || new Set(items).size === items.length, {
      message: "Duplicate attributes are not allowed",
    }),
  main_image_url: z.string().nullable().optional(),
});

export type BuildingSchema = z.infer<typeof buildingSchema>;
