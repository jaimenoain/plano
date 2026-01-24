export const extractLocationDetails = (result: any) => {
  let city = null;
  let country = null;

  if (!result || !result.address_components) return { city, country };

  for (const component of result.address_components) {
    if (component.types.includes('locality')) {
      city = component.long_name;
    }
    if (component.types.includes('country')) {
      country = component.long_name;
    }
  }

  // Fallback for city if locality is missing
  if (!city) {
     for (const component of result.address_components) {
        if (component.types.includes('administrative_area_level_2')) {
            city = component.long_name;
            break;
        }
     }
  }

  return { city, country };
};

export const parseLocation = (location: any): { lat: number, lng: number } | null => {
  if (!location) return null;

  // Case 1: GeoJSON Object
  if (typeof location === 'object' && location.coordinates) {
    return {
      lng: location.coordinates[0],
      lat: location.coordinates[1]
    };
  }

  // Case 2: WKT String "POINT(lng lat)"
  if (typeof location === 'string') {
    // Matches "POINT(lng lat)" or "POINT (lng lat)" with optional decimals
    const match = location.match(/POINT\s*\((-?\d+\.?\d*)\s+(-?\d+\.?\d*)\)/i);
    if (match) {
      return {
        lng: parseFloat(match[1]),
        lat: parseFloat(match[2])
      };
    }
  }

  return null;
};
