import {
  type LucideIcon,
  Bed,
  Beer,
  Bus,
  Camera,
  Candy,
  Car,
  Coffee,
  Croissant,
  Fuel,
  Hospital,
  IceCream,
  Landmark,
  MapPin,
  Music,
  Pill,
  Plane,
  Sandwich,
  Ship,
  ShoppingBasket,
  SquareParking,
  TrainFront,
  Trees,
  Utensils,
  Wine,
} from "lucide-react";
import type { CollectionMarkerCategory } from "@/features/collections/types";

/** Types that do not distinguish place kind for icon purposes. */
const GENERIC_PLACE_TYPES = new Set([
  "establishment",
  "point_of_interest",
  "premises",
  "geocode",
]);

/**
 * Picks a stable primary type string for storage (lowercase snake_case).
 * Prefers Places "primary type" when non-generic; otherwise first meaningful entry in `types`.
 */
export function pickGooglePrimaryTypeForStorage(
  primaryType: string | null | undefined,
  types: string[] | undefined,
): string | null {
  const ordered: string[] = [];
  if (primaryType?.trim()) ordered.push(primaryType.trim());
  for (const t of types ?? []) {
    const s = t?.trim();
    if (s && !ordered.includes(s)) ordered.push(s);
  }
  for (const raw of ordered) {
    const key = raw.toLowerCase();
    if (!key || GENERIC_PLACE_TYPES.has(key)) continue;
    return key;
  }
  return null;
}

export function mapGoogleTypesToCollectionCategory(types: string[] = []): CollectionMarkerCategory {
  const lower = types.map((t) => t.toLowerCase());
  if (
    lower.some((t) =>
      [
        "restaurant",
        "cafe",
        "bar",
        "bakery",
        "meal_takeaway",
        "meal_delivery",
        "food",
        "coffee_shop",
        "fast_food_restaurant",
        "ice_cream_shop",
        "night_club",
        "wine_bar",
        "brewery",
        "pub",
        "liquor_store",
        "confectionery",
        "supermarket",
        "grocery_store",
        "food_store",
        "cafeteria",
        "dining_area",
      ].includes(t),
    ) ||
    lower.some((t) => t.endsWith("_restaurant"))
  ) {
    return "dining";
  }
  if (
    lower.some((t) =>
      ["lodging", "hotel", "motel", "hostel", "guest_house", "guesthouse", "campground", "rv_park"].includes(t),
    )
  ) {
    return "accommodation";
  }
  if (
    lower.some((t) =>
      [
        "transit_station",
        "subway_station",
        "bus_station",
        "train_station",
        "airport",
        "taxi_stand",
        "light_rail_station",
        "ferry_terminal",
        "parking",
      ].includes(t),
    )
  ) {
    return "transport";
  }
  if (
    lower.some((t) =>
      [
        "museum",
        "park",
        "tourist_attraction",
        "art_gallery",
        "amusement_park",
        "aquarium",
        "zoo",
        "national_park",
        "stadium",
        "performing_arts_theater",
        "library",
        "church",
        "hindu_temple",
        "mosque",
        "synagogue",
        "shrine",
        "point_of_interest",
      ].includes(t),
    )
  ) {
    return "attraction";
  }

  return "other";
}

const PRIMARY_TYPE_ICONS: Record<string, LucideIcon> = {
  bakery: Croissant,
  cafe: Coffee,
  coffee_shop: Coffee,
  espresso_bar: Coffee,
  bar: Beer,
  pub: Beer,
  brewery: Beer,
  wine_bar: Wine,
  liquor_store: Wine,
  night_club: Music,
  ice_cream_shop: IceCream,
  confectionery: Candy,
  candy_store: Candy,
  fast_food_restaurant: Sandwich,
  meal_takeaway: Sandwich,
  meal_delivery: Utensils,
  restaurant: Utensils,
  food: Utensils,
  cafeteria: Utensils,
  dining_area: Utensils,
  brunch_restaurant: Utensils,
  fine_dining_restaurant: Utensils,
  supermarket: ShoppingBasket,
  grocery_store: ShoppingBasket,
  food_store: ShoppingBasket,
  convenience_store: ShoppingBasket,

  lodging: Bed,
  hotel: Bed,
  motel: Bed,
  hostel: Bed,
  guest_house: Bed,
  resort_hotel: Bed,
  campground: Trees,
  rv_park: Car,

  airport: Plane,
  train_station: TrainFront,
  subway_station: TrainFront,
  light_rail_station: TrainFront,
  transit_station: TrainFront,
  bus_station: Bus,
  taxi_stand: Car,
  ferry_terminal: Ship,
  parking: SquareParking,

  museum: Landmark,
  art_gallery: Landmark,
  tourist_attraction: Camera,
  amusement_park: Camera,
  aquarium: Camera,
  zoo: Camera,
  library: Landmark,
  park: Trees,
  national_park: Trees,
  stadium: Camera,
  performing_arts_theater: Camera,
  church: Landmark,
  hindu_temple: Landmark,
  mosque: Landmark,
  synagogue: Landmark,
  shrine: Landmark,

  pharmacy: Pill,
  drugstore: Pill,
  hospital: Hospital,
  doctor: Hospital,
  dentist: Hospital,
  veterinary_care: Hospital,
  gas_station: Fuel,
};

export function getCollectionMarkerLucideIcon(
  category: CollectionMarkerCategory,
  googlePrimaryType: string | null | undefined,
): LucideIcon {
  const pt = googlePrimaryType?.trim().toLowerCase() ?? "";
  if (pt) {
    const direct = PRIMARY_TYPE_ICONS[pt];
    if (direct) return direct;
    if (pt.endsWith("_restaurant")) return Utensils;
  }

  switch (category) {
    case "accommodation":
      return Bed;
    case "dining":
      return Utensils;
    case "transport":
      return Bus;
    case "attraction":
      return Camera;
    default:
      return MapPin;
  }
}
