import { Link } from "react-router";

interface SectionDividerProps {
  label: string;
  href?: string;
}

/**
 * SectionDivider
 *
 * Editorial section separator — a border-top with a left-aligned uppercase
 * tracked label. Used as the "From the community" transition marker in the feed.
 */
export function SectionDivider({ label, href }: SectionDividerProps) {
  return (
    <div className="border-t border-border-default pt-6 w-full">
      {href ? (
        <Link
          to={href}
          className="text-2xs font-medium tracking-widest uppercase text-text-secondary no-underline transition-colors duration-150 hover:text-text-primary"
        >
          {label} →
        </Link>
      ) : (
        <span className="text-2xs font-medium tracking-widest uppercase text-text-secondary">
          {label}
        </span>
      )}
    </div>
  );
}
