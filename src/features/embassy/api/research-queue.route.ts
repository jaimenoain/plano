import { type ActionFunctionArgs } from "react-router";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { logApiRequest } from "~/lib/api-logger.server";
import { RESEARCH_SYSTEM_PROMPT } from "./building-research.route";

// ─── constants ────────────────────────────────────────────────────────────────

const TARGET_QUEUE_SIZE = 10;

// ─── schemas ──────────────────────────────────────────────────────────────────

const bodySchema = z.object({
  action: z.literal("fill"),
  chapter_id: z.string().uuid(),
});

// ─── types ────────────────────────────────────────────────────────────────────

type QueueCandidate = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  popularity_score: number;
  current_year_completed: number | null;
  current_status: string | null;
  current_alt_name: string | null;
  current_access_level: string | null;
  current_access_logistics: string | null;
  current_access_cost: string | null;
  current_access_notes: string | null;
  current_size_sqm: number | null;
  current_height_m: number | null;
  current_storeys: number | null;
  current_category_name: string | null;
  typologies_count: number;
  style_count: number;
  materiality_count: number;
  context_count: number;
};

type ResearchDataPoint = {
  field: string;
  label: string;
  value: string | number | string[];
  source_url: string | null;
  snippet: string | null;
};

// ─── action handler ───────────────────────────────────────────────────────────

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

  const { data: membership } = await supabase
    .from("ambassador_memberships")
    .select("chapter_id, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) {
    return Response.json({ error: "Forbidden" }, { status: 403, headers });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400, headers });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400, headers });
  }

  const { chapter_id } = parsed.data;

  // Only allow ambassadors to fill their own chapter's queue
  if (membership.chapter_id !== chapter_id) {
    return Response.json({ error: "Forbidden" }, { status: 403, headers });
  }

  // ── 1. Check current pending count ─────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: queueRows, error: queueCountError } = await (supabase as any).rpc(
    "get_ambassador_research_queue",
    { p_chapter_id: chapter_id, p_limit: TARGET_QUEUE_SIZE },
  );
  if (queueCountError) {
    // Migration not yet applied or function unavailable — bail early rather
    // than falling through to the candidates RPC which will also fail.
    return Response.json(
      { error: "Research queue unavailable", code: "db_error" },
      { status: 503, headers },
    );
  }
  const currentPendingCount = Array.isArray(queueRows) ? queueRows.length : 0;

  if (currentPendingCount >= TARGET_QUEUE_SIZE) {
    return Response.json(
      { skipped: "queue_full", pending: currentPendingCount },
      { headers },
    );
  }

  const needed = TARGET_QUEUE_SIZE - currentPendingCount;

  // ── 2. Get candidate buildings ──────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: candidates, error: candidatesError } = await (supabase as any).rpc(
    "get_ambassador_research_queue_candidates",
    { p_chapter_id: chapter_id, p_limit: needed },
  );

  if (candidatesError) {
    return Response.json(
      { error: "Failed to fetch candidates" },
      { status: 500, headers },
    );
  }

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return Response.json({ skipped: "no_candidates", pending: currentPendingCount }, { headers });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "AI research not configured" },
      { status: 503, headers },
    );
  }

  const client = new Anthropic({ apiKey });
  const model = "claude-sonnet-4-6";

  // ── 3. Research each candidate concurrently ─────────────────────────────────
  const results = await Promise.allSettled(
    (candidates as QueueCandidate[]).map((building) =>
      researchAndQueueBuilding(client, model, supabase, chapter_id, building),
    ),
  );

  const researched = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  void logApiRequest(supabase, {
    endpoint: "/api/embassy/research-queue",
    statusCode: 200,
    durationMs: 0,
    userId: user.id,
    model,
    metadata: { chapter_id, researched, failed, needed },
  });

  return Response.json({ ok: true, researched, failed }, { headers });
}

// ─── helpers ──────────────────────────────────────────────────────────────────

async function researchAndQueueBuilding(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  model: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  chapterId: string,
  building: QueueCandidate,
): Promise<void> {
  const locationParts = [building.address, building.city, building.country]
    .filter(Boolean)
    .join(", ");

  const userPrompt = `Research this building and return the JSON object as instructed:

Name: ${building.name}
Location: ${locationParts || "unknown"}

Use web_search to find: year completed, current status, alternative name, functional category, typologies, architectural styles, materiality, urban context, access details (level/logistics/cost/notes), and size (floor area, height, storeys).`;

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: RESEARCH_SYSTEM_PROMPT,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = (response.content as Array<{ type: string; text?: string }>).find(
    (b) => b.type === "text",
  );

  if (!textBlock?.text) return;

  const jsonMatch = textBlock.text.match(/\{[\s\S]*"data_points"[\s\S]*\}/);
  if (!jsonMatch) return;

  const raw = JSON.parse(jsonMatch[0]) as { data_points?: ResearchDataPoint[] };
  const data_points = Array.isArray(raw.data_points) ? raw.data_points : [];

  if (data_points.length === 0) return;

  // Build current_values snapshot
  const current_values: Record<string, unknown> = {
    year_completed: building.current_year_completed,
    status: building.current_status,
    alt_name: building.current_alt_name,
    access_level: building.current_access_level,
    access_logistics: building.current_access_logistics,
    access_cost: building.current_access_cost,
    access_notes: building.current_access_notes,
    size_sqm: building.current_size_sqm,
    height_m: building.current_height_m,
    storeys: building.current_storeys,
    category: building.current_category_name,
    typologies_count: building.typologies_count ?? 0,
    style_count: building.style_count ?? 0,
    materiality_count: building.materiality_count ?? 0,
    context_count: building.context_count ?? 0,
  };

  // Insert into queue (ON CONFLICT DO NOTHING to handle race conditions)
  const { error: upsertError } = await supabase
    .from("ambassador_building_research_queue")
    .upsert(
      {
        chapter_id: chapterId,
        building_id: building.id,
        building_name: building.name,
        data_points,
        current_values,
        status: "pending",
        researched_at: new Date().toISOString(),
      },
      { onConflict: "chapter_id,building_id", ignoreDuplicates: true },
    );
  if (upsertError) throw upsertError;
}
