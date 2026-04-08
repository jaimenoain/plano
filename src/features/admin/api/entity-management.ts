import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const EntityClaimStatusSchema = z.enum(["unclaimed", "claimed", "verified"]);
export type EntityClaimStatus = z.infer<typeof EntityClaimStatusSchema>;

export type AdminPersonListItem = {
  id: string;
  name: string;
  slug: string;
  claimStatus: EntityClaimStatus;
  creditCount: number;
};

export type AdminCompanyListItem = {
  id: string;
  name: string;
  slug: string;
  claimStatus: EntityClaimStatus;
  creditCount: number;
  stewardCount: number;
};

function escapeIlikePattern(raw: string): string {
  return raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function countByKey(rows: { person_id?: string | null; company_id?: string | null }[], key: "person_id" | "company_id"): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const id = r[key];
    if (!id) continue;
    m.set(id, (m.get(id) ?? 0) + 1);
  }
  return m;
}

export async function searchAdminPeople(search: string): Promise<AdminPersonListItem[]> {
  const q = search.trim().replace(/,/g, " ");
  if (q.length < 2) return [];

  const pattern = `%${escapeIlikePattern(q)}%`;
  const { data: rows, error } = await supabase
    .from("people")
    .select("id, name, slug, claim_status")
    .or(`name.ilike.${pattern},slug.ilike.${pattern}`)
    .order("name")
    .limit(50);

  if (error) throw error;
  const peopleRows = rows ?? [];
  if (peopleRows.length === 0) return [];

  const ids = peopleRows.map((p) => p.id as string);
  const { data: creditRows, error: cErr } = await supabase
    .from("building_credits")
    .select("person_id")
    .in("person_id", ids);

  if (cErr) throw cErr;
  const counts = countByKey((creditRows ?? []) as { person_id: string | null }[], "person_id");

  return peopleRows.map((p) => ({
    id: p.id as string,
    name: p.name as string,
    slug: p.slug as string,
    claimStatus: EntityClaimStatusSchema.parse(p.claim_status),
    creditCount: counts.get(p.id as string) ?? 0,
  }));
}

export async function searchAdminCompanies(search: string): Promise<AdminCompanyListItem[]> {
  const q = search.trim().replace(/,/g, " ");
  if (q.length < 2) return [];

  const pattern = `%${escapeIlikePattern(q)}%`;
  const { data: rows, error } = await supabase
    .from("companies")
    .select("id, name, slug, claim_status")
    .or(`name.ilike.${pattern},slug.ilike.${pattern}`)
    .order("name")
    .limit(50);

  if (error) throw error;
  const companyRows = rows ?? [];
  if (companyRows.length === 0) return [];

  const ids = companyRows.map((c) => c.id as string);

  const [{ data: creditRows, error: cErr }, { data: stewardRows, error: sErr }] = await Promise.all([
    supabase.from("building_credits").select("company_id").in("company_id", ids),
    supabase.from("company_stewards").select("company_id").in("company_id", ids),
  ]);

  if (cErr) throw cErr;
  if (sErr) throw sErr;

  const creditCounts = countByKey((creditRows ?? []) as { company_id: string | null }[], "company_id");
  const stewardCounts = countByKey((stewardRows ?? []) as { company_id: string | null }[], "company_id");

  return companyRows.map((c) => ({
    id: c.id as string,
    name: c.name as string,
    slug: c.slug as string,
    claimStatus: EntityClaimStatusSchema.parse(c.claim_status),
    creditCount: creditCounts.get(c.id as string) ?? 0,
    stewardCount: stewardCounts.get(c.id as string) ?? 0,
  }));
}

export async function updateAdminPersonClaimStatus(personId: string, claimStatus: EntityClaimStatus): Promise<void> {
  EntityClaimStatusSchema.parse(claimStatus);
  const { error } = await supabase.from("people").update({ claim_status: claimStatus }).eq("id", personId);
  if (error) throw error;
}

export async function updateAdminCompanyClaimStatus(companyId: string, claimStatus: EntityClaimStatus): Promise<void> {
  EntityClaimStatusSchema.parse(claimStatus);
  const { error } = await supabase.from("companies").update({ claim_status: claimStatus }).eq("id", companyId);
  if (error) throw error;
}

function parseMergeRpcPayload(raw: unknown): { ok: true } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "invalid_response" };
  }
  const o = raw as Record<string, unknown>;
  if (o.ok === true) {
    return { ok: true };
  }
  const err = o.error != null ? String(o.error) : "merge_failed";
  return { ok: false, error: err };
}

export async function adminMergePeople(sourcePersonId: string, targetPersonId: string): Promise<void> {
  const { data, error } = await supabase.rpc("admin_merge_people", {
    p_source_person_id: sourcePersonId,
    p_target_person_id: targetPersonId,
  });
  if (error) throw error;
  const parsed = parseMergeRpcPayload(data);
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
}

export async function adminMergeCompanies(sourceCompanyId: string, targetCompanyId: string): Promise<void> {
  const { data, error } = await supabase.rpc("admin_merge_companies", {
    p_source_company_id: sourceCompanyId,
    p_target_company_id: targetCompanyId,
  });
  if (error) throw error;
  const parsed = parseMergeRpcPayload(data);
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
}

export type OpenCompanyClaimDisputeRow = {
  id: string;
  companyId: string;
  disputedByUserId: string;
  reason: string;
  evidenceUrl: string | null;
  createdAt: string;
  companyName: string;
  companySlug: string;
  disputantUsername: string | null;
};

type DisputeQueryRow = {
  id: string;
  company_id: string;
  disputed_by_user_id: string;
  reason: string;
  evidence_url: string | null;
  created_at: string;
  companies: { name: string; slug: string } | { name: string; slug: string }[] | null;
  profiles: { username: string | null } | { username: string | null }[] | null;
};

function embedOne<T>(v: T | T[] | null): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export async function fetchOpenCompanyClaimDisputesForAdmin(): Promise<OpenCompanyClaimDisputeRow[]> {
  const { data, error } = await supabase
    .from("company_claim_disputes")
    .select(
      `
      id,
      company_id,
      disputed_by_user_id,
      reason,
      evidence_url,
      created_at,
      companies!company_claim_disputes_company_id_fkey ( name, slug ),
      profiles!company_claim_disputes_disputed_by_user_id_fkey ( username )
    `,
    )
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data as DisputeQueryRow[] | null)?.map((row) => {
    const co = embedOne(row.companies);
    const pr = embedOne(row.profiles);
    return {
      id: row.id,
      companyId: row.company_id,
      disputedByUserId: row.disputed_by_user_id,
      reason: row.reason,
      evidenceUrl: row.evidence_url,
      createdAt: row.created_at,
      companyName: co?.name ?? "—",
      companySlug: co?.slug ?? "",
      disputantUsername: pr?.username ?? null,
    };
  }) ?? [];
}

export async function resolveCompanyClaimDispute(disputeId: string): Promise<void> {
  const { error } = await supabase
    .from("company_claim_disputes")
    .update({ status: "resolved" })
    .eq("id", disputeId)
    .eq("status", "open");

  if (error) throw error;
}
