import { z } from "zod";

const optionalHttpUrl = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? undefined : v),
  z.string().trim().max(2000).url("Enter a valid http(s) URL.").optional(),
);

export const SubmitEventSchema = z
  .object({
    title: z.string().trim().min(2, "Title must be at least 2 characters.").max(120, "Title must be at most 120 characters."),
    description: z.string().trim().max(10_000).optional(),
    startAt: z.string().min(1, "Start date and time are required."),
    endAt: z.string().optional(),
    address: z.string().trim().max(2000).optional(),
    lat: z.number().finite().optional(),
    lng: z.number().finite().optional(),
    externalLink: optionalHttpUrl,
    coverImageUrl: optionalHttpUrl,
    isSelfHosted: z.boolean(),
    buildingIds: z.array(z.string().uuid()).max(20, "You can link at most 20 buildings.").default([]),
  })
  .superRefine((val, ctx) => {
    if (val.lat !== undefined && val.lng === undefined) {
      ctx.addIssue({ code: "custom", path: ["lng"], message: "Longitude is required when latitude is set." });
    }
    if (val.lng !== undefined && val.lat === undefined) {
      ctx.addIssue({ code: "custom", path: ["lat"], message: "Latitude is required when longitude is set." });
    }
    if (!val.endAt || val.endAt.length === 0) return;
    const start = Date.parse(val.startAt);
    const end = Date.parse(val.endAt);
    if (Number.isNaN(start)) {
      ctx.addIssue({ code: "custom", path: ["startAt"], message: "Start date and time are invalid." });
      return;
    }
    if (Number.isNaN(end)) {
      ctx.addIssue({ code: "custom", path: ["endAt"], message: "End date and time are invalid." });
      return;
    }
    if (end <= start) {
      ctx.addIssue({ code: "custom", path: ["endAt"], message: "End must be after start." });
    }
  });

export type SubmitEventInput = z.infer<typeof SubmitEventSchema>;
