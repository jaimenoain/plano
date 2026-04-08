import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  if (email.length < 3 || email.length > 320) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeEmailDomain(email: string): string | null {
  const norm = normalizeEmail(email);
  const at = norm.lastIndexOf("@");
  if (at < 1 || at === norm.length - 1) return null;
  let host = norm.slice(at + 1);
  if (host.startsWith("www.")) host = host.slice(4);
  return host;
}

function normalizeStoredDomain(raw: string | null): string | null {
  if (raw == null || raw.trim() === "") return null;
  let d = raw.trim().toLowerCase();
  if (d.startsWith("www.")) d = d.slice(4);
  return d;
}

function randomHex64(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexStringToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const jwt = authHeader.replace("Bearer ", "");
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(jwt);

  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { companyId?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const companyId = typeof body.companyId === "string" ? body.companyId.trim() : "";
  const email = normalizeEmail(typeof body.email === "string" ? body.email : "");

  if (!companyId || !email || !isValidEmail(email)) {
    return new Response(JSON.stringify({ error: "Invalid company or email" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const submittedDomain = normalizeEmailDomain(email);
  if (!submittedDomain) {
    return new Response(JSON.stringify({ error: "Invalid email" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data: companyRow, error: coErr } = await admin
    .from("companies")
    .select("id, slug, name, claim_status, verified_domain")
    .eq("id", companyId)
    .maybeSingle();

  if (coErr || !companyRow) {
    return new Response(JSON.stringify({ error: "Company not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const claimStatus = companyRow.claim_status as string;
  const verifiedDomainRaw = companyRow.verified_domain as string | null;

  const { count: stewardCount, error: stErr } = await admin
    .from("company_stewards")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  if (stErr) {
    return new Response(JSON.stringify({ error: "Could not verify company state" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const hasStewards = (stewardCount ?? 0) > 0;
  const isUnclaimed = claimStatus === "unclaimed" && !hasStewards;

  if (!isUnclaimed) {
    const storedDomain = normalizeStoredDomain(verifiedDomainRaw);
    if (storedDomain !== null && submittedDomain !== storedDomain) {
      return new Response(
        JSON.stringify({
          ok: false,
          action: "dispute",
          companySlug: companyRow.slug as string,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    return new Response(JSON.stringify({ ok: false, error: "already_claimed" }), {
      status: 409,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: existingSteward } = await admin
    .from("company_stewards")
    .select("id")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingSteward) {
    return new Response(JSON.stringify({ ok: false, error: "already_member" }), {
      status: 409,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const tokenHex = randomHex64();
  const tokenBytes = hexStringToBytes(tokenHex);
  const hashBuffer = await crypto.subtle.digest("SHA-256", tokenBytes);
  const tokenHash = new Uint8Array(hashBuffer);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data: tokenRow, error: insErr } = await admin
    .from("company_claim_verification_tokens")
    .insert({
      company_id: companyId,
      requester_user_id: user.id,
      email_normalized: email,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single();

  if (insErr || !tokenRow) {
    return new Response(JSON.stringify({ error: "Could not create verification" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const siteUrl = (Deno.env.get("SITE_URL") ?? "https://plano.app").replace(/\/$/, "");
  const verifyUrl = `${siteUrl}/verify-company-claim/${tokenHex}`;

  console.log("company_claim_verification_created", {
    tokenId: tokenRow.id,
    companyId,
    companySlug: companyRow.slug,
  });

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      const companyName = companyRow.name as string;
      await resend.emails.send({
        from: "PLANO <hello@plano.app>",
        to: [email],
        subject: `Verify your claim for ${companyName} on Plano`,
        text: `Confirm that you represent ${companyName} on Plano by opening this link (sign in with the same account you used on Plano if prompted):\n\n${verifyUrl}\n\nThis link expires in 7 days.\n\nIf you did not request this, you can ignore this email.`,
      });
    } catch (e) {
      console.error("Resend send failed", e);
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
