import { Link } from "react-router";

// ─── Props ────────────────────────────────────────────────────────────────────

interface SectionDividerProps {
  label: string;
  href?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * SectionDivider
 *
 * A hairline rule with a centred label. Used as the "From the community"
 * transition marker in the feed (C7-3).
 *
 * - Label: text-2xs / Space Mono / uppercase / tracking-wide / text-text-disabled
 * - When `href` is provided the label becomes a React Router <Link> with
 *   a → suffix. Hover lifts colour from text-disabled → text-secondary.
 *   No underline, no weight change — deliberately metadata-quiet.
 * - Vertical padding: py-1 (4px top + 4px bottom) — unobtrusive.
 */
export function SectionDivider({ label, href }: SectionDividerProps) {
  return (
    <div className="flex items-center gap-3.5 py-1 w-full">
      {/* Left rule */}
      <div className="flex-1 h-px bg-border-default" />

      {/* Centre label */}
      {href ? (
        <Link
          to={href}
          className={[
            "font-mono text-2xs font-medium tracking-wide uppercase whitespace-nowrap",
            "text-text-disabled no-underline",
            "transition-colors duration-150",
            "hover:text-text-secondary",
          ].join(" ")}
        >
          {label}&thinsp;→
        </Link>
      ) : (
        <span
          className="font-mono text-2xs font-medium tracking-wide uppercase whitespace-nowrap text-text-disabled"
        >
          {label}
        </span>
      )}

      {/* Right rule */}
      <div className="flex-1 h-px bg-border-default" />
    </div>
  );
}