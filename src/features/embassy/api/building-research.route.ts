import { type ActionFunctionArgs } from "react-router";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { logApiRequest } from "~/lib/api-logger.server";

// ---------- shared types (exported for the UI) ----------

export type ResearchDataPoint = {
  field: string;
  label: string;
  value: string | number | string[];
  source_url: string | null;
  snippet: string | null;
};

export type BuildingResearchResult = {
  building_id: string;
  building_name: string;
  data_points: ResearchDataPoint[];
};

// ---------- request schemas ----------

const researchSchema = z.object({
  action: z.literal("research"),
  building_id: z.string().uuid(),
});

const applySchema = z.object({
  action: z.literal("apply"),
  building_id: z.string().uuid(),
  // Only the accepted subset, keyed by field name
  updates: z.record(z.union([z.string(), z.number(), z.array(z.string())])),
});

const bodySchema = z.discriminatedUnion("action", [researchSchema, applySchema]);

// ---------- system prompt ----------

const RESEARCH_SYSTEM_PROMPT = `You are an architectural research assistant.
Given a building name, address, and location, use web_search to find reliable facts about it.
Return ONLY a JSON object — no markdown, no explanation — in this exact structure:

{
  "data_points": [
    {
      "field": "year_completed",
      "label": "Year Completed",
      "value": 2004,
      "source_url": "https://example.com/article",
      "snippet": "The tower was completed in 2004 and opened to..."
    }
  ]
}

Searchable fields and their value types:
- year_completed    → integer year (e.g. 1998)
- status            → one of: "Built", "Under Construction", "Unbuilt", "Lost", "Temporary"
- alt_name          → string — the well-known English alternative name if the building has one (e.g. "Eiffel Tower" for "Tour Eiffel"). Omit if the primary name is already in English.
- category          → string — the primary functional category, one of: "Civic & Institutional", "Commercial", "Cultural", "Educational", "Healthcare", "Industrial", "Infrastructure", "Landscape & Public Space", "Memorial & Sacred", "Mixed Use", "Residential", "Sports & Recreation", "Tourism & Hospitality"
- typologies        → array of strings — specific building types within the category (e.g. ["Museum", "Art Gallery"] or ["Apartment Block", "Housing Estate"]). Use common architectural typology names.
- style             → array of strings — recognised architectural styles (e.g. ["Brutalism", "Modernism", "Art Deco"]). Use established style names only.
- materiality       → array of strings — primary construction materials visible or documented (e.g. ["Concrete", "Glass", "Steel", "Brick"]). Use common material names.
- context           → array of strings — urban or site context descriptors (e.g. ["Urban", "Suburban", "Waterfront", "Campus", "Industrial Zone"]). Use established descriptors.
- access_level      → one of: "public", "private", "restricted", "commercial"
- access_logistics  → one of: "walk-in", "booking_required", "tour_only", "exterior_only"
- access_cost       → one of: "free", "paid", "customers_only"
- access_notes      → short text with practical visitor notes (entry hours, ticket link, booking instructions, known closures). Max 300 characters.
- size_sqm          → number — gross floor area in square metres (e.g. 4200)
- height_m          → number — building height in metres to highest occupied floor or roof (e.g. 32.5)
- storeys           → integer — number of above-ground floors (e.g. 8)

Rules:
- Only include fields you found actual evidence for. Omit uncertain fields entirely.
- For each data_point, source_url must be a real URL and snippet must be a verbatim or near-verbatim excerpt.
- For array-valued fields (typologies, style, materiality, context), the value must be a JSON array of strings, not a comma-separated string.
- Do not invent or hallucinate any data.
- Return only the JSON object.`;

// ---------- action handler ----------

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

  // Verify the caller is an active ambassador
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

  // ---- APPLY: save accepted data points (no AI call — no cost log needed) ----
  if (parsed.data.action === "apply") {
    const { building_id, updates } = parsed.data;

    const { error } = await supabase.rpc("ambassador_apply_building_research", {
      p_building_id: building_id,
      p_updates: updates,
    });

    if (error) {
      if (error.message?.includes("building_out_of_scope")) {
        return Response.json({ error: "Building is not in your chapter scope" }, { status: 403, headers });
      }
      if (error.message?.includes("not_ambassador")) {
        return Response.json({ error: "Not an active ambassador" }, { status: 403, headers });
      }
      // eslint-disable-next-line no-console
      console.error("[building-research] RPC error:", error.message, error.details, error.hint);
      return Response.json({ error: "Failed to save research data" }, { status: 500, headers });
    }

    return Response.json({ ok: true }, { headers });
  }

  // ---- RESEARCH: call Anthropic with web search ----
  const { building_id } = parsed.data;

  const { data: building } = await supabase
    .from("buildings")
    .select("id, name, address, city, country")
    .eq("id", building_id)
    .single();

  if (!building) {
    return Response.json({ error: "Building not found" }, { status: 404, headers });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    void logApiRequest(supabase, {
      endpoint: "/api/embassy/building-research",
      statusCode: 503,
      durationMs: 0,
      userId: user.id,
      errorMessage: "ANTHROPIC_API_KEY not configured",
      metadata: { building_id },
    });
    return Response.json(
      { error: "AI research not configured. Set ANTHROPIC_API_KEY." },
      { status: 503, headers },
    );
  }

  const client = new Anthropic({ apiKey });
  const model = "claude-sonnet-4-6";

  const locationParts = [building.address, building.city, building.country]
    .filter(Boolean)
    .join(", ");
  const userPrompt = `Research this building and return the JSON object as instructed:

Name: ${building.name}
Location: ${locationParts || "unknown"}

Use web_search to find: year completed, current status, alternative name, functional category, typologies, architectural styles, materiality, urban context, access details (level/logistics/cost/notes), and size (floor area, height, storeys).`;

  const startMs = Date.now();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (client.messages.create as any)({
      model,
      max_tokens: 4096,
      system: RESEARCH_SYSTEM_PROMPT,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: userPrompt }],
    });

    const durationMs = Date.now() - startMs;
    const usage = (response as { usage?: { input_tokens?: number; output_tokens?: number } }).usage;

    const textBlock = (response.content as Array<{ type: string; text?: string }>).find(
      (b) => b.type === "text",
    );

    if (!textBlock?.text) {
      void logApiRequest(supabase, {
        endpoint: "/api/embassy/building-research",
        statusCode: 200,
        durationMs,
        userId: user.id,
        model,
        inputTokens: usage?.input_tokens ?? null,
        outputTokens: usage?.output_tokens ?? null,
        metadata: { building_id, data_points: 0 },
      });
      return Response.json(
        { building_id, building_name: building.name, data_points: [] } satisfies BuildingResearchResult,
        { headers },
      );
    }

    const jsonMatch = textBlock.text.match(/\{[\s\S]*"data_points"[\s\S]*\}/);
    if (!jsonMatch) {
      void logApiRequest(supabase, {
        endpoint: "/api/embassy/building-research",
        statusCode: 200,
        durationMs,
        userId: user.id,
        model,
        inputTokens: usage?.input_tokens ?? null,
        outputTokens: usage?.output_tokens ?? null,
        metadata: { building_id, data_points: 0 },
      });
      return Response.json(
        { building_id, building_name: building.name, data_points: [] } satisfies BuildingResearchResult,
        { headers },
      );
    }

    const raw = JSON.parse(jsonMatch[0]) as { data_points?: ResearchDataPoint[] };
    const data_points = Array.isArray(raw.data_points) ? raw.data_points : [];

    void logApiRequest(supabase, {
      endpoint: "/api/embassy/building-research",
      statusCode: 200,
      durationMs,
      userId: user.id,
      model,
      inputTokens: usage?.input_tokens ?? null,
      outputTokens: usage?.output_tokens ?? null,
      metadata: { building_id, data_points: data_points.length },
    });

    return Response.json(
      { building_id, building_name: building.name, data_points } satisfies BuildingResearchResult,
      { headers },
    );
  } catch (err) {
    const durationMs = Date.now() - startMs;
    const errorMessage = err instanceof Error ? err.message : String(err);
    void logApiRequest(supabase, {
      endpoint: "/api/embassy/building-research",
      statusCode: 500,
      durationMs,
      userId: user.id,
      model,
      errorMessage,
      metadata: { building_id },
    });
    return Response.json(
      { error: "AI research failed. Check your Anthropic API key and plan." },
      { status: 500, headers },
    );
  }
}
