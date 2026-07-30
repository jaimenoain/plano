import { SectionLabel } from "../SectionLabel";
import { formatEraLabel } from "../../utils/countryLead";
import type { CountryEra, CountryTotals } from "../../api/countryGuideApi";

/** Below this there isn't enough dated work to say anything about an era. */
const MIN_DATED = 20;

/**
 * CountryEras — "When it was built".
 *
 * Tells a visitor what kind of architecture the trip will actually be: a
 * contemporary country reads very differently from one whose catalogue is
 * mediaeval. Bars are proportional to the largest band.
 *
 * Deliberately not links: `/search` has a `centuries` filter but no country
 * scope, so an era link would silently show the whole world's 21st century.
 */
export function CountryEras({
  eras,
  country,
}: {
  eras: CountryEra[];
  country: CountryTotals;
}) {
  if (eras.length < 2 || country.dated < MIN_DATED) return null;

  const max = Math.max(...eras.map((e) => e.count));

  const intro =
    `Completion dates for the ${country.dated.toLocaleString("en")} of ` +
    `${country.buildings.toLocaleString("en")} entries that carry one` +
    (country.first_year != null ? `, starting in ${country.first_year}.` : ".");

  return (
    <section className="mt-16 border-t border-border-default pt-12">
      <SectionLabel>When it was built</SectionLabel>
      <p className="mt-2 max-w-xl text-sm text-text-secondary">{intro}</p>

      <dl className="mt-8 space-y-3">
        {eras.map((era) => {
          const exact = (era.count / country.dated) * 100;
          // A band that rounds to zero still holds buildings — "0%" reads as a bug.
          const share = exact < 0.5 ? "<1%" : `${Math.round(exact)}%`;
          return (
            <div key={`${era.from_year}-${era.to_year}`} className="flex items-center gap-4">
              <dt className="w-28 shrink-0 text-2xs font-medium uppercase tracking-widest text-text-secondary sm:w-36">
                {formatEraLabel(era)}
              </dt>
              <dd className="flex min-w-0 flex-1 items-center gap-3">
                {/* Track keeps the bar's width a share of the row, so a 100%
                    band can't push the count off the end. */}
                <div className="h-2 min-w-0 flex-1 bg-surface-muted" aria-hidden>
                  <div
                    className="h-2 bg-text-primary"
                    style={{ width: `${Math.max((era.count / max) * 100, 1)}%` }}
                  />
                </div>
                <span className="w-20 shrink-0 text-right text-2xs tabular-nums text-text-disabled">
                  {era.count.toLocaleString("en")}
                  <span className="sr-only"> buildings</span> · {share}
                </span>
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
