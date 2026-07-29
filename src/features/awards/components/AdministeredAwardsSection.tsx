import { Link } from "react-router";
import { Trophy } from "lucide-react";
import { useAwardsByBody } from "../hooks/useAwards";

/**
 * Awards this company *administers* (it is the awarding body), as opposed to
 * awards it has won. Renders nothing when the company runs no awards, so an
 * ordinary practice never sees the block.
 *
 * `hasWinsAbove` draws the separating rule only when a wins list precedes it —
 * inside the company page's Awards tab this is often the first block on screen.
 */
export function AdministeredAwardsSection({
  companyId,
  hasWinsAbove = false,
}: {
  companyId: string;
  hasWinsAbove?: boolean;
}) {
  const { data: awards = [], isLoading } = useAwardsByBody(companyId);

  if (isLoading || awards.length === 0) return null;

  return (
    <section className={hasWinsAbove ? "mt-12 border-t border-border-default pt-10" : undefined}>
      <div className="mb-6 flex items-center gap-3">
        <h2 className="eyebrow tracking-widest">Administered awards</h2>
        <Trophy className="size-3.5 text-text-secondary" aria-hidden />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {awards.map((award) => (
          <Link
            key={award.id}
            to={`/award/${award.slug}`}
            className="group flex flex-col rounded-sm border border-border-default p-4 transition-colors hover:bg-surface-muted"
          >
            <span className="text-sm font-bold transition-colors group-hover:text-text-secondary">
              {award.name}
            </span>
            <span className="mt-1 text-xs text-text-secondary">
              {award.editionCount} editions documented
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
