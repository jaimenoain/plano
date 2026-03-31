import * as z from "zod";
export const collectionSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "Name is required")
        .max(100, "Name must be at most 100 characters"),
    description: z.string().max(500, "Description must be at most 500 characters").optional(),
    is_public: z.boolean().default(true),
    external_link: z
        .union([z.string().url("Link must be a valid URL"), z.literal(""), z.null()])
        .optional(),
});
