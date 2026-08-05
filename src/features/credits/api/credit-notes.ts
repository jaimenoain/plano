import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { CreditNote } from "@/features/credits/types";

const UpsertCreditNoteSchema = z
  .object({
    content: z.string().min(1, "Note cannot be empty").max(5000),
    imageUrls: z.array(z.string().url()).optional(),
  })
  .strict();

export type UpsertCreditNoteInput = z.infer<typeof UpsertCreditNoteSchema>;

export function creditNoteQueryKey(creditId: string) {
  return ["credit-note", creditId] as const;
}

export async function upsertCreditNote(
  creditId: string,
  input: UpsertCreditNoteInput,
): Promise<CreditNote> {
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  if (!user) throw new Error("Authentication required");

  const parsed = UpsertCreditNoteSchema.parse(input);

  const { data: row, error } = await supabase
    .from("building_credit_notes")
    .upsert(
      {
        credit_id: creditId,
        user_id: user.id,
        content: parsed.content,
        image_urls: parsed.imageUrls ?? [],
      },
      { onConflict: "credit_id" },
    )
    .select("id, credit_id, user_id, content, image_urls, created_at, updated_at")
    .single();

  if (error) throw error;

  return {
    id: row.id,
    creditId: row.credit_id,
    userId: row.user_id,
    content: row.content,
    imageUrls: row.image_urls as string[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function deleteCreditNote(creditId: string): Promise<void> {
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("building_credit_notes")
    .delete()
    .eq("credit_id", creditId)
    .eq("user_id", user.id);

  if (error) throw error;
}
