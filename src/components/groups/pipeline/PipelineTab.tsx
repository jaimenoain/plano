import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { searchBuildingsRpc } from "@/utils/supabaseFallback";
import { Loader2, Plus, Sparkles, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BacklogItemCard } from "./BacklogItemCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebounce } from "@/hooks/useDebounce";

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
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [selectedBuilding, setSelectedBuilding] = useState<any | null>(null);

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
          cycle:group_cycles(id, title),
          building:buildings(id, name, main_image_url, year_completed)
        `)
        .eq("group_id", groupId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
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

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["building-search", debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return [];

      try {
          const data = await searchBuildingsRpc({
              query_text: debouncedSearch
          });
          return data;
      } catch (error) {
          console.error(error);
          return [];
      }
    },
    enabled: debouncedSearch.length >= 2,
  });


  const handleAddItem = async () => {
    if (!selectedBuilding || !user) return;

    try {
      const { error } = await supabase
        .from("group_backlog_items")
        .insert({
          group_id: groupId,
          user_id: user.id,
          building_id: selectedBuilding.id,
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
    setSelectedBuilding(null);
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
          Start building your architectural pipeline
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Collect building ideas, prioritize them, and plan your upcoming sessions.
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

            {!selectedBuilding ? (
              <div className="space-y-4 pt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search buildings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
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
                      {searchResults?.map((building: any) => (
                        <div
                          key={building.id}
                          className="flex gap-3 p-2 hover:bg-accent rounded-md cursor-pointer transition-colors"
                          onClick={() => setSelectedBuilding(building)}
                        >
                          <img
                            src={building.main_image_url || '/placeholder.svg'}
                            alt={building.name}
                            className="w-10 h-14 object-cover rounded bg-muted"
                          />
                          <div>
                            <p className="font-medium text-sm">{building.name}</p>
                            {building.year_completed && (
                              <p className="text-xs text-muted-foreground">
                                {building.year_completed}
                              </p>
                            )}
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
                    src={selectedBuilding.main_image_url || '/placeholder.svg'}
                    alt={selectedBuilding.name}
                    className="w-12 h-16 object-cover rounded"
                  />
                  <div>
                    <p className="font-semibold">{selectedBuilding.name}</p>
                    {selectedBuilding.year_completed && (
                        <p className="text-xs text-muted-foreground">{selectedBuilding.year_completed}</p>
                    )}
                    <Button variant="link" size="sm" className="h-auto p-0 text-muted-foreground" onClick={() => setSelectedBuilding(null)}>Change building</Button>
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
                    placeholder="Why this building? Pitch ideas..."
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
