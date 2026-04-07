/**
 * Opaque marker face colors for inline `backgroundColor` on map pins.
 * MapLibre markers are portaled onto the canvas container; Tailwind `bg-*`
 * utilities that rely on CSS variables may not paint reliably there.
 * Values mirror `src/index.css` semantic tokens — keep in sync when those change.
 */
export const MAP_MARKER_FILL = {
  brandPrimary: "#BEFF00",
  brandSecondary: "#F7FFE0",
  surfaceMuted: "#F5F5F5",
  surfaceMuted80: "rgba(245, 245, 245, 0.8)",
  white: "#FFFFFF",
} as const;
