/**
 * mapViewToggleStyles.ts
 *
 * Shared selected-state styling for the Map View tab's "Show by" toggles
 * (Task 5.6) — stronger fill/ring, not a subtle tint, per design tokens.
 * Extracted out of `CollectionSettingsDialog.tsx` so `CollectionDiscoverySettings.tsx`
 * can reuse it for the Task 5.7 discovery tier toggle without a circular import
 * (the dialog imports the settings component).
 */
export const SHOW_BY_ITEM_SELECTED =
  "data-[state=on]:bg-brand-primary data-[state=on]:text-brand-primary-foreground " +
  "data-[state=on]:border-brand-primary data-[state=on]:font-semibold " +
  "data-[state=on]:ring-1 data-[state=on]:ring-brand-primary data-[state=on]:hover:bg-brand-primary";
