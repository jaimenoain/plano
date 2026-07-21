import { supabase } from "@/integrations/supabase/client";

export type WaitlistSignupRow = {
  id: string;
  email: string;
  fullName: string | null;
  createdAt: string;
};

export async function fetchWaitlistSignups(): Promise<WaitlistSignupRow[]> {
  const { data, error } = await supabase
    .from("waitlist_signups")
    .select("id, email, full_name, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id,
    email: r.email,
    fullName: r.full_name,
    createdAt: r.created_at,
  }));
}
