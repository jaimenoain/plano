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

/** Inline header editor on `/profile/:username` (bio, optional firm, website). */
export const profileHeaderUpdateSchema = z.object({
  bio: z
    .string()
    .max(500, "Bio must be at most 500 characters")
    .transform((s) => {
      const t = s.trim();
      return t.length === 0 ? null : t;
    }),
  firm: z
    .string()
    .max(500, "Firm name must be at most 500 characters")
    .transform((s) => {
      const t = s.trim();
      return t.length === 0 ? null : t;
    }),
  website: z
    .string()
    .max(2000, "Website must be at most 2000 characters")
    .transform((s) => {
      const t = s.trim();
      return t.length === 0 ? null : t;
    }),
});

export type ProfileHeaderUpdateInput = z.infer<typeof profileHeaderUpdateSchema>;
