import * as z from "zod";

/** Matches `sanitizeUsername` (alphanumeric + underscore). */
const usernameRegex = /^[a-zA-Z0-9_]+$/;

export const profileUpdateSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
      usernameRegex,
      "Username may only contain letters, numbers, and underscores"
    ),
  bio: z.string().max(500, "Bio must be at most 500 characters").optional(),
  country: z.string().optional(),
  location: z.string().optional(),
  avatar_url: z
    .union([z.string().url("Avatar must be a valid URL"), z.literal(""), z.null()])
    .optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
