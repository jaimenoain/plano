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
 * These are the *system* faces — the monochrome percentile ladder used on every map
 * surface, plus the photography-gap heatmap. `brand-accent` (lime, #BEFF00) is
 * rationed to the primary-CTA fill, focus rings, the hover arrow and one
 * `.accent-tag` — a lime marker is a bug. See docs/DESIGN_TOKENS.md and
 * design-system/.../CHECKLIST.md.
 *
 * A collection owner's chosen marker colour (ADR 0033) is a *different* thing: it is
 * member data read from `collections.marker_styles`, validated by
 * `src/features/collections/markerStyles.ts`, and flows to `backgroundColor` as a
 * runtime value — never a literal added to this file.
 *
 * Every value here is OPAQUE. A translucent face lets the basemap read through the pin,
 * and on the pale positron style that is the difference between a marker and no marker at
 * all — the retired `surfaceMuted80` was exactly that bug. De-emphasis is expressed by
 * `ghostFill()` (lost buildings) or by `PinStyle.opacity` (the collection discovery layer),
 * never by baking alpha into a ladder step.
 */
export const MAP_MARKER_FILL = {
  /** --brand-primary / --text-primary */
  brandPrimary: "#171717",
  /** --surface-muted */
  surfaceMuted: "#F5F5F5",
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

/**
 * The resting separation shadow every marker carries.
 *
 * A pin sits on arbitrary cartography, not on our own page canvas, so the flat-shadow rule
 * of the design system (§11 "flat shadows") does not reach here: a white face on the pale
 * positron basemap has nothing else to separate it. Tight and blurless-ish on purpose —
 * this is an edge, not an elevation.
 *
 * Inline rather than a `shadow-*` utility for two reasons: markers are portaled onto the
 * canvas container, and `src/index.css`'s `.ds-rollout` guardrail `!important`-strips
 * `shadow-sm|md|lg|xl|2xl` from every descendant.
 */
export const MAP_MARKER_SHADOW = "0 1px 2px rgba(0, 0, 0, 0.25)";

/** How much of a lost building's face survives. */
const GHOST_ALPHA = 0.55;

/**
 * The "no longer standing" face: the fill fades, nothing else does.
 *
 * A blanket `opacity` would take the ring, the rating dots and the icon down with it, which
 * is how Lost buildings became unfindable. What is left is a hollow pin — full-strength
 * outline, barely-there face — which is what "was here once" should look like.
 *
 * Deliberately plain `rgba()` rather than `color-mix()`: a fill a renderer does not
 * understand is dropped, and a dropped fill is a pin nobody can see. Anything that is not a
 * 3- or 6-digit hex (no such fill exists today, but collection colours are member data)
 * comes back unghosted rather than risking that.
 */
export function ghostFill(color: string): string {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color)?.[1];
  if (!hex) return color;
  const full = hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${GHOST_ALPHA})`;
}
