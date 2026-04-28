import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  normalizeWaitlistSignup,
  waitlistSignupSchema,
  type WaitlistSignupInput,
} from "../schemas";

export function parseWaitlistSignup(input: unknown):
  | { ok: true; data: WaitlistSignupInput }
  | { ok: false; error: string } {
  const parsed = waitlistSignupSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg =
      (first.email?.[0] as string | undefined) ??
      (first.fullName?.[0] as string | undefined) ??
      "Please check your details.";
    return { ok: false, error: msg };
  }
  return { ok: true, data: normalizeWaitlistSignup(parsed.data) };
}

export async function insertWaitlistSignup(
  client: SupabaseClient<Database>,
  input: WaitlistSignupInput,
): Promise<{ ok: true } | { ok: false; code: "duplicate" | "unknown"; message: string }> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const { error } = await client.from("waitlist_signups").insert({
    email: normalizedEmail,
    full_name: input.fullName ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        code: "duplicate",
        message: "That email is already on the list. We will be in touch.",
      };
    }
    return {
      ok: false,
      code: "unknown",
      message: "Something went wrong. Please try again in a moment.",
    };
  }

  return { ok: true };
}
