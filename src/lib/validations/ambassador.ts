import { z } from "zod";

const countryCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(2)
  .transform((s) => s.toUpperCase())
  .refine((s) => /^[A-Z]{2}$/.test(s), "Country must be ISO 3166-1 alpha-2");

export const ambassadorChapterTypeSchema = z.enum(["local", "national"]);

export const ambassadorChapterStatusSchema = z.enum([
  "active",
  "inactive",
  "forming",
]);

export const ambassadorMembershipRoleSchema = z.enum([
  "president",
  "exco",
  "ambassador",
]);

export const excoResponsibilitySchema = z.enum([
  "content",
  "marketing",
  "architect_relations",
  "data_quality",
  "community",
]);

export const ambassadorChapterCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    type: ambassadorChapterTypeSchema,
    country_code: countryCodeSchema,
    locality_id: z.string().uuid().nullable(),
    parent_chapter_id: z.string().uuid().nullable(),
    max_ambassadors: z.coerce.number().int().min(1).max(500),
    status: ambassadorChapterStatusSchema,
  })
  .superRefine((val, ctx) => {
    if (val.type === "local") {
      if (!val.locality_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Local chapters require a locality",
          path: ["locality_id"],
        });
      }
      if (!val.parent_chapter_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Local chapters require a national parent chapter",
          path: ["parent_chapter_id"],
        });
      }
    } else {
      if (val.locality_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "National chapters cannot have a locality",
          path: ["locality_id"],
        });
      }
      if (val.parent_chapter_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "National chapters cannot have a parent",
          path: ["parent_chapter_id"],
        });
      }
    }
  });

export const ambassadorAddMemberSchema = z
  .object({
    user_id: z.string().uuid(),
    role: ambassadorMembershipRoleSchema,
    exco_responsibility: excoResponsibilitySchema.nullable(),
  })
  .superRefine((val, ctx) => {
    if (val.role === "exco" && !val.exco_responsibility) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ExCo members need a responsibility",
        path: ["exco_responsibility"],
      });
    }
    if (val.role !== "exco" && val.exco_responsibility) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only ExCo members have a responsibility",
        path: ["exco_responsibility"],
      });
    }
  });

export const ambassadorMembershipUpdateSchema = z.object({
  role: ambassadorMembershipRoleSchema.optional(),
  exco_responsibility: excoResponsibilitySchema.nullable().optional(),
  status: z.enum(["active", "inactive", "pending_review"]).optional(),
});

export type AmbassadorChapterCreateInput = z.infer<
  typeof ambassadorChapterCreateSchema
>;
export type AmbassadorAddMemberInput = z.infer<typeof ambassadorAddMemberSchema>;
export type AmbassadorMembershipUpdateInput = z.infer<
  typeof ambassadorMembershipUpdateSchema
>;

export const ambassadorApplicationSubmitSchema = z.object({
  chapter_id: z.string().uuid(),
  motivation_text: z.string().trim().min(100).max(5000),
});

export type AmbassadorApplicationSubmitInput = z.infer<
  typeof ambassadorApplicationSubmitSchema
>;
