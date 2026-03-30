import * as z from "zod";

export const reviewSubmitSchema = z.object({
  rating: z
    .number({ invalid_type_error: "Rating is required" })
    .int()
    .min(1, "Rating must be at least 1")
    .max(3, "Rating must be at most 3"),
  content: z.string().max(5000, "Review text must be at most 5000 characters").optional(),
  status: z.enum(["visited", "pending"]),
  visibility: z.enum(["public", "private", "contacts"]).default("public"),
});

export type ReviewSubmitInput = z.infer<typeof reviewSubmitSchema>;
