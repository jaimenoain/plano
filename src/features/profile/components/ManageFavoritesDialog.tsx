import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FavoriteItem } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { searchBuildingsRpc } from "@/utils/supabaseFallback";
import { Loader2, Search, Circle, X, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useDebounce } from "@/hooks/useDebounce";
import { getBuildingImageUrl } from "@/utils/image";

type SuggestionLogRow = {
  building:
    | { id: string; name: string; hero_image_url: string | null; year_completed: number | null }
    | {
        id: string;
        name: string;
        hero_image_url: string | null;
        year_completed: number | null;
      }[]
    | null;
};

type UserRatingRow = { building_id: string; rating: number | null };

interface ManageFavoritesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  favorites: FavoriteItem[];
  onSave: (favorites: FavoriteItem[]) => Promise<void>;
}

export function ManageFavoritesDialog({ open, onOpenChange, favorites, onSave }: ManageFavoritesDialogProps) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<FavoriteItem[]>(favorites);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 500);
  const [results, setResults] = useState<FavoriteItem[]>([]);
  const [suggestions, setSuggestions] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"suggested" | "search">("suggested");

  // Sync selected with props when dialog opens
  useEffect(() => {
    if (open) {
      setSelected(favorites);
      setQuery("");
      setActiveTab("suggested");
      fetchSuggestions();
    }
  }, [open, favorites]);

  const fetchSuggestions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("user_buildings")
        .select(`
           rating,
           building:buildings ( id, name, hero_image_url, year_completed )
        `)
        .eq("user_id", user.id)
        .eq("rating", 10)
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) {
        const items = (data as SuggestionLogRow[]).flatMap((log) => {
           const b = Array.isArray(log.building) ? log.building[0] : log.building;
           if (!b) return [];
           return [{
             id: b.id,
             media_type: "building" as const,
             title: b.name,
             image_url: getBuildingImageUrl(b.hero_image_url),
             rating: 10 as number,
             year_completed: b.year_completed ? String(b.year_completed) : undefined
           } satisfies FavoriteItem];
        }).filter((item, index, self) =>
            index === self.findIndex((t) => (
                t.id === item.id
            ))
        );
        setSuggestions(items);
      }
    } catch (_e) {
} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
     if (debouncedQuery.length < 2) {
         setResults([]);
         return;
     }

     if (activeTab !== "search") setActiveTab("search");

     const search = async () => {
        setLoading(true);
        try {
           const data = await searchBuildingsRpc({
               query_text: debouncedQuery
           });

           let mapped: FavoriteItem[] = (data || []).map((b) => ({
              id: b.id,
              media_type: "building" as const,
              title: b.name,
              image_url: getBuildingImageUrl(b.main_image_url),
              rating: undefined as number | undefined,
              year_completed: b.year_completed ? String(b.year_completed) : undefined
           }));

           if (user && mapped.length > 0) {
             const buildingIds = mapped.map((r) => String(r.id));
             const { data: userRatings } = await supabase
               .from("user_buildings")
               .select("rating, building_id")
               .eq("user_id", user.id)
               .in("building_id", buildingIds)
               .not("rating", "is", null);

             if (userRatings) {
               const ratingMap = new Map<string, number | null>();
               (userRatings as UserRatingRow[]).forEach((log) => {
                   ratingMap.set(String(log.building_id), log.rating);
               });

               mapped = mapped.map((item) => ({
                 ...item,
                 rating: ratingMap.get(String(item.id)) as number | undefined,
               }));
             }
           }

           setResults(mapped);
        } catch (_e) {
          void _e;
        } finally {
          setLoading(false);
        }
     };

     search();
  }, [debouncedQuery]);

  const toggleSelection = (item: FavoriteItem) => {
     if (selected.find(s => s.id === item.id)) {
        setSelected(prev => prev.filter(s => !(s.id === item.id)));
     } else {
        if (selected.length >= 6) return; // Max 6
        setSelected(prev => [...prev, item]);
     }
  };

  const handleSave = async () => {
      await onSave(selected);
      onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl flex flex-col h-[80vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b">
           <DialogTitle>Manage Favorites ({selected.length}/6)</DialogTitle>
        </DialogHeader>

        <div className="p-4 bg-surface-muted/30">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
             <input
               className="flex h-10 w-full rounded-none border border-border-default bg-surface-default px-3 py-2 pl-9 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-secondary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
               placeholder="Search for buildings..."
               value={query}
               onChange={(e) => {
                   setQuery(e.target.value);
                   if (e.target.value.length >= 2) setActiveTab("search");
               }}
             />
             {query && (
               <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                   <X className="h-4 w-4 text-text-secondary" />
               </button>
             )}
           </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "suggested" | "search")} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 pt-2">
                <TabsList className="w-full">
                    <TabsTrigger value="suggested" className="flex-1">Your Top Rated</TabsTrigger>
                    <TabsTrigger value="search" className="flex-1">Search Database</TabsTrigger>
                </TabsList>
            </div>

            {selected.length > 0 && (
                <div className="px-4 py-2 border-b bg-surface-default/50 backdrop-blur-xs z-10">
                    <div className="eyebrow tracking-widest mb-2">Selected ({selected.length}/6)</div>
                    <div className="flex gap-2 overflow-x-scroll-touch pb-2 snap-x">
                        {selected.map(item => (
                            <div key={item.id} className="relative shrink-0 w-12 snap-start">
                                <div className="aspect-2/3 rounded-none overflow-hidden bg-surface-muted border">
                                    {item.image_url ? (
                                        <img src={item.image_url} className="w-full h-full object-cover" loading="lazy" />
                                    ) : (
                                        <div className="w-full h-full bg-surface-muted" />
                                    )}
                                </div>
                                <button
                                  onClick={() => toggleSelection(item)}
                                  className="absolute -top-1.5 -right-1.5 bg-feedback-destructive text-text-inverse rounded-full p-0.5 hover:scale-110 transition-transform"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <ScrollArea className="flex-1 bg-surface-default">
               <div className="p-2 pb-20">
                  {loading && activeTab === "search" ? (
                      <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-text-secondary" /></div>
                  ) : (
                      <TabsContent value="suggested" className="mt-0 space-y-1">
                          {suggestions.length === 0 && !loading && (
                              <EmptyState
                                  eyebrow="No 10/10 buildings"
                                  message="You haven't rated any buildings 10/10 yet."
                                  action={<Button variant="link" onClick={() => setActiveTab("search")}>Search instead</Button>}
                              />
                          )}
                          {suggestions.map(item => <ListItem key={item.id} item={item} selected={selected} toggle={toggleSelection} />)}
                      </TabsContent>
                  )}

                   <TabsContent value="search" className="mt-0 space-y-1">
                      {results.length === 0 && !loading && (
                          <div className="text-center py-12 px-4 text-text-secondary text-sm">
                              {query.length < 2 ? "Type to search buildings..." : "No results found."}
                          </div>
                      )}
                      {results.map(item => <ListItem key={item.id} item={item} selected={selected} toggle={toggleSelection} />)}
                   </TabsContent>
               </div>
            </ScrollArea>
        </Tabs>

        <div className="p-4 border-t bg-surface-default">
            <Button onClick={handleSave} disabled={loading} className="w-full">
                Save Favorites
            </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}

function ListItem({ item, selected, toggle }: { item: FavoriteItem, selected: FavoriteItem[], toggle: (i: FavoriteItem) => void }) {
    const isSelected = !!selected.find(s => s.id === item.id);
    const isDisabled = !isSelected && selected.length >= 6;

    return (
        <div
          onClick={() => !isDisabled && toggle(item)}
          className={cn(
              "flex items-center gap-3 p-2 rounded-none cursor-pointer transition-colors border border-transparent",
              isSelected ? "bg-brand-primary/5 border-brand-primary/20" : isDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-surface-muted",
          )}
        >
            <div className="h-12 w-8 shrink-0 bg-surface-muted rounded-none overflow-hidden">
                {item.image_url && <img src={item.image_url} className="w-full h-full object-cover" loading="lazy" />}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-medium truncate text-sm">{item.title}</span>
                    {item.year_completed && <span className="text-xs text-text-secondary shrink-0">({item.year_completed})</span>}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-text-secondary mt-0.5">
                    {item.rating && (
                        <span className="flex items-center text-text-secondary gap-0.5 font-medium">
                            <Circle className="h-2.5 w-2.5 fill-current" /> {item.rating}
                        </span>
                    )}
                </div>
            </div>
            <div className={cn(
                "h-5 w-5 rounded-full border flex items-center justify-center transition-colors mr-1",
                isSelected ? "bg-brand-primary border-brand-primary text-brand-primary-foreground" : "border-text-secondary/30"
            )}>
                {isSelected && <Check className="h-3 w-3" />}
            </div>
        </div>
    );
}
