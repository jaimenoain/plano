import { format, parseISO } from "date-fns";
import { enGB } from "date-fns/locale";
import type { EventCardDTO } from "@/features/events/types";

/** "Thu 5 Dec · 14:30" — used for card / hero meta lines. */
export function formatEventListWhen(iso: string): string {
  try {
    return format(parseISO(iso), "EEE d MMM · HH:mm", { locale: enGB });
  } catch {
    return "";
  }
}

/** Day/month/weekday parts for the branded date tile. */
export function eventDateParts(iso: string): { day: string; month: string; weekday: string } {
  try {
    const d = parseISO(iso);
    return {
      day: format(d, "d", { locale: enGB }),
      month: format(d, "MMM", { locale: enGB }).toUpperCase(),
      weekday: format(d, "EEE", { locale: enGB }).toUpperCase(),
    };
  } catch {
    return { day: "", month: "", weekday: "" };
  }
}

/** Short "5 Dec" chip label overlaid on cover images. */
export function formatEventChip(iso: string): string {
  try {
    return format(parseISO(iso), "d MMM", { locale: enGB });
  } catch {
    return "";
  }
}

/** Who is presenting the event, for the organiser meta line. */
export function organiserLine(event: EventCardDTO): string {
  if (event.organiser?.displayName) return `Hosted by ${event.organiser.displayName}`;
  if (event.isSelfHosted && event.claimStatus === "claimed") {
    if (event.submittedBy.username) return `Hosted by @${event.submittedBy.username}`;
    return "Hosted by organiser";
  }
  return "Community shared";
}

/** Resolved avatar url to accent the organiser line (organiser logo, else submitter). */
export function organiserAvatarUrl(event: EventCardDTO): string | null {
  return event.organiser?.avatarUrl ?? event.submittedBy.avatarUrl ?? null;
}
