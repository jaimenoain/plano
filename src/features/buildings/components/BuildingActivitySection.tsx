import { Link } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RatingDots } from "@/components/ui/rating-dots";
import { cn } from "@/lib/utils";
import { useBuildingActivity } from "../hooks/useBuildingActivity";
import type { BuildingActivityPerson } from "../api/buildingActivity";

/** Faces shown before the row collapses into a "+N" chip. */
const MAX_FACES = 8;

function ActivityGroup({
  label,
  people,
  total,
}: {
  label: string;
  people: BuildingActivityPerson[];
  total: number;
}) {
  if (people.length === 0) return null;

  const faces = people.slice(0, MAX_FACES);
  const overflow = total - faces.length;

  return (
    <div className="space-y-3">
      <p className="eyebrow tracking-[0.15em] text-text-secondary">
        {total} {label}
      </p>
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-3">
        {faces.map((person) => (
          <li key={person.user_id}>
            <Link
              to={`/profile/${person.username}`}
              className="group flex items-center gap-2"
            >
              <Avatar className="h-7 w-7 rounded-full">
                <AvatarImage
                  src={person.avatar_url ?? undefined}
                  alt={person.username}
                />
                <AvatarFallback className="text-[10px]">
                  {person.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-text-primary group-hover:underline">
                {person.username}
              </span>
              <RatingDots rating={person.rating} size="sm" />
            </Link>
          </li>
        ))}
        {overflow > 0 && (
          <li className="text-sm text-text-secondary">+{overflow} more</li>
        )}
      </ul>
    </div>
  );
}

export interface BuildingActivitySectionProps {
  visited: BuildingActivityPerson[];
  saved: BuildingActivityPerson[];
  totalVisited: number;
  totalSaved: number;
  className?: string;
}

/**
 * The members who visited or saved this building.
 *
 * The Community stream above only holds notes and photos, so a member who
 * logged a building without writing anything has never appeared on its page.
 * This section is that record. Visited leads because it is the stronger claim;
 * an award shows as dots beside the name and renders nothing when unmarked.
 * One row per member per building, so the two groups never overlap and their
 * totals add up.
 *
 * Renders nothing when both groups are empty — the Community empty state
 * directly above already invites the first contribution, and a second empty
 * state there would just be a dead end.
 */
export function BuildingActivitySection({
  visited,
  saved,
  totalVisited,
  totalSaved,
  className,
}: BuildingActivitySectionProps) {
  if (visited.length === 0 && saved.length === 0) return null;

  const members = totalVisited + totalSaved;

  return (
    // Header grammar deliberately matches the Community section directly above:
    // h2 on the left, tracked count on the right, one hairline underneath.
    <section className={cn("space-y-8", className)}>
      <div className="flex items-baseline justify-between border-b border-border-default pb-4">
        <h2 className="text-2xl md:text-[28px] font-semibold tracking-[-0.02em] text-text-primary">
          Saved &amp; visited
        </h2>
        <span className="eyebrow tracking-[0.15em]">
          {members} {members === 1 ? "member" : "members"}
        </span>
      </div>
      <div className="space-y-8">
        <ActivityGroup label="visited" people={visited} total={totalVisited} />
        <ActivityGroup label="saved" people={saved} total={totalSaved} />
      </div>
    </section>
  );
}

/**
 * Data-connected wrapper, mounted by the Overview tab. Fetching lives here
 * rather than in the tab so the section above stays a pure render — the same
 * split the Related sections use.
 */
export function BuildingActivity({ buildingId }: { buildingId: string }) {
  const { data } = useBuildingActivity(buildingId);
  if (!data) return null;

  return (
    <BuildingActivitySection
      visited={data.visited}
      saved={data.saved}
      totalVisited={data.totalVisited}
      totalSaved={data.totalSaved}
    />
  );
}
