import { type ActionFunctionArgs } from "react-router";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { logApiRequest } from "~/lib/api-logger.server";

// ⚠️  REQUIRED: Add SERPER_API_KEY to .env.local and to the Vercel project environment variables.
//    Without it this route returns 503 and no search runs are created.
//    Get a key at https://serper.dev — the free tier covers initial testing.

const bodySchema = z.object({
  action: z.literal("run"),
  chapter_id: z.string().uuid(),
  force: z.boolean().optional(),
});

const EXTRACTION_SYSTEM_PROMPT = `You are an architectural-events extractor. You are given a Google search result
payload (organic results, knowledge graph, related searches) and you must
extract ALL clearly described upcoming architecture events.

Return ONLY a JSON object — no markdown, no commentary:
{
  "events": [
    {
      "title": "string",
      "description": "string or null",
      "start_at": "ISO 8601 timestamp with timezone, e.g. 2026-06-04T18:00:00+02:00",
      "end_at":   "ISO 8601 timestamp or null",
      "address":  "street + city or null",
      "external_link": "the event organiser's canonical URL",
      "source_url":    "the SERP result URL where you found the event",
      "snippet":       "verbatim or near-verbatim excerpt (max 280 chars)"
    }
  ]
}

Rules:
- ONLY include events. Skip articles, news, retrospectives, calls for entries,
  podcast episodes, online courses, exhibitions with no end date, and
  permanent installations.
- Skip events older than today.
- If a result mentions multiple events, emit one object per event.
- If you cannot determine a real start_at with at least day precision, omit
  the event.
- If unsure, omit. Do not fabricate dates, addresses, or organisers.
- Return {"events": []} if no qualifying events are found.`;

type RawCandidate = {
  title?: string;
  description?: string | null;
  start_at?: string;
  end_at?: string | null;
  address?: string | null;
  external_link?: string | null;
  source_url?: string;
  snippet?: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function markRunFailed(supabase: any, runId: string, errorMsg: string) {
  await supabase
    .from("embassy_event_search_runs")
    .update({ status: "failed", completed_at: new Date().toISOString(), error: errorMsg })
    .eq("id", runId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function markRunSuccess(supabase: any, runId: string, chapterId: string, itemsFound: number) {
  await Promise.all([
    supabase
      .from("embassy_event_search_runs")
      .update({ status: "success", completed_at: new Date().toISOString(), items_found: itemsFound })
      .eq("id", runId),
    // Use the SECURITY DEFINER RPC — ambassador_chapters UPDATE is admin-only,
    // but the route already verified active chapter membership before reaching here.
    supabase.rpc("stamp_chapter_last_event_search_at", { p_chapter_id: chapterId }),
  ]);
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);

  // 1. Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  }

  // 2. Parse body
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

  const { chapter_id, force = false } = parsed.data;

  // 3. Verify active membership in this specific chapter
  const { data: membership } = await supabase
    .from("ambassador_memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("chapter_id", chapter_id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) {
    return Response.json({ error: "Forbidden" }, { status: 403, headers });
  }

  // 4. Load chapter info
  const { data: chapter } = await supabase
    .from("ambassador_chapters")
    .select("locality_id, country_code, last_event_search_at")
    .eq("id", chapter_id)
    .single();

  if (!chapter) {
    return Response.json({ error: "Chapter not found" }, { status: 404, headers });
  }

  // National (no locality) chapters skip event search; stamp the timestamp so the client stops polling
  if (!chapter.locality_id) {
    // Best-effort — only works once migration 20271148000000 is applied
    try {
      await supabase.rpc("stamp_chapter_last_event_search_at", { p_chapter_id: chapter_id });
    } catch { /* no-op */ }
    return Response.json({ ok: true, skipped: "no_locality" }, { headers });
  }

  // 5. Stale-check gate
  const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;
  if (!force && chapter.last_event_search_at) {
    const age = Date.now() - new Date(chapter.last_event_search_at).getTime();
    if (age < FOUR_DAYS_MS) {
      return Response.json(
        { ok: true, skipped: "fresh", last_run_at: chapter.last_event_search_at },
        { headers },
      );
    }
  }

  // 6. force is restricted to leadership roles
  if (force && !["exco", "president"].includes(membership.role)) {
    return Response.json({ error: "Force search requires leadership role" }, { status: 403, headers });
  }

  // 7. Fetch locality name for query
  const { data: locality } = await supabase
    .from("localities")
    .select("name, city_slug")
    .eq("id", chapter.locality_id)
    .single();

  if (!locality) {
    return Response.json({ ok: true, skipped: "locality_not_found" }, { headers });
  }

  // 8. Insert run row
  const { data: run, error: runInsertError } = await supabase
    .from("embassy_event_search_runs")
    .insert({ chapter_id, status: "running" })
    .select("id")
    .single();

  if (runInsertError || !run) {
    return Response.json({ error: "Failed to create run record" }, { status: 500, headers });
  }

  // 9. Serper key check
  const serperKey = process.env.SERPER_API_KEY;
  if (!serperKey) {
    await markRunFailed(supabase, run.id, "serper_not_configured");
    return Response.json({ error: "Event search not configured" }, { status: 503, headers });
  }

  try {
    // 10. Serper search
    const currentYear = new Date().getFullYear();
    const query = `"architecture" OR "architectural" events ${locality.name} ${currentYear}`;

    const serperResp = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: 20 }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!serperResp.ok) {
      await markRunFailed(supabase, run.id, `serper_http_${serperResp.status}`);
      return Response.json({ error: "Search provider error" }, { status: 502, headers });
    }

    const serperData = await serperResp.json();

    // 11. Claude extraction
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      await markRunFailed(supabase, run.id, "anthropic_not_configured");
      void logApiRequest(supabase, {
        endpoint: "/api/embassy/event-search",
        statusCode: 503,
        durationMs: 0,
        userId: user.id,
        errorMessage: "ANTHROPIC_API_KEY not configured",
        metadata: { chapter_id, run_id: run.id },
      });
      return Response.json({ error: "Event search not configured" }, { status: 503, headers });
    }

    const client = new Anthropic({ apiKey: anthropicKey });
    const model = "claude-sonnet-4-6";
    const aiStartMs = Date.now();

    const aiResponse = await client.messages.create({
      model,
      max_tokens: 4096,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: JSON.stringify(serperData) }],
    });

    void logApiRequest(supabase, {
      endpoint: "/api/embassy/event-search",
      statusCode: 200,
      durationMs: Date.now() - aiStartMs,
      userId: user.id,
      model,
      inputTokens: aiResponse.usage?.input_tokens ?? null,
      outputTokens: aiResponse.usage?.output_tokens ?? null,
      metadata: { chapter_id, run_id: run.id },
    });

    const textBlock = aiResponse.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text" || !textBlock.text) {
      await markRunSuccess(supabase, run.id, chapter_id, 0);
      return Response.json({ ok: true, inserted: 0, skipped: 0, duplicates_flagged: 0 }, { headers });
    }

    const jsonMatch = textBlock.text.match(/\{[\s\S]*"events"[\s\S]*\}/);
    if (!jsonMatch) {
      await markRunSuccess(supabase, run.id, chapter_id, 0);
      return Response.json({ ok: true, inserted: 0, skipped: 0, duplicates_flagged: 0 }, { headers });
    }

    const raw = JSON.parse(jsonMatch[0]) as { events?: RawCandidate[] };
    const allCandidates: RawCandidate[] = Array.isArray(raw.events) ? raw.events : [];

    // 12. Filter out events in the past (older than yesterday)
    const yesterday = new Date(Date.now() - 86_400_000);
    const futureCandidates = allCandidates.filter((c) => {
      if (!c.title || !c.start_at || !c.source_url) return false;
      try {
        return new Date(c.start_at) >= yesterday;
      } catch {
        return false;
      }
    });

    // 13. Dedup: fetch existing events for this locality
    const { data: existingEvents } = await supabase
      .from("events")
      .select("id, title, start_at")
      .eq("locality_id", chapter.locality_id)
      .eq("is_deleted", false)
      .gte("start_at", yesterday.toISOString());

    // Also fetch already-pending discoveries to avoid re-inserting
    const { data: pendingDiscoveries } = await supabase
      .from("embassy_event_discoveries")
      .select("title, start_at")
      .eq("chapter_id", chapter_id)
      .eq("status", "pending");

    const normalise = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

    type ExistingEvent = { id: string; title: string; start_at: string };
    const existing: ExistingEvent[] = existingEvents ?? [];

    let inserted = 0;
    let skipped = 0;
    let duplicates_flagged = 0;

    for (const candidate of futureCandidates) {
      const candidateStart = new Date(candidate.start_at!);
      const candidateTitle = normalise(candidate.title!);

      // Skip if already pending for this chapter
      const alreadyPending = (pendingDiscoveries ?? []).some((d) => {
        return (
          normalise(d.title) === candidateTitle &&
          Math.abs(new Date(d.start_at).getTime() - candidateStart.getTime()) < 2 * 86_400_000
        );
      });
      if (alreadyPending) {
        skipped++;
        continue;
      }

      // Check for duplicates in events table
      const TWO_DAYS_MS = 2 * 86_400_000;
      const duplicate = existing.find((e) => {
        const sameTitle = normalise(e.title) === candidateTitle;
        const nearDate =
          Math.abs(new Date(e.start_at).getTime() - candidateStart.getTime()) < TWO_DAYS_MS;
        return sameTitle && nearDate;
      });

      if (duplicate) duplicates_flagged++;

      const { error: insertError } = await supabase.from("embassy_event_discoveries").insert({
        chapter_id,
        locality_id: chapter.locality_id,
        title: candidate.title!,
        description: candidate.description ?? null,
        start_at: candidate.start_at!,
        end_at: candidate.end_at ?? null,
        address: candidate.address ?? null,
        external_link: candidate.external_link ?? null,
        source_url: candidate.source_url!,
        snippet: candidate.snippet ?? null,
        status: "pending",
        duplicate_of_event_id: duplicate?.id ?? null,
      });

      if (!insertError) {
        inserted++;
      } else {
        // eslint-disable-next-line no-console
        console.error("[event-search] insert error:", insertError.message);
        skipped++;
      }
    }

    await markRunSuccess(supabase, run.id, chapter_id, inserted);
    return Response.json({ ok: true, inserted, skipped, duplicates_flagged }, { headers });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await markRunFailed(supabase, run.id, msg);
    void logApiRequest(supabase, {
      endpoint: "/api/embassy/event-search",
      statusCode: 500,
      durationMs: 0,
      userId: user.id,
      errorMessage: msg,
      metadata: { chapter_id, run_id: run.id },
    });
    // eslint-disable-next-line no-console
    console.error("[event-search] unexpected error:", msg);
    return Response.json({ error: "Internal server error" }, { status: 500, headers });
  }
}
