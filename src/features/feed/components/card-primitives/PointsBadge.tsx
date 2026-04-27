/**
 * Award points badge. Renders filled black dots only — no empty placeholders.
 * Shows nothing when points === 0. Points are an award (like Michelin stars),
 * not a score, so absence is neutral and must not be visualised.
 * Uses bg-text-primary (monochromatic) — brand-primary is forbidden on content pages.
 */
export function PointsBadge({ points }: { points: number }) {
  if (!points || points <= 0) return null;
  return (
    <div
      className="inline-flex items-center gap-1 py-[3px] px-2 bg-surface-muted rounded-sm"
      title={`${points} ${points === 1 ? "point" : "points"}`}
    >
      {Array.from({ length: points }).map((_, i) => (
        <div key={i} className="w-[7px] h-[7px] rounded-full bg-text-primary" />
      ))}
    </div>
  );
}
