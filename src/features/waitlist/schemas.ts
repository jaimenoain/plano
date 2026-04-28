import { z } from "zod";

export const waitlistSignupSchema = z.object({
  email: z.string().trim().email().max(320),
  fullName: z.string().trim().max(200).optional(),
});

export type WaitlistSignupInput = {
  email: string;
  fullName?: string;
};

export function normalizeWaitlistSignup(
  parsed: z.infer<typeof waitlistSignupSchema>,
): WaitlistSignupInput {
  const name = parsed.fullName?.trim();
  return {
    email: parsed.email.trim(),
    fullName: name && name.length > 0 ? name : undefined,
  };
}
