/* eslint-disable no-restricted-syntax -- The one sanctioned hex mirror.
 * MapLibre markers are portaled onto the canvas container, outside the cascade that
 * resolves our CSS custom properties, so `bg-*` utilities cannot be relied on to paint
 * there. Marker faces are therefore set through inline `backgroundColor`, which needs
 * literal values. Keeping every one of them in this single file is what lets the
 * raw-hex guard cover the rest of `src/features/maps/**`. Precedent:
 * `src/components/ui/chart.tsx`.
 *
 * EVERY value below must mirror a semantic token in `src/index.css`. Nothing else
 * belongs here. When a token changes, change it here in the same commit — the reason
 * this file exists is also the reason it silently rots.
 */

/**
 * Opaque marker face colors for inline `backgroundColor` on map pins.
 *
 * Markers are monochrome. `brand-accent` (lime, #BEFF00) is rationed to the primary-CTA
 * fill, focus rings, the hover arrow and one `.accent-tag` — a lime marker is a bug.
 * See docs/DESIGN_TOKENS.md and design-system/.../CHECKLIST.md.
 */
export const MAP_MARKER_FILL = {
  /** --brand-primary / --text-primary */
  brandPrimary: "#171717",
  /** --surface-muted */
  surfaceMuted: "#F5F5F5",
  /** --surface-muted @ 80% — the quietest pin face */
  surfaceMuted80: "rgba(245, 245, 245, 0.8)",
  /** --surface-card / --text-inverse */
  white: "#FFFFFF",

  /* Data-coverage overlay only (the photography-gap heatmap): these encode a
     measurement, not a place, and are the one map layer that stays chromatic. */
  /** --feedback-destructive — no photos */
  feedbackDestructive: "#EF4444",
  /** --feedback-warning — 1–2 photos */
  feedbackWarning: "#F59E0B",
  /** --feedback-success — 3+ photos */
  feedbackSuccess: "#16A34A",
} as const;
