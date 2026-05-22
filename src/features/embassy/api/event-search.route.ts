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
      void logApiRequest(supabase, {
        endpoint: "/api/embassy/event-search",
        statusCode: 200,
        durationMs: 0,
        userId: user.id,
        metadata: {
          chapter_id,
          exit_reason: "skipped_fresh",
          last_run_at: chapter.last_event_search_at,
          age_hours: Math.round(age / 3_600_000),
        },
      });
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
  // NOTE: the localities table column is `city`, not `name`. Selecting a
  // non-existent column makes PostgREST return an error and `data: null`,
  // which previously caused every call to silently early-return with
  // skipped: "locality_not_found" — no run row, no log, no stamp, UI stuck
  // on "Search in progress" forever.
  const { data: locality, error: localityError } = await supabase
    .from("localities")
    .select("city, city_slug")
    .eq("id", chapter.locality_id)
    .single();

  if (localityError || !locality) {
    // eslint-disable-next-line no-console
    console.error("[event-search] locality fetch failed:", localityError?.message ?? "no row");
    void logApiRequest(supabase, {
      endpoint: "/api/embassy/event-search",
      statusCode: 200,
      durationMs: 0,
      userId: user.id,
      errorMessage: localityError?.message ?? "locality_not_found",
      metadata: { chapter_id, locality_id: chapter.locality_id },
    });
    return Response.json(
      { ok: true, skipped: "locality_not_found", reason: localityError?.message ?? null },
      { headers },
    );
  }

  // 8. Insert run row
  const { data: run, error: runInsertError } = await supabase
    .from("embassy_event_search_runs")
    .insert({ chapter_id, status: "running" })
    .select("id")
    .single();

  if (runInsertError || !run) {
    // Most common cause historically: RLS blocking the INSERT for non-admin
    // ambassadors (migration 20271148000000 fixes this). Log explicitly so the
    // failure is visible in the API Requests admin page instead of silently
    // leaving the UI on "Search in progress".
    void logApiRequest(supabase, {
      endpoint: "/api/embassy/event-search",
      statusCode: 500,
      durationMs: 0,
      userId: user.id,
      errorMessage: `run_insert_failed: ${runInsertError?.message ?? "unknown"}`,
      metadata: {
        chapter_id,
        exit_reason: "run_insert_failed",
        pg_code: runInsertError?.code ?? null,
        pg_details: runInsertError?.details ?? null,
        pg_hint: runInsertError?.hint ?? null,
      },
    });
    return Response.json({ error: "Failed to create run record" }, { status: 500, headers });
  }

  // 9. Serper key check
  const serperKey = process.env.SERPER_API_KEY;
  if (!serperKey) {
    await markRunFailed(supabase, run.id, "serper_not_configured");
    void logApiRequest(supabase, {
      endpoint: "/api/embassy/event-search",
      statusCode: 503,
      durationMs: 0,
      userId: user.id,
      errorMessage: "SERPER_API_KEY not configured",
      metadata: { chapter_id, run_id: run.id, exit_reason: "serper_not_configured" },
    });
    return Response.json({ error: "Event search not configured" }, { status: 503, headers });
  }

  // Diagnostic counters — emitted to api_request_logs at the end so failures
  // and "found 0" runs can be debugged from the admin API Requests page.
  const stats: Record<string, unknown> = {
    chapter_id,
    run_id: run.id,
    locality_name: locality.city,
    force,
  };
  const requestStartMs = Date.now();
  let model: string | null = null;
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;

  try {
    // 10. Serper search
    // NOTE: Serper's free tier rejects queries that use operators like
    // `OR` combined with quoted phrases (HTTP 400 "Query pattern not
    // allowed for free accounts"). Keep the query plain — Google handles
    // morphological variants of "architecture" without needing OR.
    const currentYear = new Date().getFullYear();
    const query = `architecture events ${locality.city} ${currentYear}`;
    stats.query = query;

    const serperBody: { q: string; num: number; gl?: string } = { q: query, num: 20 };
    if (chapter.country_code) {
      serperBody.gl = chapter.country_code.toLowerCase();
    }

    const serperResp = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
      body: JSON.stringify(serperBody),
      signal: AbortSignal.timeout(30_000),
    });

    if (!serperResp.ok) {
      const errorBody = await serperResp.text().catch(() => "");
      stats.serper_error_body = errorBody.slice(0, 500);
      await markRunFailed(supabase, run.id, `serper_http_${serperResp.status}: ${errorBody.slice(0, 200)}`);
      void logApiRequest(supabase, {
        endpoint: "/api/embassy/event-search",
        statusCode: 502,
        durationMs: Date.now() - requestStartMs,
        userId: user.id,
        errorMessage: `serper_http_${serperResp.status}: ${errorBody.slice(0, 200)}`,
        metadata: stats,
      });
      return Response.json({ error: "Search provider error" }, { status: 502, headers });
    }

    const serperData = await serperResp.json();
    stats.serper_organic_count = Array.isArray(serperData?.organic) ? serperData.organic.length : 0;
    stats.serper_knowledge_graph = !!serperData?.knowledgeGraph;

    // 11. Claude extraction
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      await markRunFailed(supabase, run.id, "anthropic_not_configured");
      void logApiRequest(supabase, {
        endpoint: "/api/embassy/event-search",
        statusCode: 503,
        durationMs: Date.now() - requestStartMs,
        userId: user.id,
        errorMessage: "ANTHROPIC_API_KEY not configured",
        metadata: stats,
      });
      return Response.json({ error: "Event search not configured" }, { status: 503, headers });
    }

    const client = new Anthropic({ apiKey: anthropicKey });
    model = "claude-sonnet-4-6";

    const aiResponse = await client.messages.create({
      model,
      max_tokens: 4096,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: JSON.stringify(serperData) }],
    });
    inputTokens = aiResponse.usage?.input_tokens ?? null;
    outputTokens = aiResponse.usage?.output_tokens ?? null;

    const textBlock = aiResponse.content.find((b) => b.type === "text");
    const claudeText = textBlock && textBlock.type === "text" ? textBlock.text : "";
    stats.claude_text_length = claudeText.length;
    if (!claudeText) {
      stats.exit_reason = "empty_ai_response";
      await markRunSuccess(supabase, run.id, chapter_id, 0);
      void logApiRequest(supabase, {
        endpoint: "/api/embassy/event-search",
        statusCode: 200,
        durationMs: Date.now() - requestStartMs,
        userId: user.id,
        model,
        inputTokens,
        outputTokens,
        metadata: stats,
      });
      return Response.json({ ok: true, inserted: 0, skipped: 0, duplicates_flagged: 0 }, { headers });
    }

    const jsonMatch = claudeText.match(/\{[\s\S]*"events"[\s\S]*\}/);
    if (!jsonMatch) {
      stats.exit_reason = "no_json_match";
      stats.claude_text_preview = claudeText.slice(0, 500);
      await markRunSuccess(supabase, run.id, chapter_id, 0);
      void logApiRequest(supabase, {
        endpoint: "/api/embassy/event-search",
        statusCode: 200,
        durationMs: Date.now() - requestStartMs,
        userId: user.id,
        model,
        inputTokens,
        outputTokens,
        metadata: stats,
      });
      return Response.json({ ok: true, inserted: 0, skipped: 0, duplicates_flagged: 0 }, { headers });
    }

    // Greedy match can capture trailing prose after the JSON object. If parse
    // fails on the full match, retry against a shrinking tail until either we
    // find a parseable object or we give up. Avoids the previous behaviour of
    // bubbling to the outer catch (which marks failed but does NOT stamp
    // last_event_search_at — leaving the UI polling forever in-session).
    let raw: { events?: RawCandidate[] } | null = null;
    let parseError: string | null = null;
    try {
      raw = JSON.parse(jsonMatch[0]) as { events?: RawCandidate[] };
    } catch (e) {
      parseError = e instanceof Error ? e.message : String(e);
      const lastBrace = jsonMatch[0].lastIndexOf("}");
      if (lastBrace > 0) {
        try {
          raw = JSON.parse(jsonMatch[0].slice(0, lastBrace + 1)) as { events?: RawCandidate[] };
          parseError = null;
        } catch {
          /* fall through with parseError set */
        }
      }
    }

    if (!raw) {
      stats.exit_reason = "parse_error";
      stats.parse_error = parseError;
      stats.claude_text_preview = claudeText.slice(0, 500);
      // Stamp anyway so the UI exits the polling state. Manual retry (force=true)
      // gives leadership a way to re-run without waiting 4 days.
      await markRunSuccess(supabase, run.id, chapter_id, 0);
      void logApiRequest(supabase, {
        endpoint: "/api/embassy/event-search",
        statusCode: 200,
        durationMs: Date.now() - requestStartMs,
        userId: user.id,
        model,
        inputTokens,
        outputTokens,
        errorMessage: `claude_parse_error: ${parseError}`,
        metadata: stats,
      });
      return Response.json({ ok: true, inserted: 0, skipped: 0, duplicates_flagged: 0 }, { headers });
    }

    const allCandidates: RawCandidate[] = Array.isArray(raw.events) ? raw.events : [];
    stats.raw_candidate_count = allCandidates.length;

    // 12. Filter out events in the past (older than yesterday)
    const yesterday = new Date(Date.now() - 86_400_000);
    let droppedMissingFields = 0;
    let droppedPast = 0;
    const futureCandidates = allCandidates.filter((c) => {
      if (!c.title || !c.start_at || !c.source_url) {
        droppedMissingFields++;
        return false;
      }
      try {
        const d = new Date(c.start_at);
        if (isNaN(d.getTime())) {
          droppedMissingFields++;
          return false;
        }
        if (d < yesterday) {
          droppedPast++;
          return false;
        }
        return true;
      } catch {
        droppedMissingFields++;
        return false;
      }
    });
    stats.dropped_missing_fields = droppedMissingFields;
    stats.dropped_past = droppedPast;
    stats.future_candidate_count = futureCandidates.length;

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

    stats.existing_events_count = existingEvents?.length ?? 0;
    stats.pending_discoveries_count = pendingDiscoveries?.length ?? 0;

    const normalise = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

    type ExistingEvent = { id: string; title: string; start_at: string };
    const existing: ExistingEvent[] = existingEvents ?? [];

    let inserted = 0;
    let skipped_already_pending = 0;
    let insert_errors = 0;
    let duplicates_flagged = 0;
    const insertErrorMessages: string[] = [];

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
        skipped_already_pending++;
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
        insert_errors++;
        insertErrorMessages.push(insertError.message);
        // eslint-disable-next-line no-console
        console.error("[event-search] insert error:", insertError.message);
      }
    }

    stats.inserted = inserted;
    stats.skipped_already_pending = skipped_already_pending;
    stats.duplicates_flagged = duplicates_flagged;
    stats.insert_errors = insert_errors;
    if (insertErrorMessages.length > 0) {
      stats.insert_error_sample = insertErrorMessages.slice(0, 3);
    }
    stats.exit_reason = "ok";

    await markRunSuccess(supabase, run.id, chapter_id, inserted);
    void logApiRequest(supabase, {
      endpoint: "/api/embassy/event-search",
      statusCode: 200,
      durationMs: Date.now() - requestStartMs,
      userId: user.id,
      model,
      inputTokens,
      outputTokens,
      errorMessage: insert_errors > 0 ? `insert_errors=${insert_errors}` : null,
      metadata: stats,
    });
    return Response.json(
      { ok: true, inserted, skipped: skipped_already_pending, duplicates_flagged },
      { headers },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    stats.exit_reason = "exception";
    await markRunFailed(supabase, run.id, msg);
    void logApiRequest(supabase, {
      endpoint: "/api/embassy/event-search",
      statusCode: 500,
      durationMs: Date.now() - requestStartMs,
      userId: user.id,
      model,
      inputTokens,
      outputTokens,
      errorMessage: msg,
      metadata: stats,
    });
    // eslint-disable-next-line no-console
    console.error("[event-search] unexpected error:", msg);
    return Response.json({ error: "Internal server error" }, { status: 500, headers });
  }
}
