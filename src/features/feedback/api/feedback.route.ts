import { type ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "~/lib/supabase.server";

const feedbackSchema = z.object({
  type: z.enum(["bug", "ux_improvement", "feature_idea", "other"]),
  message: z.string().min(10).max(2000),
  pageUrl: z.string().optional(),
  userAgent: z.string().optional(),
  consoleErrors: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
  screenshotDataUrl: z.string().optional(),
});

function getServiceClient() {
  const url =
    import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400, headers });
  }

  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten() },
      { status: 400, headers }
    );
  }

  const {
    type,
    message,
    pageUrl,
    userAgent,
    consoleErrors,
    metadata,
    screenshotDataUrl,
  } = parsed.data;

  // Rate limit: max 20 submissions per user per hour
  const { count } = await supabase
    .from("feedback")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", new Date(Date.now() - 3_600_000).toISOString());

  if ((count ?? 0) >= 20) {
    return Response.json(
      { error: "Too many submissions" },
      { status: 429, headers }
    );
  }

  const { data: row, error: insertError } = await supabase
    .from("feedback")
    .insert({
      user_id: user.id,
      type,
      message,
      page_url: pageUrl ?? null,
      user_agent: userAgent ?? null,
      console_errors: consoleErrors ?? [],
      metadata: metadata ?? {},
      status: "open",
    })
    .select("id")
    .single();

  if (insertError || !row) {
    void insertError;
    return Response.json(
      { error: "Insert failed" },
      { status: 500, headers }
    );
  }

  // Screenshot upload (service role client, fail silently)
  if (screenshotDataUrl) {
    try {
      const base64 = screenshotDataUrl.replace(/^data:image\/\w+;base64,/, "");
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const storagePath = `${user.id}/${row.id}.webp`;
      const serviceClient = getServiceClient();
      if (serviceClient) {
        const { error: uploadError } = await serviceClient.storage
          .from("feedback-screenshots")
          .upload(storagePath, bytes, { contentType: "image/webp", upsert: true });
        if (uploadError) {
          void uploadError;
        } else {
          await supabase
            .from("feedback")
            .update({ screenshot_path: storagePath })
            .eq("id", row.id);
        }
      }
    } catch (err) {
      void err;
    }
  }

  // Webhook (fire-and-forget)
  const webhookUrl = process.env.FEEDBACK_WEBHOOK_URL;
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        message: message.slice(0, 200),
        pageUrl: pageUrl ?? null,
        createdAt: new Date().toISOString(),
      }),
    }).catch((err) => {
      void err;
    });
  }

  return Response.json({ ok: true }, { status: 201, headers });
}
