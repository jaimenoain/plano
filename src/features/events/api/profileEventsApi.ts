import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { EventCardDTO } from "@/features/events/types";
import { EVENT_CARD_LIST_COLUMNS, hydrateEventRowsToCards } from "@/features/events/api/eventsApi";
import type { Tables } from "@/integrations/supabase/types";

type EventRow = Tables<"events">;

/** `event_attendances` exists on the hosted DB; regenerate `types.ts` when CLI access is available. */
const attendanceClient = supabase as unknown as SupabaseClient;

export async function fetchProfileOrganisingEventCards(input: {
  userId: string;
  personIds: string[];
  companyIds: string[];
}): Promise<EventCardDTO[]> {
  const { userId, personIds, companyIds } = input;
  const orParts = [`organiser_user_id.eq.${userId}`];
  if (personIds.length > 0) {
    orParts.push(`organiser_person_id.in.(${personIds.join(",")})`);
  }
  if (companyIds.length > 0) {
    orParts.push(`organiser_company_id.in.(${companyIds.join(",")})`);
  }

  const { data: rows, error } = await supabase
    .from("events")
    .select(EVENT_CARD_LIST_COLUMNS)
    .eq("is_deleted", false)
    .or(orParts.join(","))
    .order("start_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return hydrateEventRowsToCards((rows ?? []) as EventRow[]);
}

type AttendanceStatus = "going" | "interested";
type TimeFilter = "upcoming" | "past";

export async function fetchProfileAttendanceEventCards(input: {
  userId: string;
  status: AttendanceStatus;
  time: TimeFilter;
}): Promise<EventCardDTO[]> {
  const nowIso = new Date().toISOString();

  const { data: joined, error: joinError } = await attendanceClient
    .from("event_attendances")
    .select(
      `
      events!inner (
        ${EVENT_CARD_LIST_COLUMNS}
      )
    `,
    )
    .eq("user_id", input.userId)
    .eq("status", input.status);

  if (joinError) throw joinError;

  type JoinRow = { events: EventRow | EventRow[] | null };
  const rawRows = (joined ?? []) as JoinRow[];
  const eventRows: EventRow[] = [];
  for (const row of rawRows) {
    const ev = row.events;
    if (!ev) continue;
    if (Array.isArray(ev)) {
      for (const e of ev) {
        if (e && !e.is_deleted) eventRows.push(e);
      }
    } else if (!ev.is_deleted) {
      eventRows.push(ev);
    }
  }

  const upcoming = input.time === "upcoming";
  const filtered = eventRows.filter((e) => {
    if (upcoming) return e.start_at >= nowIso;
    return e.start_at < nowIso;
  });

  filtered.sort((a, b) => {
    const cmp = a.start_at.localeCompare(b.start_at);
    return upcoming ? cmp : -cmp;
  });

  const limited = filtered.slice(0, 20);
  return hydrateEventRowsToCards(limited);
}

export async function fetchProfilePastAttendanceCount(input: {
  userId: string;
  status: AttendanceStatus;
}): Promise<number> {
  const nowIso = new Date().toISOString();
  const { data: links, error } = await attendanceClient
    .from("event_attendances")
    .select("event_id")
    .eq("user_id", input.userId)
    .eq("status", input.status);

  if (error) throw error;
  const ids = [...new Set((links ?? []).map((l: { event_id: string }) => l.event_id))];
  if (ids.length === 0) return 0;

  const { count, error: countError } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .in("id", ids)
    .eq("is_deleted", false)
    .lt("start_at", nowIso);

  if (countError) throw countError;
  return count ?? 0;
}
