import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { slugify } from "@/utils/url";
import { checkSlugAvailability } from "../api/slugAvailability";

/**
 * Resolves the slug a building would get from `name`, debouncing the name before
 * asking the database whether it is taken. On collision the building's short id
 * is appended, which is what the create/edit forms actually submit.
 */
export function useBuildingSlugAvailability(
  name: string,
  buildingId?: string,
  shortId?: number | null,
): { finalSlug: string; isSlugCollision: boolean; isCheckingSlug: boolean } {
  const [debouncedName, setDebouncedName] = useState(name);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedName(name);
    }, 300);
    return () => clearTimeout(timer);
  }, [name]);

  const { data: isSlugAvailable, isLoading: isCheckingSlug } = useQuery({
    queryKey: ["slug_availability", debouncedName, buildingId],
    queryFn: () => checkSlugAvailability(slugify(debouncedName), buildingId),
    enabled: !!debouncedName,
  });

  const baseSlug = slugify(debouncedName);
  const isSlugCollision = isSlugAvailable === false;

  return {
    finalSlug: isSlugCollision ? `${baseSlug}-${shortId || "1"}` : baseSlug,
    isSlugCollision,
    isCheckingSlug,
  };
}
