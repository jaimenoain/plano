/** Minimum recent-likes count before the badge renders. */
const VELOCITY_THRESHOLD = 5;

interface VelocityBadgeProps {
  recentLikes: number;
  className?: string;
}

/**
 * Small overlay badge shown on high-velocity content.
 * Renders nothing when recentLikes < VELOCITY_THRESHOLD.
 */
export function VelocityBadge({ recentLikes, className = "" }: VelocityBadgeProps) {
  if (recentLikes < VELOCITY_THRESHOLD) return null;

  return (
    <div
      className={`inline-flex items-center gap-1 bg-surface-default/90 backdrop-blur-sm px-2 py-0.5 ${className}`}
      aria-label={`${recentLikes} recent likes`}
    >
      <span className="text-[10px] font-medium tracking-[0.12em] text-text-primary uppercase">
        +{recentLikes} recently
      </span>
    </div>
  );
}
