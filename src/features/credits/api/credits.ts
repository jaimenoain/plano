import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

export const NotifyCreditedEntitiesSchema = z
  .object({
    creditIds: z
      .array(z.string().uuid())
      .min(1)
      .max(50)
      .refine((ids) => new Set(ids).size === ids.length, { message: "Duplicate credit id" }),
    emails: z.array(z.string().email()).min(1).max(15),
  })
  .strict();

export type NotifyCreditedEntitiesInput = z.infer<typeof NotifyCreditedEntitiesSchema>;

/**
 * After adding credits, sends one email per recipient via Edge Function `notify-credited-entities`
 * (manual JWT verification; mints removal tokens server-side; logs hashes only to `credit_notification_log`).
 */
export async function notifyCreditedEntities(input: NotifyCreditedEntitiesInput): Promise<{ ok: true }> {
  const body = NotifyCreditedEntitiesSchema.parse(input);
  console.log("notifyCreditedEntities: invoking with", body);
  
  const { data, error } = await supabase.functions.invoke("notify-credited-entities", { body });

  if (error) {
    console.error("Edge Function invocation failed:", error);
    // Try to extract error message from response body if it's a FunctionsHttpError
    // @ts-ignore
    const payload = error.context?.body;
    if (payload) {
      try {
        const parsed = typeof payload === "string" ? JSON.parse(payload) : payload;
        throw new Error(parsed?.error || error.message);
      } catch {
        throw new Error(error.message);
      }
    }
    throw new Error(error.message);
  }

  const payload = data as { ok?: boolean; error?: string } | null;
  if (!payload?.ok) {
    throw new Error(payload?.error || "Failed to notify entities");
  }

  return { ok: true };
}
