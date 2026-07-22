/** Static option sets for the building create/edit form controls. */

export const SIZE_CATEGORY_OPTIONS = [
  { label: "XS", value: "xs" },
  { label: "S",  value: "s" },
  { label: "M",  value: "m" },
  { label: "L",  value: "l" },
  { label: "XL", value: "xl" },
  { label: "XXL", value: "xxl" },
];

export const SIZE_REFERENCE_ROWS = [
  { label: "XS",  gfa: "< 50 m²" },
  { label: "S",   gfa: "50 – 500 m²" },
  { label: "M",   gfa: "500 – 2,000 m²" },
  { label: "L",   gfa: "2,000 – 10,000 m²" },
  { label: "XL",  gfa: "10,000 – 50,000 m²" },
  { label: "XXL", gfa: "50,000+ m²" },
];

export const STATUS_OPTIONS = ['Built', 'Under Construction', 'Unbuilt', 'Lost', 'Temporary'];

export const ACCESS_LEVEL_OPTIONS = [
  { label: 'Public', value: 'public' },
  { label: 'Private', value: 'private' },
  { label: 'Restricted', value: 'restricted' },
  { label: 'Commercial', value: 'commercial' }
];

export const ACCESS_LOGISTICS_OPTIONS = [
  { label: 'Walk-in', value: 'walk-in' },
  { label: 'Booking Required', value: 'booking_required' },
  { label: 'Tour Only', value: 'tour_only' },
  { label: 'Exterior Only', value: 'exterior_only' }
];

export const ACCESS_COST_OPTIONS = [
  { label: 'Free', value: 'free' },
  { label: 'Paid', value: 'paid' },
  { label: 'Customers Only', value: 'customers_only' }
];
