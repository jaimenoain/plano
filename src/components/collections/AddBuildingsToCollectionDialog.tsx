import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, Check, Search, MapPin, Circle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getBuildingImageUrl } from "@/utils/image";
import { BuildingDetailPanel } from "@/components/collections/BuildingDetailPanel";
import { cn } from "@/lib/utils";

interface AddBuildingsToCollectionDialogProps {
  collectionId: string;
  existingBuildingIds: Set<string>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddBuildingsToCollectionDialog({
  collectionId,
  existingBuildingIds,
  open,
  onOpenChange,
}: AddBuildingsToCollectionDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // State merged from both branches
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

  const { data: savedBuildings, isLoading } = useQuery({
    queryKey: ["user-saved-buildings", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("user_buildings")
        .select(`
          building_id,
          status,
          rating,
          building:buildings (
            id,
            name,
            city,
            country,
            address,
            slug,
            hero_image_url,
            typology,
            access_type,
            materials,
            status
          )
        `)
        .eq("user_id", user.id)
        .neq("status", "ignored");

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buildings = data.map((item: any) => ({
        ...item.building,
        rating: item.rating,
        hero_image_url: item.building.hero_image_url ? getBuildingImageUrl(item.building.hero_image_url) : null
      }));

      // Identify buildings without images
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buildingsWithoutImages = buildings.filter((b: any) => !b.hero_image_url);
      const buildingIdsWithoutImages = buildingsWithoutImages.map((b: any) => b.id);

      if (buildingIdsWithoutImages.length > 0) {
        const { data: imagesData } = await supabase
          .from('review_images')
          .select('storage_path, user_buildings!inner(building_id)')
          .in('user_buildings.building_id', buildingIdsWithoutImages)
          .limit(50);

        if (imagesData) {
          const imageMap = new Map();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          imagesData.forEach((img: any) => {
            const bId = img.user_buildings.building_id;
            if (!imageMap.has(bId)) {
              imageMap.set(bId, img.storage_path);
            }
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          buildings.forEach((b: any) => {
            if (!b.hero_image_url && imageMap.has(b.id)) {
              b.hero_image_url = getBuildingImageUrl(imageMap.get(b.id));
            }
          });
        }
      }

      return buildings;
    },
    enabled: !!user && open,
  });

  // Filtering logic merged from main (supports both search and location)
  const filteredBuildings = useMemo(() => {
    if (!savedBuildings) return [];

    let result = savedBuildings;

    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result = result.filter((building: any) =>
          building.name.toLowerCase().includes(query) ||
          building.city?.toLowerCase().includes(query) ||
          building.country?.toLowerCase().includes(query) ||
          building.address?.toLowerCase().includes(query)
        );
    }

    return result;
  }, [savedBuildings, searchQuery]);

  const addMutation = useMutation({
    mutationFn: async (buildingId: string) => {
        // Get current max order_index
        const { data: maxOrderData, error: maxOrderError } = await supabase
            .from("collection_items")
            .select("order_index")
            .eq("collection_id", collectionId)
            .order("order_index", { ascending: false })
            .limit(1);

        if (maxOrderError) throw maxOrderError;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nextOrderIndex = ((maxOrderData?.[0] as any)?.order_index ?? -1) + 1;

        const { error } = await supabase
            .from("collection_items")
            .insert({
                collection_id: collectionId,
                building_id: buildingId,
                order_index: nextOrderIndex
            });

        if (error) throw error;
    },
    onSuccess: () => {
        toast.success("Building added to collection");
        queryClient.invalidateQueries({ queryKey: ["collection_items", collectionId] });
    },
    onError: (error) => {
        console.error("Failed to add building:", error);
        toast.error("Failed to add building");
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectedBuilding = useMemo(() => {
    if (!selectedBuildingId || !savedBuildings) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return savedBuildings.find((b: any) => b.id === selectedBuildingId);
  }, [selectedBuildingId, savedBuildings]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 shrink-0 border-b">
          <DialogTitle>Add to Collection</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 h-full min-h-0">
          {/* Left Column: List */}
          <div className="w-[350px] shrink-0 flex flex-col border-r">
            <div className="p-4 pb-2 border-b space-y-2">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, city, country, or address..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredBuildings.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                            {searchQuery ? "No buildings found matching your search." : "No saved buildings found."}
                        </p>
                    ) : (
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        filteredBuildings.map((building: any) => {
                            const isAdded = existingBuildingIds.has(building.id);
                            const isSelected = selectedBuildingId === building.id;
                            return (
                                <div
                                    key={building.id}
                                    className={cn(
                                        "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors border border-transparent",
                                        isSelected ? "bg-accent/50 border-border" : "hover:bg-muted/50"
                                    )}
                                    onClick={() => setSelectedBuildingId(building.id)}
                                >
                                    {building.hero_image_url ? (
                                        <img src={building.hero_image_url} alt="" className="w-12 h-12 rounded object-cover bg-secondary" />
                                    ) : (
                                        <div className="w-12 h-12 rounded bg-secondary flex items-center justify-center text-xs text-muted-foreground text-center p-1">No Image</div>
                                    )}

                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-medium text-sm truncate">{building.name}</h4>
                                            {building.rating > 0 && (
                                                <div className="flex items-center gap-0.5">
                                                    {Array.from({ length: 3 }).map((_, i) => (
                                                        <Circle
                                                            key={i}
                                                            className={cn(
                                                                "w-2 h-2",
                                                                i < building.rating
                                                                    ? "fill-[#595959] text-[#595959]"
                                                                    : "text-muted-foreground/20"
                                                            )}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center text-xs text-muted-foreground truncate">
                                            <MapPin className="h-3 w-3 mr-1 inline" />
                                            {building.city && building.country ? `${building.city}, ${building.country}` : "Unknown location"}
                                        </div>
                                    </div>

                                    <Button
                                        size="sm"
                                        variant={isAdded ? "secondary" : "default"}
                                        className="h-8 w-8 p-0 shrink-0"
                                        disabled={isAdded || addMutation.isPending}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            addMutation.mutate(building.id);
                                        }}
                                    >
                                        {isAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                    </Button>
                                </div>
                            );
                        })
                    )}
                </div>
            </ScrollArea>
          </div>

          {/* Right Column: Details */}
          {selectedBuilding ? (
             <BuildingDetailPanel building={selectedBuilding} />
          ) : (
             <div className="flex-1 border-l hidden lg:flex items-center justify-center text-muted-foreground bg-muted/10">
                 Select a building to view details
             </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
