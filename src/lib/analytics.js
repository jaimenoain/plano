/** GA4 measurement ID from `VITE_GA_MEASUREMENT_ID`. Undefined when unset or empty — analytics stays off. */
const raw = String(import.meta.env.VITE_GA_MEASUREMENT_ID ?? "").trim();
export const GA_MEASUREMENT_ID = raw || undefined;
