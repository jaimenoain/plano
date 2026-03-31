import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
export function sanitizeUsername(input) {
    return input.replace(/[^a-zA-Z0-9_]/g, "");
}
export function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\//g, '-') // Replace / with - (e.g. Face/Off -> face-off)
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/[^\w-]+/g, '') // Remove all non-word chars (hyphen allowed)
        .replace(/-+/g, '-') // Replace multiple - with single -
        .replace(/^-+/, '') // Trim - from start of text
        .replace(/-+$/, ''); // Trim - from end of text
}
export function isMobileDevice() {
    if (typeof window === "undefined")
        return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent);
}
export function createGoogleCalendarUrl(event) {
    const formatTime = (date) => {
        return date.toISOString().replace(/[-:]/g, "").split('.')[0] + "Z";
    };
    const start = formatTime(event.startTime);
    const end = event.endTime ? formatTime(event.endTime) : formatTime(new Date(event.startTime.getTime() + 2 * 60 * 60 * 1000)); // Default 2 hours
    const details = encodeURIComponent(event.description || "");
    const text = encodeURIComponent(event.title);
    const location = encodeURIComponent(event.location || "");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${location}`;
}
export function parseHomeBase(raw) {
    if (!raw)
        return { type: "physical", value: "" };
    try {
        if (raw.startsWith("{")) {
            const parsed = JSON.parse(raw);
            if (parsed.type) {
                if (parsed.type === 'physical') {
                    return { type: 'physical', value: parsed.value || "", physical: parsed.value || "" };
                }
                if (parsed.type === 'virtual') {
                    return { type: 'virtual', value: parsed.value || "", virtual: parsed.value || "" };
                }
                if (parsed.type === 'hybrid') {
                    return {
                        type: 'hybrid',
                        value: parsed.physical || parsed.value || "",
                        physical: parsed.physical || "",
                        virtual: parsed.virtual || ""
                    };
                }
            }
        }
    }
    catch (_e) {
        // Fallback
    }
    return { type: "physical", value: raw, physical: raw };
}
export function sanitizeUrl(url) {
    if (!url)
        return "";
    const trimmed = url.trim();
    if (!trimmed)
        return "";
    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }
    return `https://${trimmed}`;
}
export function isValidUUID(uuid) {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
}
export function toTitleCase(str) {
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}
