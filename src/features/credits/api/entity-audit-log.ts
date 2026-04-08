import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

/** Values written from the app client (RLS `entity_audit_logs_actor_insert`). */
export const CLIENT_ENTITY_AUDIT_ACTION_TYPES = ["credit_added", "credit_status_changed", "steward_removed"] as const;
export type ClientEntityAuditActionType = (typeof CLIENT_ENTITY_AUDIT_ACTION_TYPES)[number];

/** Includes RPC-written types (claim / steward flows). */
export const ENTITY_AUDIT_ACTION_TYPES = [
  ...CLIENT_ENTITY_AUDIT_ACTION_TYPES,
  "person_claimed",
  "company_claimed",
  "steward_added",
] as const;
export type EntityAuditActionType = (typeof ENTITY_AUDIT_ACTION_TYPES)[number];

export const ENTITY_AUDIT_TARGET_TYPES = ["credit", "person", "company"] as const;
export type EntityAuditTargetType = (typeof ENTITY_AUDIT_TARGET_TYPES)[number];

const InsertSchema = z
  .object({
    actionType: z.enum(CLIENT_ENTITY_AUDIT_ACTION_TYPES),
    targetType: z.enum(ENTITY_AUDIT_TARGET_TYPES),
    targetId: z.string().min(1),
    details: z.record(z.string(), z.unknown()),
  })
  .strict();

export type InsertEntityAuditLogInput = z.infer<typeof InsertSchema>;

function detailsToJson(details: InsertEntityAuditLogInput["details"]): Json {
  return details as Json;
}

/**
 * Append `admin_audit_logs` as the acting user (`admin_id` = session user).
 * Used for credit and steward removal events; claims/steward adds are logged in SECURITY DEFINER RPCs.
 */
export async function insertEntityAuditLog(input: InsertEntityAuditLogInput): Promise<void> {
  const parsed = InsertSchema.parse(input);
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  if (!user) throw new Error("Authentication required for audit log");

  const { error } = await supabase.from("admin_audit_logs").insert({
    admin_id: user.id,
    action_type: parsed.actionType,
    target_type: parsed.targetType,
    target_id: parsed.targetId,
    details: detailsToJson(parsed.details),
  });

  if (error) throw error;
}
