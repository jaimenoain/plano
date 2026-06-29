/** Minimal client-side iCalendar (.ics) generation for "Add to calendar". */

function toIcsDate(iso: string): string {
  // → YYYYMMDDTHHMMSSZ (UTC basic format)
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export type IcsEventInput = {
  uid: string;
  title: string;
  startAt: string;
  endAt: string | null;
  description?: string | null;
  location?: string | null;
  url?: string | null;
};

/** Builds a single-event VCALENDAR string. Falls back to a 1-hour block when `endAt` is missing. */
export function buildEventIcs(event: IcsEventInput): string {
  const start = toIcsDate(event.startAt);
  const end = toIcsDate(
    event.endAt ?? new Date(new Date(event.startAt).getTime() + 60 * 60 * 1000).toISOString(),
  );

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Plano//Events//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.uid}@plano.app`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];

  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  if (event.url) lines.push(`URL:${escapeIcsText(event.url)}`);

  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

/** Triggers a browser download of the given event as an `.ics` file. */
export function downloadEventIcs(event: IcsEventInput, fileName = "event.ics"): void {
  const blob = new Blob([buildEventIcs(event)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
