import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminBuilding } from "@/types/admin_building";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ArrowRight, Merge, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type PotentialDuplicate = {
  id1: string;
  name1: string;
  id2: string;
  name2: string;
  score: number;
};

export default function MergeBuildings() {
  // Search State
  const [masterSearch, setMasterSearch] = useState("");
  const [dupSearch, setDupSearch] = useState("");
  const [masterResults, setMasterResults] = useState<AdminBuilding[]>([]);
  const [dupResults, setDupResults] = useState<AdminBuilding[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(false);
  const [loadingDup, setLoadingDup] = useState(false);

  // Selection State
  const [selectedMaster, setSelectedMaster] = useState<AdminBuilding | null>(null);
  const [selectedDup, setSelectedDup] = useState<AdminBuilding | null>(null);

  // Potential Duplicates State
  const [potentialDuplicates, setPotentialDuplicates] = useState<PotentialDuplicate[]>([]);
  const [loadingPotential, setLoadingPotential] = useState(false);

  // Merge State
  const [isMerging, setIsMerging] = useState(false);

  useEffect(() => {
    fetchPotentialDuplicates();
  }, []);

  const fetchPotentialDuplicates = async () => {
    setLoadingPotential(true);
    try {
      const { data, error } = await supabase.rpc('get_potential_duplicates', {
        limit_count: 20,
        similarity_threshold: 0.7
      });
      // RPC might fail if migration not applied, handle gracefully
      if (error) {
          console.warn("get_potential_duplicates RPC failed (possibly not applied):", error);
          return;
      }
      setPotentialDuplicates(data as unknown as PotentialDuplicate[]);
    } catch (error) {
      console.error("Error fetching potential duplicates:", error);
      toast.error("Failed to fetch potential duplicates");
    } finally {
      setLoadingPotential(false);
    }
  };

  const searchBuildings = async (query: string, setResults: (data: AdminBuilding[]) => void, setLoading: (l: boolean) => void) => {
    if (!query) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .ilike('name', `%${query}%`)
        .eq('is_deleted', false)
        .limit(10);

      if (error) throw error;
      setResults(data as unknown as AdminBuilding[]);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search (simplified)
  useEffect(() => {
    const timer = setTimeout(() => searchBuildings(masterSearch, setMasterResults, setLoadingMaster), 500);
    return () => clearTimeout(timer);
  }, [masterSearch]);

  useEffect(() => {
    const timer = setTimeout(() => searchBuildings(dupSearch, setDupResults, setLoadingDup), 500);
    return () => clearTimeout(timer);
  }, [dupSearch]);

  const handleMerge = async () => {
    if (!selectedMaster || !selectedDup) return;

    setIsMerging(true);
    try {
      const { error } = await supabase.rpc('merge_buildings', {
        master_id: selectedMaster.id,
        duplicate_id: selectedDup.id
      });

      if (error) throw error;

      toast.success(`Successfully merged "${selectedDup.name}" into "${selectedMaster.name}"`);

      // Reset
      setSelectedDup(null);
      setDupSearch("");
      setDupResults([]);
      fetchPotentialDuplicates(); // Refresh list
    } catch (error) {
      console.error("Merge error:", error);
      toast.error("Failed to merge buildings. Ensure SQL migration is applied.");
    } finally {
      setIsMerging(false);
    }
  };

  const loadPair = async (id1: string, id2: string) => {
    // Fetch both buildings full details
    try {
       const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .in('id', [id1, id2]);

       if (error) throw error;
       const b1 = (data as unknown as AdminBuilding[]).find(b => b.id === id1);
       const b2 = (data as unknown as AdminBuilding[]).find(b => b.id === id2);

       if (b1) setSelectedMaster(b1);
       if (b2) setSelectedDup(b2);

       // Scroll up
       window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        toast.error("Failed to load building pair");
    }
  };

  const BuildingCard = ({ building, type }: { building: AdminBuilding, type: "master" | "duplicate" }) => (
    <Card className={`border-2 ${type === "master" ? "border-green-100 bg-green-50/20" : "border-red-100 bg-red-50/20"}`}>
        <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
                <Badge variant={type === "master" ? "default" : "destructive"}>
                    {type === "master" ? "MASTER (To Keep)" : "DUPLICATE (To Delete)"}
                </Badge>
                {building.is_verified && <Badge variant="outline" className="border-green-500 text-green-600">Verified</Badge>}
            </div>
            <CardTitle className="mt-2">{building.name}</CardTitle>
            <CardDescription>{building.year_completed || "Unknown Year"} • {building.city || "Unknown City"}, {building.country || "Unknown Country"}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
            {building.address && <div className="text-muted-foreground">{building.address}</div>}
            {building.architects && building.architects.length > 0 && (
                <div>Architects: {building.architects.join(", ")}</div>
            )}
            <div className="text-xs text-muted-foreground break-all">ID: {building.id}</div>
        </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Merge Buildings</h1>
            <p className="text-muted-foreground">Consolidate duplicate records safely.</p>
        </div>
        <Button variant="outline" onClick={fetchPotentialDuplicates} disabled={loadingPotential}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loadingPotential ? "animate-spin" : ""}`} />
            Refresh Suggestions
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Master Selection */}
        <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center text-green-700">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-2 text-green-700">1</div>
                Select Master Record
            </h2>
            <div className="relative">
                <Input
                    placeholder="Search for the correct record..."
                    value={masterSearch}
                    onChange={e => setMasterSearch(e.target.value)}
                />
                {loadingMaster && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />}

                {masterSearch && !selectedMaster && masterResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {masterResults.map(b => (
                            <div
                                key={b.id}
                                className="p-2 hover:bg-accent cursor-pointer flex justify-between"
                                onClick={() => { setSelectedMaster(b); setMasterSearch(""); }}
                            >
                                <span>{b.name}</span>
                                <span className="text-muted-foreground text-sm">{b.city}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selectedMaster ? (
                <div className="relative group">
                    <BuildingCard building={selectedMaster} type="master" />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setSelectedMaster(null)}
                    >Change</Button>
                </div>
            ) : (
                <div className="h-40 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground bg-muted/30">
                    No Master Selected
                </div>
            )}
        </div>

        {/* Duplicate Selection */}
        <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center text-red-700">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center mr-2 text-red-700">2</div>
                Select Duplicate Record
            </h2>
             <div className="relative">
                <Input
                    placeholder="Search for the duplicate record..."
                    value={dupSearch}
                    onChange={e => setDupSearch(e.target.value)}
                />
                {loadingDup && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />}

                 {dupSearch && !selectedDup && dupResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {dupResults.map(b => (
                            <div
                                key={b.id}
                                className="p-2 hover:bg-accent cursor-pointer flex justify-between"
                                onClick={() => { setSelectedDup(b); setDupSearch(""); }}
                            >
                                <span>{b.name}</span>
                                <span className="text-muted-foreground text-sm">{b.city}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selectedDup ? (
                <div className="relative group">
                    <BuildingCard building={selectedDup} type="duplicate" />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setSelectedDup(null)}
                    >Change</Button>
                </div>
            ) : (
                <div className="h-40 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground bg-muted/30">
                    No Duplicate Selected
                </div>
            )}
        </div>
      </div>

      {/* Action Area */}
      <div className="flex justify-center py-6">
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    size="lg"
                    disabled={!selectedMaster || !selectedDup || isMerging || selectedMaster.id === selectedDup.id}
                    className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
                >
                    {isMerging ? <Loader2 className="h-5 w-5 animate-spin" /> : <Merge className="h-5 w-5" />}
                    Merge Records
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will migrate all reviews, photos, and associations from <strong>{selectedDup?.name}</strong> to <strong>{selectedMaster?.name}</strong>.
                        <br/><br/>
                        The duplicate record will be soft-deleted. This action cannot be easily undone via UI.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleMerge} className="bg-purple-600 hover:bg-purple-700">
                        Confirm Merge
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Potential Duplicates List */}
      <div className="space-y-4 pt-8 border-t">
        <h3 className="text-xl font-semibold">Potential Duplicates</h3>
        <ScrollArea className="h-96 rounded-md border p-4">
            {potentialDuplicates.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                    {loadingPotential ? "Scanning for duplicates..." : "No potential duplicates found."}
                </div>
            ) : (
                <div className="space-y-2">
                    {potentialDuplicates.map((pair, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-card border rounded-md hover:bg-accent/50 transition-colors">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="flex-1 text-right">
                                    <div className="font-medium">{pair.name1}</div>
                                    <div className="text-xs text-muted-foreground">{pair.id1.slice(0, 8)}...</div>
                                </div>
                                <div className="text-muted-foreground font-mono text-xs bg-muted px-2 py-1 rounded">
                                    {Math.round(pair.score * 100)}% Match
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="font-medium">{pair.name2}</div>
                                    <div className="text-xs text-muted-foreground">{pair.id2.slice(0, 8)}...</div>
                                </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                                <Button size="sm" variant="outline" onClick={() => loadPair(pair.id1, pair.id2)}>
                                    Compare
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </ScrollArea>
      </div>
    </div>
  );
}
