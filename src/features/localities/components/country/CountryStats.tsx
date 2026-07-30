import { Building2, MapPin, Compass, Users } from "lucide-react";
import type { CountryTotals } from "../../api/countryGuideApi";

/**
 * CountryStats — the four-up strip from the city guides, counting what a
 * country actually has: buildings, the cities holding them, the practices that
 * designed them, and the members who catalogued it.
 *
 * Deliberately no photo count. 16,400 of 18,021 `building_posts` are
 * `visibility = 'contacts'`, so under the guide's own RLS a signed-out visitor
 * can only see ~1% of them — Spain's 1,828 photos would read as "14". A public
 * headline number that swings with who is looking is worse than no number.
 */
export function CountryStats({ country }: { country: CountryTotals }) {
  const items = [
    {
      icon: Building2,
      value: country.buildings,
      label: country.buildings === 1 ? "Building" : "Buildings",
    },
    {
      icon: MapPin,
      value: country.cities,
      label: country.cities === 1 ? "City" : "Cities",
    },
    {
      icon: Compass,
      value: country.practices,
      label: country.practices === 1 ? "Practice" : "Practices",
    },
    {
      icon: Users,
      value: country.contributors,
      label: country.contributors === 1 ? "Contributor" : "Contributors",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-8 border-b border-border-default py-10 sm:grid-cols-4 sm:gap-x-4">
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-col gap-2">
          <span className="font-display text-4xl font-bold tabular-nums tracking-tight text-text-primary">
            {item.value.toLocaleString("en")}
          </span>
          <span className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-widest text-text-secondary">
            <item.icon className="h-3 w-3 shrink-0" aria-hidden />
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
