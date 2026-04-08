/**
 * @deprecated Legacy `architects` entity. Use `Person`, `Company`, and credit types from `src/features/credits/types.ts` (Building Credits v2). Removed in Phase 11.
 */
export interface Architect {
  id: string;
  name: string;
}

/**
 * @deprecated Legacy portfolio row tied to `architects`. Prefer credit/portfolio DTOs from `src/features/credits/types.ts`. Removed in Phase 11.
 */
export interface ArchitectBuilding {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  year_completed: number | null;
  main_image_url?: string | null;
}
