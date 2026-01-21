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
