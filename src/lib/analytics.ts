/** GA4 measurement ID — override with `VITE_GA_MEASUREMENT_ID` in env if it changes. */
export const GA_MEASUREMENT_ID: string =
  (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined) || "G-V8H7C4CD0G";
