/** GA4 measurement ID from `VITE_GA_MEASUREMENT_ID`. Undefined when unset or empty — analytics stays off. */
const raw = (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined)?.trim();
export const GA_MEASUREMENT_ID: string | undefined = raw || undefined;
