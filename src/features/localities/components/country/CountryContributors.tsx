import { Link } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SectionLabel } from "../SectionLabel";
import type { CountryContributor } from "../../api/countryGuideApi";

/** "29 buildings · 449 photos" — only the parts that are non-zero. */
function contributionSummary(c: CountryContributor): string {
  const parts: string[] = [];
  if (c.buildings_logged > 0) {
    parts.push(
      `${c.buildings_logged.toLocaleString("en")} ${
        c.buildings_logged === 1 ? "building" : "buildings"
      }`,
    );
  }
  if (c.photos_uploaded > 0) {
    parts.push(
      `${c.photos_uploaded.toLocaleString("en")} ${
        c.photos_uploaded === 1 ? "photo" : "photos"
      }`,
    );
  }
  return parts.join(" · ");
}

/**
 * CountryContributors — "Who knows this country".
 *
 * A visitor's most useful resource is the members who catalogued the place, so
 * the guide names them and flags the ambassadors among them, with the route to
 * becoming one for a country that is still thin.
 */
export function CountryContributors({
  contributors,
  countryName,
}: {
  contributors: CountryContributor[];
  countryName: string;
}) {
  if (contributors.length === 0) return null;

  return (
    <section className="mt-16 border-t border-border-default pt-12">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <SectionLabel>Who knows {countryName}</SectionLabel>
          <p className="mt-2 max-w-xl text-sm text-text-secondary">
            The members who logged and photographed these buildings. Ask them.
          </p>
        </div>
        <Link to="/become-ambassador" className="cta-link shrink-0">
          Become an ambassador
        </Link>
      </div>

      <ul className="grid grid-cols-1 gap-x-10 sm:grid-cols-2">
        {contributors.map((c) => (
          <li key={c.user_id}>
            <Link
              to={`/profile/${c.username}`}
              className="group flex items-center gap-3 border-b border-border-default py-3"
            >
              <Avatar className="h-8 w-8 shrink-0 bg-surface-muted">
                <AvatarImage src={c.avatar_url ?? undefined} alt="" />
                <AvatarFallback className="text-2xs">
                  {c.username.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-text-primary transition-colors group-hover:text-text-secondary">
                    {c.username}
                  </span>
                  {c.is_ambassador ? (
                    <span className="accent-tag shrink-0">Ambassador</span>
                  ) : null}
                </span>
                <span className="mt-0.5 block truncate text-2xs text-text-disabled">
                  {contributionSummary(c)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
