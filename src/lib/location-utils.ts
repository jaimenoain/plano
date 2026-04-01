type GeocoderAddressComponent = { long_name: string; types: string[] };
type GeocoderResultLike = { address_components?: GeocoderAddressComponent[] };

export const extractLocationDetails = (result: GeocoderResultLike | null | undefined) => {
  let city: string | null = null;
  let country: string | null = null;

  if (!result?.address_components) return { city, country };

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
