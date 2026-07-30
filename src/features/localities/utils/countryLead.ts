import type { CountryCity, CountryEra, CountryTotals } from "../api/countryGuideApi";

/**
 * The country guide's editorial lead, computed from the catalogue itself.
 *
 * Countries have no editorial copy in the database (there is no `countries`
 * table — a country is whatever its localities say it is), and inventing travel
 * blurb would be fiction. So the orientation a visitor actually needs — how big
 * the catalogue is, where it concentrates, which era it leans to — is derived
 * from the same counts the page renders, and every sentence is dropped when the
 * data behind it is too thin to support it.
 */

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

const fmt = (n: number) => n.toLocaleString("en");

/** "Madrid", "Madrid and Barcelona", "Madrid, Barcelona and Valencia". */
export function joinCityNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Labels an era band: closed bands read as a range, open ones as before/since. */
export function formatEraLabel(era: CountryEra): string {
  if (era.from_year == null && era.to_year == null) return "Undated";
  if (era.from_year == null) return `Before ${era.to_year! + 1}`;
  if (era.to_year == null) return `${era.from_year} and later`;
  return `${era.from_year}–${era.to_year}`;
}

/** The band holding the most buildings, or null when nothing is dated. */
export function dominantEra(eras: CountryEra[]): CountryEra | null {
  if (eras.length === 0) return null;
  return eras.reduce((best, era) => (era.count > best.count ? era : best));
}

export function buildCountryLead({
  country,
  cities,
  eras,
}: {
  country: CountryTotals;
  cities: CountryCity[];
  eras: CountryEra[];
}): string[] {
  const name = country.name?.trim();
  if (!name || country.buildings === 0) return [];

  const sentences: string[] = [];

  sentences.push(
    `Plano's catalogue of ${name} runs to ${fmt(country.buildings)} ${plural(
      country.buildings,
      "building",
      "buildings",
    )} across ${fmt(country.cities)} ${plural(country.cities, "city", "towns and cities")}.`,
  );

  // Concentration — only worth saying when there is a tail to concentrate
  // against and the leaders genuinely dominate.
  const leaders = cities.slice(0, 3);
  if (cities.length > 4 && leaders.length === 3) {
    const share = Math.round(
      (leaders.reduce((sum, c) => sum + c.buildings_count, 0) / country.buildings) * 100,
    );
    if (share >= 25) {
      sentences.push(
        `${joinCityNames(leaders.map((c) => c.city))} hold ${share}% of it between them, so a first visit plans itself.`,
      );
    }
  }

  // Era — needs a real sample before a claim about "the architecture here".
  const era = dominantEra(eras);
  if (era && country.dated >= 20) {
    const share = Math.round((era.count / country.dated) * 100);
    if (era.to_year == null) {
      sentences.push(
        `Expect a contemporary trip: ${share}% of the ${fmt(country.dated)} dated entries were completed in ${era.from_year} or later.`,
      );
    } else if (era.from_year == null) {
      sentences.push(
        `It skews historic — ${share}% of the ${fmt(country.dated)} dated entries predate ${era.to_year! + 1}.`,
      );
    } else {
      sentences.push(
        `Its centre of gravity sits between ${era.from_year} and ${era.to_year}, which covers ${share}% of the ${fmt(country.dated)} dated entries.`,
      );
    }
  }

  return sentences;
}
