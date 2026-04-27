import { Link } from "react-router";

interface SectionDividerProps {
  label: string;
  href?: string;
  sectionNumber?: number;
}

/**
 * SectionDivider
 *
 * Editorial section separator — a border-top with a left-aligned uppercase
 * tracked label. Used as the "From the community" transition marker in the feed.
 */
export function SectionDivider({ label, href, sectionNumber }: SectionDividerProps) {
  return (
    <div className="flex justify-between items-baseline pt-16 pb-10 border-b border-text-primary w-full">
      <span className="text-[11px] font-medium tracking-[0.2em] uppercase text-text-primary">
        {sectionNumber != null && (
          <span className="font-mono mr-2 text-text-disabled">§ {sectionNumber} ·</span>
        )}
        {label}
      </span>
      {href && (
        <Link
          to={href}
          className="text-[10px] font-medium tracking-[0.18em] uppercase text-text-secondary no-underline transition-colors duration-150 hover:text-text-primary"
        >
          See all →
        </Link>
      )}
    </div>
  );
}
