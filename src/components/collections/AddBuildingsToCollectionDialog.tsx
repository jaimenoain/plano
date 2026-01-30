import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, Check, Search, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getBuildingImageUrl } from "@/utils/image";

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
  const [searchQuery, setSearchQuery] = useState("");

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
            hero_image_url
          )
        `)
        .eq("user_id", user.id)
        .neq("status", "ignored");

      if (error) throw error;

      const buildings = data.map(item => ({
        ...item.building,
        hero_image_url: item.building.hero_image_url ? getBuildingImageUrl(item.building.hero_image_url) : null
      }));

      // Identify buildings without images
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
          imagesData.forEach((img: any) => {
            const bId = img.user_buildings.building_id;
            if (!imageMap.has(bId)) {
              imageMap.set(bId, img.storage_path);
            }
          });

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

  const filteredBuildings = useMemo(() => {
    if (!savedBuildings) return [];
    if (!searchQuery) return savedBuildings;

    const query = searchQuery.toLowerCase();
    return savedBuildings.filter((building: any) =>
      building.name.toLowerCase().includes(query) ||
      building.city?.toLowerCase().includes(query) ||
      building.country?.toLowerCase().includes(query)
    );
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
        const nextOrderIndex = (maxOrderData?.[0]?.order_index ?? -1) + 1;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>Add to Collection</DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-4">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search saved buildings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                />
            </div>
        </div>

        <ScrollArea className="flex-1">
            <div className="p-4 pt-0 space-y-2">
                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : filteredBuildings.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                        {searchQuery ? "No buildings found matching your search." : "No saved buildings found."}
                    </p>
                ) : (
                    filteredBuildings.map((building: any) => {
                        const isAdded = existingBuildingIds.has(building.id);
                        return (
                            <div key={building.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors border">
                                {building.hero_image_url ? (
                                    <img src={building.hero_image_url} alt="" className="w-12 h-12 rounded object-cover bg-secondary" />
                                ) : (
                                    <div className="w-12 h-12 rounded bg-secondary flex items-center justify-center text-xs text-muted-foreground text-center p-1">No Image</div>
                                )}

                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-sm truncate">{building.name}</h4>
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
                                    onClick={() => addMutation.mutate(building.id)}
                                >
                                    {isAdded ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                </Button>
                            </div>
                        );
                    })
                )}
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
