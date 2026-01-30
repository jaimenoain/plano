import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { BuildingDiscoveryMap } from "@/components/common/BuildingDiscoveryMap";
import { supabase } from "@/integrations/supabase/client";
import { getBoundsFromBuildings } from "@/utils/map";
import { DiscoveryBuilding } from "@/features/search/components/types";

interface ArchitectData {
  architects: {
    name: string;
    id: string;
  } | null;
}

interface BuildingData {
  id: string;
  name: string;
  location_lat: number;
  location_lng: number;
  city: string | null;
  country: string | null;
  year_completed: number | null;
  hero_image_url: string | null;
  location_precision: "exact" | "approximate";
  building_architects: ArchitectData[];
}

export default function CollectionMap() {
  const { username, slug } = useParams();

  const { data: collectionData, isLoading, error } = useQuery({
    queryKey: ["collection-map", username, slug],
    queryFn: async () => {
      if (!username || !slug) throw new Error("Missing parameters");

      // 1. Get user by username
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .single();

      if (profileError || !profile) {
        console.error("Profile error:", profileError);
        throw new Error("User not found");
      }

      // 2. Get collection by slug and owner_id
      const { data: collection, error: collectionError } = await supabase
        .from("collections")
        .select("id, name")
        .eq("slug", slug)
        .eq("owner_id", profile.id)
        .single();

      if (collectionError || !collection) {
        console.error("Collection error:", collectionError);
        throw new Error("Collection not found");
      }

      // 3. Get collection items with building details
      const { data: items, error: itemsError } = await supabase
        .from("collection_items")
        .select(`
          building:buildings (
            id,
            name,
            location_lat,
            location_lng,
            city,
            country,
            year_completed,
            hero_image_url,
            location_precision,
            building_architects (
              architects (
                id,
                name
              )
            )
          )
        `)
        .eq("collection_id", collection.id);

      if (itemsError) {
        console.error("Items error:", itemsError);
        throw itemsError;
      }

      return {
        collection,
        items: items || []
      };
    },
    enabled: !!username && !!slug,
  });

  const buildings: DiscoveryBuilding[] = useMemo(() => {
    if (!collectionData?.items) return [];

    return collectionData.items
      .filter((item) => item.building) // Filter out null buildings if any
      .map((item) => {
        const b = item.building as any; // Cast because nested types are tricky

        // Transform architects
        const architects = b.building_architects?.map((ba: any) => ba.architects).filter(Boolean) || [];

        return {
          id: b.id,
          name: b.name,
          location_lat: b.location_lat,
          location_lng: b.location_lng,
          city: b.city,
          country: b.country,
          year_completed: b.year_completed,
          location_precision: b.location_precision,
          main_image_url: b.hero_image_url,
          architects: architects,
          styles: [], // Default empty as per requirements
          // Add other required fields with defaults
          social_score: 0,
          slug: null, // Optional
        } as DiscoveryBuilding;
      });
  }, [collectionData]);

  const bounds = useMemo(() => getBoundsFromBuildings(buildings), [buildings]);

  if (isLoading) {
    return (
      <AppLayout title="Loading..." showBack>
        <div className="flex justify-center items-center h-[calc(100vh-64px)]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (error || !collectionData) {
    return (
      <AppLayout title="Error" showBack>
        <div className="p-8 text-center text-muted-foreground">
          {error instanceof Error ? error.message : "Collection not found"}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={collectionData.collection.name} showBack>
      <div className="h-[calc(100vh-64px)] w-full">
        <BuildingDiscoveryMap
          externalBuildings={buildings}
          forcedBounds={bounds}
          showImages={true}
        />
      </div>
    </AppLayout>
  );
}
