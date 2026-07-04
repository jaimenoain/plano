import { useState, useEffect } from "react";
import { useNavigate, type MetaFunction } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2,
  Merge,
  RefreshCw,
  Building2,
  User,
  Briefcase,
  MapPin,
  Search,
  ArrowRightLeft,
  ChevronRight,
  Play,
  SlidersHorizontal
} from "lucide-react";
import { EntityType, MergeEntity } from "../types/merge";
import { useEntitySearch } from "../hooks/useEntitySearch";
import { motion, AnimatePresence } from "framer-motion";
import { AdminPageHeader } from "@/features/admin/components/admin-ui";

export const meta: MetaFunction = () => [
  { title: "Duplicates Management | Plano Admin" },
  { name: "robots", content: "noindex, nofollow" },
];

type PotentialDuplicate = {
  id1: string;
  name1: string;
  id2: string;
  name2: string;
  score: number;
};

export default function MergeEntities() {
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState<EntityType>("building");
  
  // Search State
  const [masterSearch, setMasterSearch] = useState("");
  const [dupSearch, setDupSearch] = useState("");
  
  const { results: masterResults, loading: loadingMaster } = useEntitySearch(activeType, masterSearch);
  const { results: dupResults, loading: loadingDup } = useEntitySearch(activeType, dupSearch);

  // Selection State
  const [selectedMaster, setSelectedMaster] = useState<MergeEntity | null>(null);
  const [selectedDup, setSelectedDup] = useState<MergeEntity | null>(null);

  // Potential Duplicates State
  const [potentialDuplicates, setPotentialDuplicates] = useState<PotentialDuplicate[]>([]);
  const [loadingPotential, setLoadingPotential] = useState(false);
  const [duplicateQueryRan, setDuplicateQueryRan] = useState(false);
  const [duplicateUnavailable, setDuplicateUnavailable] = useState(false);

  // Query parameters
  const [threshold, setThreshold] = useState(0.7);
  const [limitCount, setLimitCount] = useState("20");

  useEffect(() => {
    // Reset duplicate results and query state when type changes
    setPotentialDuplicates([]);
    setDuplicateQueryRan(false);
    setDuplicateUnavailable(false);
    // Reset selections when type changes
    setSelectedMaster(null);
    setSelectedDup(null);
    setMasterSearch("");
    setDupSearch("");
  }, [activeType]);

  const rpcNameForType: Partial<Record<EntityType, string>> = {
    building: "get_potential_duplicates",
    person: "get_potential_duplicate_people",
    company: "get_potential_duplicate_companies",
    locality: "get_potential_duplicate_localities",
  };

  const fetchPotentialDuplicates = async () => {
    const rpcName = rpcNameForType[activeType];
    if (!rpcName) {
      setDuplicateUnavailable(true);
      return;
    }

    setLoadingPotential(true);
    setDuplicateUnavailable(false);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase.rpc(rpcName as any, {
        limit_count: parseInt(limitCount),
        similarity_threshold: threshold,
      });
      if (error) throw error;
      setPotentialDuplicates((data as PotentialDuplicate[]) ?? []);
    } catch (_error) {
      // RPC not available for this entity type
      setDuplicateUnavailable(true);
      setPotentialDuplicates([]);
    } finally {
      setLoadingPotential(false);
      setDuplicateQueryRan(true);
    }
  };

  const handleCompare = () => {
    if (!selectedMaster || !selectedDup) return;
    navigate(`/admin/merge/${activeType}/${selectedMaster.id}/${selectedDup.id}`);
  };

  const EntityCard = ({ entity, type }: { entity: MergeEntity, type: "master" | "duplicate" }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <Card className={`relative overflow-hidden border-2 transition-all duration-300 ${
        type === "master"
          ? "border-feedback-success/20 bg-surface-card"
          : "border-feedback-destructive/20 bg-surface-card"
      }`}>
        <div className={`absolute top-0 left-0 w-1 h-full ${type === "master" ? "bg-feedback-success" : "bg-feedback-destructive"}`} />
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <Badge variant={type === "master" ? "default" : "destructive"} className="uppercase tracking-wider text-[10px]">
              {type === "master" ? "Master (Survivor)" : "Duplicate (Merging)"}
            </Badge>
            {entity.is_verified && (
              <Badge variant="outline" className="border-border-strong text-text-secondary">
                Verified
              </Badge>
            )}
          </div>
          <CardTitle className="text-xl mt-2 line-clamp-1">{entity.name}</CardTitle>
          <CardDescription className="flex items-center gap-1.5">
            {activeType === "building" && <Building2 className="w-3.5 h-3.5" />}
            {activeType === "person" && <User className="w-3.5 h-3.5" />}
            {activeType === "company" && <Briefcase className="w-3.5 h-3.5" />}
            {activeType === "locality" && <MapPin className="w-3.5 h-3.5" />}
            {entity.subtitle}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-[10px] font-mono text-text-secondary opacity-50 break-all bg-surface-muted/50 p-1.5 rounded">
            ID: {entity.id}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full mt-4 h-8 text-xs hover:bg-surface-muted"
            onClick={() => type === "master" ? setSelectedMaster(null) : setSelectedDup(null)}
          >
            Change Selection
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );

  const typeIcons = {
    building: <Building2 className="w-4 h-4 mr-2" />,
    person: <User className="w-4 h-4 mr-2" />,
    company: <Briefcase className="w-4 h-4 mr-2" />,
    locality: <MapPin className="w-4 h-4 mr-2" />,
  };

  return (
    <div className="mx-auto max-w-6xl space-y-10 min-h-screen pb-24">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <AdminPageHeader
          eyebrow="Entities"
          title="Merge records"
          description="Consolidate duplicate entities across the platform to maintain data integrity."
        />
        <Tabs value={activeType} onValueChange={(v) => setActiveType(v as EntityType)} className="w-full shrink-0 md:w-auto">
          <TabsList className="h-auto rounded-none border-0 bg-transparent p-0">
            <TabsTrigger
              value="building"
              className="gap-2 rounded-none border-b-2 border-transparent px-4 pb-2 pt-0 text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary data-[state=active]:border-text-primary data-[state=active]:text-text-primary data-[state=active]:shadow-none"
            >
              {typeIcons.building} Buildings
            </TabsTrigger>
            <TabsTrigger
              value="person"
              className="gap-2 rounded-none border-b-2 border-transparent px-4 pb-2 pt-0 text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary data-[state=active]:border-text-primary data-[state=active]:text-text-primary data-[state=active]:shadow-none"
            >
              {typeIcons.person} Architects
            </TabsTrigger>
            <TabsTrigger
              value="company"
              className="gap-2 rounded-none border-b-2 border-transparent px-4 pb-2 pt-0 text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary data-[state=active]:border-text-primary data-[state=active]:text-text-primary data-[state=active]:shadow-none"
            >
              {typeIcons.company} Companies
            </TabsTrigger>
            <TabsTrigger
              value="locality"
              className="gap-2 rounded-none border-b-2 border-transparent px-4 pb-2 pt-0 text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary data-[state=active]:border-text-primary data-[state=active]:text-text-primary data-[state=active]:shadow-none"
            >
              {typeIcons.locality} Localities
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_80px_1fr] gap-4 items-center">
        {/* Master Selection */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-feedback-success/10 flex items-center justify-center text-feedback-success font-bold border border-feedback-success/20">1</div>
            <h2 className="text-xl font-semibold">Select Master</h2>
          </div>
          
          <div className="relative group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-text-secondary group-focus-within:text-text-primary transition-colors">
              <Search className="w-4 h-4" />
            </div>
            <Input
              placeholder={`Search ${activeType}s...`}
              value={masterSearch}
              onChange={e => setMasterSearch(e.target.value)}
              className="pl-10 h-12 bg-surface-card border-2 focus:border-text-primary/50 transition-all shadow-xs"
            />
            {loadingMaster && (
              <div className="absolute right-3 top-3.5">
                <Loader2 className="h-5 w-5 animate-spin text-text-primary" />
              </div>
            )}

            <AnimatePresence>
              {masterSearch && !selectedMaster && masterResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute z-20 w-full mt-2 bg-surface-card border-2 rounded-md shadow-lg max-h-72 overflow-y-auto p-1 bg-surface-card/95"
                >
                  {masterResults.map(entity => (
                    <div
                      key={entity.id}
                      className="p-3 hover:bg-surface-muted cursor-pointer flex justify-between items-center gap-3 rounded transition-colors group/item"
                      onClick={() => { setSelectedMaster(entity); setMasterSearch(""); }}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="truncate font-semibold text-sm group-hover/item:text-text-primary transition-colors">{entity.name}</span>
                        <span className="text-text-secondary text-[11px] truncate">{entity.subtitle}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-secondary opacity-0 group-hover/item:opacity-100 transition-all -translate-x-2 group-hover/item:translate-x-0" />
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="min-h-[200px] flex">
            {selectedMaster ? (
              <EntityCard entity={selectedMaster} type="master" />
            ) : (
              <div className="w-full border-2 border-dashed border-feedback-success/20 rounded-md flex flex-col items-center justify-center text-text-secondary bg-surface-muted/50 p-8 text-center space-y-2">
                <div className="w-12 h-12 rounded flex items-center justify-center mb-2 border border-feedback-success/20 bg-feedback-success/5">
                  <div className="w-2 h-2 rounded-full bg-feedback-success animate-pulse" />
                </div>
                <span className="font-medium">No Master Selected</span>
                <span className="text-xs opacity-60">This record will survive the merge</span>
              </div>
            )}
          </div>
        </div>

        {/* Connector */}
        <div className="flex flex-col items-center justify-center gap-4 py-8 lg:py-0">
          <div className="w-px h-12 bg-linear-to-b from-transparent via-border-default to-border-default hidden lg:block" />
          <div className={`p-4 rounded-full border-2 transition-all duration-500 ${
            selectedMaster && selectedDup 
              ? "border-text-primary bg-text-primary text-surface-default ring-2 ring-text-primary scale-105"
              : "bg-surface-muted text-text-secondary border-border-default opacity-40"
          }`}>
            <ArrowRightLeft className={`w-6 h-6 ${selectedMaster && selectedDup ? "animate-pulse" : ""}`} />
          </div>
          <div className="w-px h-12 bg-linear-to-t from-transparent via-border-default to-border-default hidden lg:block" />
        </div>

        {/* Duplicate Selection */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-feedback-destructive/10 flex items-center justify-center text-feedback-destructive font-bold border border-feedback-destructive/20">2</div>
            <h2 className="text-xl font-semibold">Select Duplicate</h2>
          </div>
          
          <div className="relative group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-text-secondary group-focus-within:text-text-primary transition-colors">
              <Search className="w-4 h-4" />
            </div>
            <Input
              placeholder={`Search ${activeType}s...`}
              value={dupSearch}
              onChange={e => setDupSearch(e.target.value)}
              className="pl-10 h-12 bg-surface-card border-2 focus:border-text-primary/50 transition-all shadow-xs"
            />
            {loadingDup && (
              <div className="absolute right-3 top-3.5">
                <Loader2 className="h-5 w-5 animate-spin text-text-primary" />
              </div>
            )}

            <AnimatePresence>
              {dupSearch && !selectedDup && dupResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute z-20 w-full mt-2 bg-surface-card border-2 rounded-md shadow-lg max-h-72 overflow-y-auto p-1 bg-surface-card/95"
                >
                  {dupResults.map(entity => (
                    <div
                      key={entity.id}
                      className="p-3 hover:bg-surface-muted cursor-pointer flex justify-between items-center gap-3 rounded transition-colors group/item"
                      onClick={() => { setSelectedDup(entity); setDupSearch(""); }}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="truncate font-semibold text-sm group-hover/item:text-text-primary transition-colors">{entity.name}</span>
                        <span className="text-text-secondary text-[11px] truncate">{entity.subtitle}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-secondary opacity-0 group-hover/item:opacity-100 transition-all -translate-x-2 group-hover/item:translate-x-0" />
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="min-h-[200px] flex">
            {selectedDup ? (
              <EntityCard entity={selectedDup} type="duplicate" />
            ) : (
              <div className="w-full border-2 border-dashed border-feedback-destructive/20 rounded-md flex flex-col items-center justify-center text-text-secondary bg-surface-muted/50 p-8 text-center space-y-2">
                <div className="w-12 h-12 rounded flex items-center justify-center mb-2 border border-feedback-destructive/20 bg-feedback-destructive/5">
                   <div className="w-2 h-2 rounded-full bg-feedback-destructive animate-pulse" />
                </div>
                <span className="font-medium">No Duplicate Selected</span>
                <span className="text-xs opacity-60">This record will be removed</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Area */}
      <AnimatePresence mode="wait">
        {selectedMaster && selectedDup ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex flex-col items-center py-10 space-y-6"
          >
            <div className="bg-surface-muted/50 p-4 rounded-md border border-border-default max-w-xl text-center">
              <p className="text-sm text-text-secondary">
                You are about to merge <strong className="text-feedback-destructive">"{selectedDup.name}"</strong> into <strong className="text-feedback-success">"{selectedMaster.name}"</strong>.
                All associated records (credits, awards, events) will be reassigned.
              </p>
            </div>
            
            <Button
              size="lg"
              variant="outline"
              disabled={selectedMaster.id === selectedDup.id}
              onClick={handleCompare}
              className="gap-3 rounded-sm border-text-primary px-10 h-14 text-base font-semibold tracking-[0.15em] uppercase group"
            >
              <Merge className="h-6 w-6 transition-transform group-hover:rotate-12" />
              Compare & Unify
            </Button>
            
            {selectedMaster.id === selectedDup.id && (
              <p className="text-feedback-destructive text-xs font-medium bg-feedback-destructive/5 px-3 py-1 rounded border border-feedback-destructive/20">
                Cannot merge a record into itself.
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center py-12 opacity-40 grayscale pointer-events-none"
          >
             <div className="w-20 h-20 rounded-xl bg-surface-muted flex items-center justify-center mb-4">
               <Merge className="w-10 h-10" />
             </div>
             <p className="text-sm font-medium text-text-secondary uppercase tracking-widest">Select two records to begin</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Duplicate Detection Query Runner */}
      <div className="space-y-6 pt-12 border-t-2 border-border-default/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-2xl font-black flex items-center gap-3">
              <div className="w-9 h-9 rounded bg-text-primary/10 flex items-center justify-center border border-text-primary/20">
                <Search className="w-4 h-4 text-text-primary" />
              </div>
              Duplicate Detection
              {duplicateQueryRan && !duplicateUnavailable && (
                <Badge variant="outline" className="ml-1 font-mono">{potentialDuplicates.length} found</Badge>
              )}
            </h3>
            <p className="text-sm text-text-secondary">
              Run a name-similarity scan across {activeType} records to surface potential duplicates.
            </p>
          </div>

          {duplicateQueryRan && !duplicateUnavailable && (
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPotentialDuplicates}
              disabled={loadingPotential}
              className="rounded-full h-9 shrink-0"
            >
              <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loadingPotential ? "animate-spin" : ""}`} />
              Re-run
            </Button>
          )}
        </div>

        {/* Query Parameters */}
        <Card className="bg-surface-card border border-border-default rounded-md">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-5 text-xs font-black text-text-secondary uppercase tracking-widest">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Query Parameters
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-6 items-end">
              {/* Similarity Threshold */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-text-primary">Similarity Threshold</label>
                  <span className="text-sm font-black tabular-nums text-text-primary bg-text-primary/10 px-2.5 py-0.5 rounded-full border border-text-primary/20">
                    {Math.round(threshold * 100)}%
                  </span>
                </div>
                <Slider
                  min={0.5}
                  max={0.99}
                  step={0.01}
                  value={[threshold]}
                  onValueChange={([v]) => setThreshold(v)}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-text-secondary opacity-50">
                  <span>50% — more results</span>
                  <span>99% — near-exact only</span>
                </div>
              </div>

              {/* Limit */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-text-primary">Max Results</label>
                <Select value={limitCount} onValueChange={setLimitCount}>
                  <SelectTrigger className="w-28 bg-surface-card border-2 h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["10", "20", "50", "100"].map(v => (
                      <SelectItem key={v} value={v}>{v} pairs</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Run Button */}
              <Button
                onClick={fetchPotentialDuplicates}
                disabled={loadingPotential}
                variant="outline"
                className="h-10 gap-2 rounded-sm px-6 font-semibold"
              >
                {loadingPotential ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {loadingPotential ? "Scanning..." : "Run Query"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <AnimatePresence mode="wait">
          {!duplicateQueryRan && !loadingPotential && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 text-text-secondary opacity-40 space-y-3"
            >
              <div className="w-16 h-16 rounded-md bg-surface-muted flex items-center justify-center">
                <Play className="w-7 h-7" />
              </div>
              <p className="text-sm font-medium">Configure parameters above and run the query</p>
            </motion.div>
          )}

          {loadingPotential && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 space-y-4"
            >
              <Loader2 className="w-10 h-10 animate-spin text-text-primary" />
              <p className="text-sm font-medium text-text-secondary animate-pulse">Scanning {activeType} records for similar names…</p>
            </motion.div>
          )}

          {duplicateQueryRan && !loadingPotential && duplicateUnavailable && (
            <motion.div
              key="unavailable"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-14 text-text-secondary space-y-3"
            >
              <div className="w-14 h-14 rounded-md bg-surface-muted flex items-center justify-center opacity-40">
                <Search className="w-6 h-6" />
              </div>
              <p className="font-medium opacity-50 text-sm">Duplicate detection is not yet available for {activeType} records.</p>
              <p className="text-xs opacity-30">A <code className="font-mono">get_potential_duplicate_{activeType}s</code> database function is needed.</p>
            </motion.div>
          )}

          {duplicateQueryRan && !loadingPotential && !duplicateUnavailable && potentialDuplicates.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-14 text-text-secondary space-y-3"
            >
              <div className="w-14 h-14 rounded-md bg-surface-muted flex items-center justify-center opacity-40">
                <Search className="w-6 h-6" />
              </div>
              <p className="font-medium opacity-50 text-sm">No matches above {Math.round(threshold * 100)}% similarity — try lowering the threshold.</p>
            </motion.div>
          )}

          {duplicateQueryRan && !loadingPotential && !duplicateUnavailable && potentialDuplicates.length > 0 && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ScrollArea className="h-[420px] rounded-md border border-border-default bg-surface-card overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
                  {potentialDuplicates.map((pair, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.03 }}
                      className="group flex flex-col p-4 bg-surface-card border border-border-default rounded hover:border-border-strong hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex flex-col max-w-[40%]">
                          <span className="text-sm font-bold truncate text-text-primary">{pair.name1}</span>
                          <span className="text-[10px] font-mono text-text-secondary">{pair.id1.slice(0, 8)}</span>
                        </div>

                        <div className="flex flex-col items-center">
                          <div className="text-[10px] font-black text-text-primary uppercase tracking-tighter mb-0.5">Similarity</div>
                          <div className="px-3 py-1 bg-text-primary/10 text-text-primary rounded-full text-xs font-black border border-text-primary/20">
                            {Math.round(pair.score * 100)}%
                          </div>
                        </div>

                        <div className="flex flex-col max-w-[40%] text-right">
                          <span className="text-sm font-bold truncate text-text-primary">{pair.name2}</span>
                          <span className="text-[10px] font-mono text-text-secondary">{pair.id2.slice(0, 8)}</span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        className="w-full h-9 rounded-sm text-xs font-medium"
                        onClick={() => navigate(`/admin/merge/${activeType}/${pair.id1}/${pair.id2}`)}
                      >
                        Analyze & Merge
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
