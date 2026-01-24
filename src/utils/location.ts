export interface Coordinates {
  lat: number;
  lng: number;
}

export function parseLocation(location: any): Coordinates | null {
  if (!location) return null;

  // Case 1: GeoJSON Object { type: "Point", coordinates: [lng, lat] }
  if (typeof location === 'object') {
    if (location.coordinates && Array.isArray(location.coordinates) && location.coordinates.length >= 2) {
      const lng = Number(location.coordinates[0]);
      const lat = Number(location.coordinates[1]);
      if (!isNaN(lng) && !isNaN(lat)) {
        return { lng, lat };
      }
    }
    // Handle potential nested objects or other structures if necessary, but standard GeoJSON is above.
  }

  // Case 2: WKT String "POINT(lng lat)" or "POINT (lng lat)"
  if (typeof location === 'string') {
    let text = location;

    // Strip SRID if present (e.g., "SRID=4326;POINT(...)")
    if (text.includes(';')) {
      text = text.split(';').pop() || '';
    }

    // Trim whitespace
    text = text.trim();

    // Regex to match POINT followed by coordinates in parentheses
    // Matches:
    // POINT
    // optional spaces
    // ( or nothing (though standard WKT uses parens, some loose parsers might accept without) - let's enforce parens for now but allow spaces
    // spaces
    // number (float, scientific)
    // spaces
    // number
    // spaces
    // )
    //
    // Regex: /POINT\s*\(\s*([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s+([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s*\)/i

    const regex = /POINT\s*\(\s*([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s+([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s*\)/i;
    const match = text.match(regex);

    if (match) {
      const lng = parseFloat(match[1]);
      const lat = parseFloat(match[2]);
      if (!isNaN(lng) && !isNaN(lat)) {
        return { lng, lat };
      }
    }
  }

  return null;
}
