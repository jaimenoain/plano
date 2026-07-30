import { Link } from "react-router";
import { SectionLabel } from "../SectionLabel";
import type { CountryPractice, CountryTotals } from "../../api/countryGuideApi";

/**
 * CountryPractices — "Architects to know".
 *
 * The names a visitor will keep meeting on plaques, ranked by how much of the
 * country's catalogue each one designed. Counts credited work only
 * (`design_architecture`), so engineers and contractors don't crowd the list.
 */
export function CountryPractices({
  practices,
  country,
}: {
  practices: CountryPractice[];
  country: CountryTotals;
}) {
  if (practices.length === 0) return null;

  const intro =
    "The practices with the most credited work here" +
    (country.practices > practices.length
      ? `, out of ${country.practices.toLocaleString("en")} in the country.`
      : ".");

  return (
    <section className="mt-16 border-t border-border-default pt-12">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <SectionLabel>Architects to know</SectionLabel>
          <p className="mt-2 max-w-xl text-sm text-text-secondary">{intro}</p>
        </div>
      </div>

      <ol className="grid grid-cols-1 gap-x-10 sm:grid-cols-2">
        {practices.map((practice, index) => (
          <li key={practice.id}>
            <Link
              to={`/company/${practice.slug}`}
              className="group flex items-baseline gap-3 border-b border-border-default py-3"
            >
              <span className="w-5 shrink-0 text-2xs tabular-nums text-text-disabled">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary transition-colors group-hover:text-text-secondary">
                {practice.name}
              </span>
              <span className="shrink-0 text-2xs tabular-nums text-text-disabled">
                {practice.buildings.toLocaleString("en")}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
