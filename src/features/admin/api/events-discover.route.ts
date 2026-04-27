import { type ActionFunctionArgs } from "react-router";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createSupabaseServerClient } from "~/lib/supabase.server";

const bodySchema = z.object({
  query: z.string().min(3).max(500),
});

export type DiscoveredEvent = {
  title: string;
  description: string | null;
  startAt: string;
  endAt: string | null;
  address: string | null;
  externalLink: string | null;
};

const SYSTEM_PROMPT = `You are an assistant that finds real upcoming architecture events worldwide.
When given a search query, use web_search to find actual architecture events: open houses, exhibitions, tours, lectures, biennales, and festivals.
After searching, return ONLY a JSON object in this exact structure with no other text before or after:
{
  "events": [
    {
      "title": "Event name",
      "description": "Brief description, 1-3 sentences.",
      "startAt": "2026-05-15T09:00:00Z",
      "endAt": "2026-05-15T18:00:00Z",
      "address": "Full venue address or city and country",
      "externalLink": "https://example.com"
    }
  ]
}
Rules:
- Only include real, verifiable events. Do not invent events.
- Include up to 8 events.
- For endAt and externalLink, use null if unknown.
- startAt must be a valid ISO 8601 datetime string.
- Return only the JSON object, no markdown, no explanation.`;

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "app_admin"].includes(profile.role ?? "")) {
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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "AI search not configured. Set ANTHROPIC_API_KEY in environment variables." },
      { status: 503, headers },
    );
  }

  const client = new Anthropic({ apiKey });

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (client.messages.create as any)({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [
        {
          role: "user",
          content: `Search for architecture events matching this query: ${parsed.data.query}`,
        },
      ],
    });

    const textBlock = (response.content as Array<{ type: string; text?: string }>).find(
      (b) => b.type === "text",
    );

    if (!textBlock?.text) {
      return Response.json({ events: [] }, { headers });
    }

    const jsonMatch = textBlock.text.match(/\{[\s\S]*"events"[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ events: [] }, { headers });
    }

    const result = JSON.parse(jsonMatch[0]) as { events?: DiscoveredEvent[] };
    const events = Array.isArray(result.events) ? result.events : [];

    return Response.json({ events }, { headers });
  } catch (err) {
    console.error("AI event discovery failed:", err);
    return Response.json(
      { error: "Search failed. Check your Anthropic API key and plan." },
      { status: 500, headers },
    );
  }
}
