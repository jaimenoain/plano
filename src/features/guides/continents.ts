export type Continent =
  | 'Europe'
  | 'Americas'
  | 'Asia'
  | 'Middle East'
  | 'Africa'
  | 'Oceania';

export const CONTINENTS: Continent[] = [
  'Europe',
  'Americas',
  'Asia',
  'Middle East',
  'Africa',
  'Oceania',
];

// ISO 3166-1 alpha-2 → continent
const COUNTRY_TO_CONTINENT: Record<string, Continent> = {
  // Europe
  GB: 'Europe', FR: 'Europe', DE: 'Europe', IT: 'Europe', ES: 'Europe',
  NL: 'Europe', BE: 'Europe', AT: 'Europe', CH: 'Europe', SE: 'Europe',
  NO: 'Europe', DK: 'Europe', FI: 'Europe', PL: 'Europe', CZ: 'Europe',
  HU: 'Europe', RO: 'Europe', PT: 'Europe', GR: 'Europe', HR: 'Europe',
  SK: 'Europe', SI: 'Europe', IE: 'Europe', LU: 'Europe', MT: 'Europe',
  EE: 'Europe', LV: 'Europe', LT: 'Europe', BG: 'Europe', RS: 'Europe',
  BA: 'Europe', MK: 'Europe', AL: 'Europe', ME: 'Europe', IS: 'Europe',
  UA: 'Europe', BY: 'Europe', MD: 'Europe', RU: 'Europe',
  // Americas
  US: 'Americas', CA: 'Americas', MX: 'Americas', BR: 'Americas',
  AR: 'Americas', CL: 'Americas', CO: 'Americas', PE: 'Americas',
  VE: 'Americas', EC: 'Americas', BO: 'Americas', UY: 'Americas',
  PY: 'Americas', CU: 'Americas', DO: 'Americas', GT: 'Americas',
  HN: 'Americas', SV: 'Americas', NI: 'Americas', CR: 'Americas',
  PA: 'Americas', JM: 'Americas', TT: 'Americas',
  // Asia
  JP: 'Asia', CN: 'Asia', KR: 'Asia', TW: 'Asia', HK: 'Asia',
  SG: 'Asia', IN: 'Asia', TH: 'Asia', VN: 'Asia', MY: 'Asia',
  ID: 'Asia', PH: 'Asia', MM: 'Asia', KH: 'Asia', LA: 'Asia',
  BD: 'Asia', PK: 'Asia', LK: 'Asia', NP: 'Asia', MN: 'Asia',
  KZ: 'Asia', UZ: 'Asia', AZ: 'Asia', GE: 'Asia', AM: 'Asia',
  // Middle East
  AE: 'Middle East', SA: 'Middle East', IL: 'Middle East', TR: 'Middle East',
  IR: 'Middle East', IQ: 'Middle East', JO: 'Middle East', LB: 'Middle East',
  KW: 'Middle East', QA: 'Middle East', BH: 'Middle East', OM: 'Middle East',
  YE: 'Middle East', SY: 'Middle East',
  // Africa
  ZA: 'Africa', NG: 'Africa', EG: 'Africa', KE: 'Africa', GH: 'Africa',
  ET: 'Africa', TZ: 'Africa', MA: 'Africa', TN: 'Africa', DZ: 'Africa',
  SN: 'Africa', CM: 'Africa', CI: 'Africa', MG: 'Africa', MZ: 'Africa',
  // Oceania
  AU: 'Oceania', NZ: 'Oceania', FJ: 'Oceania', PG: 'Oceania',
};

export function getContinent(countryCode: string): Continent {
  return COUNTRY_TO_CONTINENT[countryCode.toUpperCase()] ?? 'Europe';
}
