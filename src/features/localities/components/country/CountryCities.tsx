import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getBuildingImageUrl } from "@/utils/image";
import { getLocalityUrl } from "@/utils/url";
import { SectionLabel } from "../SectionLabel";
import type { CountryCity } from "../../api/countryGuideApi";

/** How many cities lead as photo cards; the rest become the index below. */
const CARD_COUNT = 8;

/** Diacritic-insensitive match, so "malaga" finds "Málaga". */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function CityCard({ city, countryCode }: { city: CountryCity; countryCode: string }) {
  const imageUrl = getBuildingImageUrl(city.preview_image_url) ?? null;

  return (
    <Link to={getLocalityUrl(countryCode, city.city_slug)} className="group block">
      <div className="aspect-4/3 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={city.city}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="photo-placeholder size-full" data-label={city.city} />
        )}
      </div>
      <div className="mt-2.5">
        <p className="text-2xs font-medium uppercase tracking-widest text-text-disabled">
          {city.buildings_count.toLocaleString("en")}{" "}
          {city.buildings_count === 1 ? "building" : "buildings"}
        </p>
        <p className="mt-1 text-sm font-semibold leading-snug text-text-primary transition-colors group-hover:text-text-secondary">
          {city.city}
        </p>
        {city.highlights.length > 0 ? (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-secondary">
            {city.highlights.join(" · ")}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

/**
 * CountryCities — "Where to go".
 *
 * The old country page rendered every city as a photo card, which for Spain
 * meant 807 of them (and, since `localities.hero_image_url` is set on 1 row in
 * 6,420, 807 grey placeholders). Here the busiest cities lead as cards showing
 * what you'd actually go and see, and the long tail becomes a filterable index
 * — every city still server-rendered as a link, so the country keeps its
 * internal linking, but it is navigable by typing rather than by scrolling.
 */
export function CountryCities({
  cities,
  countryCode,
}: {
  cities: CountryCity[];
  countryCode: string;
}) {
  const [query, setQuery] = useState("");

  const cards = cities.slice(0, CARD_COUNT);
  const tail = cities.slice(CARD_COUNT);

  const filteredTail = useMemo(() => {
    const q = normalize(query);
    if (!q) return tail;
    return tail.filter((c) => normalize(c.city).includes(q));
  }, [tail, query]);

  if (cities.length === 0) return null;

  return (
    <section className="mt-16 border-t border-border-default pt-12">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <SectionLabel>Where to go</SectionLabel>
          <p className="mt-2 max-w-xl text-sm text-text-secondary">
            {cities.length === 1
              ? "One city catalogued so far."
              : `${cities.length.toLocaleString("en")} towns and cities, busiest first.`}
          </p>
        </div>
        <Link to="/guides" className="cta-link shrink-0">
          All guides
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((city) => (
          <CityCard key={city.city_slug} city={city} countryCode={countryCode} />
        ))}
      </div>

      {tail.length > 0 ? (
        <div className="mt-12 border-t border-border-default pt-8">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SectionLabel>
              Every other city ({tail.length.toLocaleString("en")})
            </SectionLabel>
            <div className="relative w-full sm:max-w-xs">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-disabled"
                aria-hidden
              />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter cities"
                aria-label="Filter cities"
                className="pl-8"
              />
            </div>
          </div>

          {filteredTail.length === 0 ? (
            <p className="py-4 text-sm text-text-secondary">
              No city here matches “{query}”.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTail.map((city) => (
                <li key={city.city_slug}>
                  <Link
                    to={getLocalityUrl(countryCode, city.city_slug)}
                    className="group flex items-baseline justify-between gap-3 border-b border-border-default py-2.5"
                  >
                    <span className="min-w-0 truncate text-sm text-text-primary transition-colors group-hover:text-text-secondary">
                      {city.city}
                    </span>
                    <span className="shrink-0 text-2xs tabular-nums text-text-disabled">
                      {city.buildings_count.toLocaleString("en")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
