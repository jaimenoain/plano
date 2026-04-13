export interface DetailSectionHeaderProps {
  count: number;
}

/**
 * Building detail — reviews stream section label (Roadmap Task 3.1).
 */
export function DetailSectionHeader({ count }: DetailSectionHeaderProps) {
  const contributionsLabel =
    count === 1 ? "1 contribution" : `${count} contributions`;

  return (
    <div className="flex items-center justify-between border-b border-border-default pb-3">
      <span className="font-mono text-[9px] uppercase tracking-widest text-text-secondary">
        Reviews &amp; photography
      </span>
      <span className="font-mono text-[9px] uppercase tracking-widest text-text-secondary">
        {contributionsLabel}
      </span>
    </div>
  );
}
