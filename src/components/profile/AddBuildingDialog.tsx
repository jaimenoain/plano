import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Command, CommandGroup, CommandItem, CommandList, CommandInput } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/useDebounce";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Check, Bookmark, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AddBuildingDialogProps {
  onBuildingAdded?: () => void;
  className?: string;
}

export function AddBuildingDialog({ onBuildingAdded, className }: AddBuildingDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: buildings, isLoading } = useQuery({
    queryKey: ["search-buildings-add", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return [];
      const { data, error } = await supabase.rpc("search_buildings", {
        query_text: debouncedQuery,
      });
      if (error) throw error;
      return data;
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleAdd = async (buildingId: string, status: 'visited' | 'pending', buildingName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ variant: "destructive", title: "You must be logged in to add buildings." });
        return;
      }

      const { error } = await supabase.from("user_buildings").upsert({
        user_id: user.id,
        building_id: buildingId,
        status: status,
        edited_at: new Date().toISOString()
      }, { onConflict: 'user_id, building_id' });

      if (error) throw error;

      toast({
        title: status === 'visited' ? "Marked as Visited" : "Added to Bucket List",
        description: `${buildingName} has been saved to your profile.`
      });

      // Invalidate queries to refresh data across the app
      queryClient.invalidateQueries({ queryKey: ["user-building-statuses"] });
      queryClient.invalidateQueries({ queryKey: ["map-clusters"] });

      // Notify parent component to refresh local state if needed
      onBuildingAdded?.();

      // We can keep the dialog open to allow adding more, or close it.
      // Keeping it open is usually better for "Quick Add" flows.
      // But maybe clear search?
      // setSearchQuery(""); // Optional: Clear search after add
    } catch (error) {
      console.error("Error adding building:", error);
      toast({ variant: "destructive", title: "Failed to add building" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className={cn("h-8 gap-1", className)}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b">
            <DialogTitle>Add Building</DialogTitle>
            <DialogDescription className="sr-only">
              Search and add buildings to your profile.
            </DialogDescription>
        </DialogHeader>

        <Command shouldFilter={false} className="h-[400px] rounded-none border-0">
          <CommandInput
            placeholder="Search for a building..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="border-0 focus:ring-0"
          />
          <CommandList className="max-h-full">
            {isLoading && (
              <div className="flex items-center justify-center p-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Searching...
              </div>
            )}

            {!isLoading && searchQuery.length >= 2 && buildings?.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No buildings found.
              </div>
            )}

            {!isLoading && searchQuery.length < 2 && (
               <div className="p-8 text-center text-sm text-muted-foreground">
                  Type at least 2 characters to search.
               </div>
            )}

            {buildings && buildings.length > 0 && (
              <CommandGroup heading="Results">
                {buildings.map((building) => (
                  <CommandItem key={building.id} className="flex items-center justify-between py-3 px-4" value={building.name}>
                    <div className="flex flex-col gap-1 min-w-0 flex-1 mr-4">
                      <span className="font-medium truncate">{building.name}</span>
                      <div className="flex items-center text-xs text-muted-foreground gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {[building.city, building.country].filter(Boolean).join(", ")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleAdd(building.id, 'pending', building.name);
                        }}
                        title="Add to Bucket List"
                      >
                        <Bookmark className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-green-600 hover:bg-green-500/10"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleAdd(building.id, 'visited', building.name);
                        }}
                        title="Mark as Visited"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
