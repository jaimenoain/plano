export const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "IN", name: "India" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "NL", name: "Netherlands" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "IE", name: "Ireland" },
  { code: "NZ", name: "New Zealand" },
  { code: "SG", name: "Singapore" },
  { code: "CH", name: "Switzerland" },
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "PT", name: "Portugal" },
  { code: "PL", name: "Poland" },
  { code: "RU", name: "Russia" },
  { code: "ZA", name: "South Africa" },
  { code: "TR", name: "Turkey" },
  { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colombia" },
  { code: "PE", name: "Peru" },
  { code: "VE", name: "Venezuela" },
  { code: "ID", name: "Indonesia" },
  { code: "MY", name: "Malaysia" },
  { code: "PH", name: "Philippines" },
  { code: "TH", name: "Thailand" },
  { code: "VN", name: "Vietnam" },
  { code: "CN", name: "China" },
  { code: "TW", name: "Taiwan" },
  { code: "HK", name: "Hong Kong" },
  { code: "GR", name: "Greece" },
  { code: "IL", name: "Israel" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "CZ", name: "Czech Republic" },
  { code: "HU", name: "Hungary" },
  { code: "RO", name: "Romania" },
  { code: "UA", name: "Ukraine" },
].sort((a, b) => a.name.localeCompare(b.name));

export interface ProductionCountry {
  iso_3166_1: string;
  name: string;
}

/**
 * Helper to normalize production countries.
 * Handles:
 * 1. New format: Array of ISO 3166-1 strings (stored in 'countries' column).
 * 2. Legacy format: Array of objects { iso_3166_1, name } (stored in older records).
 * Returns a consistent array of objects with iso_3166_1 and name.
 */
export function normalizeCountries(data: any[] | null): ProductionCountry[] {
  if (!Array.isArray(data)) return [];

  return data.map((c: any) => {
    // New format: Array of ISO strings
    if (typeof c === 'string') {
        const country = COUNTRIES.find(C => C.code === c);
        // Fallback to empty string for name if unknown (UI handles this)
        return { iso_3166_1: c, name: country?.name || '' };
    }
    // Legacy format: Array of objects { iso_3166_1, name }
    if (typeof c === 'object' && c !== null && 'iso_3166_1' in c && 'name' in c) {
        return c as ProductionCountry;
    }

    // Fallback for unexpected data
    return { iso_3166_1: '', name: '' };
  }).filter(c => c.iso_3166_1 !== '');
}
