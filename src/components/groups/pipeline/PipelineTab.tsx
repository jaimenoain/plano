import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BacklogItemCard } from "./BacklogItemCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PipelineTabProps {
  groupId: string;
}

export function PipelineTab({ groupId }: PipelineTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFilm, setSelectedFilm] = useState<any | null>(null);

  // Add item form state
  const [priority, setPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [note, setNote] = useState("");
  const [cycleId, setCycleId] = useState<string | null>("none");

  // Filters state
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterCycle, setFilterCycle] = useState<string>("all");

  const { data: backlogItems, isLoading } = useQuery({
    queryKey: ["group-backlog", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_backlog_items")
        .select(`
          *,
          user:profiles(id, username, avatar_url),
          cycle:group_cycles(id, title)
        `)
        .eq("group_id", groupId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch film details for each item
      const itemsWithFilm = await Promise.all(data.map(async (item) => {
        const { data: filmData } = await supabase.functions.invoke("tmdb-movie", {
          body: { movieId: item.tmdb_id, type: "movie" }, // Assuming movie for now, could be passed/stored
        });
        return { ...item, film: filmData };
      }));

      return itemsWithFilm;
    },
    enabled: !!groupId,
  });

  const { data: cycles } = useQuery({
    queryKey: ["group-cycles", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_cycles")
        .select("id, title")
        .eq("group_id", groupId)
        .eq("is_active", true);

      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data } = await supabase.functions.invoke("tmdb-search", {
        body: { query: q, type: "multi" },
      });

      const filtered = (data.results || []).filter((item: any) =>
        item.media_type === "movie" || item.media_type === "tv"
      );
      setSearchResults(filtered.slice(0, 10));
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddItem = async () => {
    if (!selectedFilm || !user) return;

    try {
      const { error } = await supabase
        .from("group_backlog_items")
        .insert({
          group_id: groupId,
          user_id: user.id,
          tmdb_id: selectedFilm.id,
          priority: priority,
          status: "Pending",
          admin_note: note,
          cycle_id: cycleId === "none" ? null : cycleId
        });

      if (error) throw error;

      toast({ title: "Added to pipeline" });
      setIsDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["group-backlog", groupId] });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const resetForm = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedFilm(null);
    setPriority("Medium");
    setNote("");
    setCycleId("none");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pendingItems = backlogItems?.filter(i => {
    if (i.status !== "Pending") return false;
    if (filterPriority !== "all" && i.priority !== filterPriority) return false;
    if (filterCycle !== "all") {
        if (filterCycle === "none" && i.cycle_id) return false;
        if (filterCycle !== "none" && i.cycle_id !== filterCycle) return false;
    }
    return true;
  }) || [];

  const PipelineEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 space-y-6 text-center border-2 border-dashed rounded-xl border-muted bg-muted/5">
      <div className="p-5 bg-background rounded-full shadow-sm">
        <Sparkles className="w-10 h-10 text-muted-foreground/50" />
      </div>
      <div className="space-y-2 max-w-sm px-4">
        <h3 className="text-xl font-semibold tracking-tight">
          Start building your movie pipeline
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Collect movie ideas, prioritize them, and plan your upcoming sessions.
        </p>
      </div>
      <Button
        size="lg"
        className="shadow-sm"
        onClick={() => setIsDialogOpen(true)}
      >
        <Plus className="w-5 h-5 mr-2" /> Add First Idea
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold">Programming Pipeline</h2>
          <p className="text-sm text-muted-foreground">Plan future sessions and collect ideas.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Idea</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add to Pipeline</DialogTitle>
            </DialogHeader>

            {!selectedFilm ? (
              <div className="space-y-4 pt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search films..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <ScrollArea className="h-[300px]">
                  {isSearching ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {searchResults.map((film) => (
                        <div
                          key={film.id}
                          className="flex gap-3 p-2 hover:bg-accent rounded-md cursor-pointer transition-colors"
                          onClick={() => setSelectedFilm(film)}
                        >
                          <img
                            src={`https://image.tmdb.org/t/p/w92${film.poster_path}`}
                            alt={film.original_title || film.title || film.name}
                            className="w-10 h-14 object-cover rounded bg-muted"
                          />
                          <div>
                            <p className="font-medium text-sm">{film.original_title || film.title || film.name}</p>
                            {(film.title && film.title !== (film.original_title || film.title)) && (
                              <p className="text-xs text-muted-foreground">{film.title}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {(film.release_date || film.first_air_date)?.split('-')[0]}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            ) : (
              <div className="space-y-4 pt-4">
                <div className="flex gap-3 bg-muted/30 p-3 rounded-lg border">
                  <img
                    src={`https://image.tmdb.org/t/p/w92${selectedFilm.poster_path}`}
                    alt={selectedFilm.original_title || selectedFilm.title || selectedFilm.name}
                    className="w-12 h-16 object-cover rounded"
                  />
                  <div>
                    <p className="font-semibold">{selectedFilm.original_title || selectedFilm.title || selectedFilm.name}</p>
                    {(selectedFilm.title && selectedFilm.title !== (selectedFilm.original_title || selectedFilm.title)) && (
                        <p className="text-xs text-muted-foreground">{selectedFilm.title}</p>
                    )}
                    <Button variant="link" size="sm" className="h-auto p-0 text-muted-foreground" onClick={() => setSelectedFilm(null)}>Change film</Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Cycle (Optional)</Label>
                  <Select value={cycleId || "none"} onValueChange={setCycleId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a cycle..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {cycles?.map((cycle: any) => (
                        <SelectItem key={cycle.id} value={cycle.id}>{cycle.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Admin Note</Label>
                  <Textarea
                    placeholder="Why this film? Pitch ideas..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>

                <Button className="w-full" onClick={handleAddItem}>Add to Pipeline</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <div className="w-[150px]">
             <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                </SelectContent>
             </Select>
        </div>
        <div className="w-[200px]">
             <Select value={filterCycle} onValueChange={setFilterCycle}>
                <SelectTrigger>
                    <SelectValue placeholder="Cycle" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Cycles</SelectItem>
                    <SelectItem value="none">No Cycle</SelectItem>
                    {cycles?.map((cycle: any) => (
                        <SelectItem key={cycle.id} value={cycle.id}>{cycle.title}</SelectItem>
                    ))}
                </SelectContent>
             </Select>
        </div>
      </div>

      <div className="grid gap-4">
        {pendingItems.length === 0 ? (
          backlogItems?.length === 0 ? (
            <PipelineEmptyState />
          ) : (
            <div className="text-center py-12 border border-dashed rounded-lg bg-muted/10">
              <p className="text-muted-foreground">
                No items match your filters.
              </p>
            </div>
          )
        ) : (
          pendingItems.map((item) => (
            <BacklogItemCard
              key={item.id}
              item={item}
              cycles={cycles || []}
              onUpdate={() => queryClient.invalidateQueries({ queryKey: ["group-backlog", groupId] })}
            />
          ))
        )}
      </div>
    </div>
  );
}
