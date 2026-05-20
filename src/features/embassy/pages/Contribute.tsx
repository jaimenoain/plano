import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, Link, useNavigate } from "react-router";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import {
  fetchAmbassadorBuildingsMissingMetadata,
  fetchAmbassadorUnclaimedFirms,
  fetchAmbassadorRecentBuildings,
  fetchAmbassadorBuildingsWithoutPhotos,
  fetchModerationPhotos,
  fetchModerationVideos,
  fetchModerationCredits,
  approveBuilding,
  approvePhoto,
  approveCredit,
  approveVideo,
  type AmbassadorUnclaimedFirm,
} from "@/features/embassy/api/taskFeed";
import type { BuildingResearchResult, ResearchDataPoint } from "@/features/embassy/api/building-research.route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Search, ArrowLeft, Filter, CheckCircle2,
  AlertCircle, MessageSquare, Loader2,
  Camera, Sparkles, UserPlus, ExternalLink, Map, List,
  Flag, Video, Award, Telescope, XCircle, CheckCircle,
  RefreshCw, Building2, User, Briefcase, MapPin,
  SlidersHorizontal, Play, ChevronRight,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { EntityType } from "@/features/admin/types/merge";
import { getBuildingImageUrl, getStorageAssetUrl } from "@/utils/image";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { getBuildingUrl } from "@/utils/url";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapProvider, useMapContext } from "@/features/maps/providers/MapContext";
import { PlanoMap } from "@/features/maps/components/PlanoMap";

interface OutreachLogRow {
  id: string;
  firm_id: string;
  ambassador_id: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  profiles: { username: string; avatar_url: string | null } | null;
}

type ToolType = "research" | "photography" | "outreach" | "curation" | "community" | null;

interface ToolDefinition {
  key: NonNullable<ToolType>;
  title: string;
  description: string;
  icon: React.ReactNode;
  asChild?: boolean;
}

const ALL_TOOLS: ToolDefinition[] = [
  {
    key: "research",
    title: "Data & Research",
    description: "Complete missing metadata like architects, completion years, and styles.",
    icon: <Search className="h-6 w-6" />,
  },
  {
    key: "photography",
    title: "Photography",
    description: "Find buildings that need photos and help document them visually.",
    icon: <Camera className="h-6 w-6" />,
  },
  {
    key: "outreach",
    title: "Architect Outreach",
    description: "Help firms claim their portfolio and verify their credits.",
    icon: <CheckCircle2 className="h-6 w-6" />,
  },
  {
    key: "curation",
    title: "Moderation",
    description: "Review new buildings, photos, videos, and credits before they go live.",
    icon: <Filter className="h-6 w-6" />,
  },
  {
    key: "community",
    title: "Grow Community",
    description: "Invite architects and firms in your area to join Plano.",
    icon: <UserPlus className="h-6 w-6" />,
    asChild: true,
  },
];

function sortToolsByPreference(preferred: string[] | null | undefined): ToolDefinition[] {
  if (!preferred || preferred.length === 0) return ALL_TOOLS;
  const preferredSet = new Set(preferred);
  const ordered = preferred
    .map((key) => ALL_TOOLS.find((t) => t.key === key))
    .filter((t): t is ToolDefinition => t !== undefined);
  const rest = ALL_TOOLS.filter((t) => !preferredSet.has(t.key));
  return [...ordered, ...rest];
}

export default function ContributePage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTool = (searchParams.get("tool") as ToolType) ?? null;
  const setActiveTool = (tool: ToolType) => {
    if (tool) {
      setSearchParams({ tool }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  // Fetch membership for chapterId and preferred_tools
  const { data: membership, isLoading: membershipLoading } = useQuery({
    queryKey: ["ambassador-membership", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ambassador_memberships")
        .select("role, status, onboarded_at, chapter_id, preferred_tools")
        .eq("user_id", user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const chapterId = membership?.chapter_id;
  const sortedTools = sortToolsByPreference(membership?.preferred_tools);

  // When navigating directly to a tool URL, show a loading skeleton while
  // the membership query resolves and chapterId becomes available.
  if (activeTool && membershipLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (activeTool === "research" && chapterId) {
    return <DataResearchTool chapterId={chapterId} onBack={() => setActiveTool(null)} />;
  }

  if (activeTool === "outreach" && chapterId) {
    return <ArchitectOutreachTool chapterId={chapterId} onBack={() => setActiveTool(null)} />;
  }

  if (activeTool === "photography" && chapterId) {
    return (
      <MapProvider>
        <PhotographyTool chapterId={chapterId} onBack={() => setActiveTool(null)} />
      </MapProvider>
    );
  }

  if (activeTool === "curation" && chapterId) {
    return <CurationTool chapterId={chapterId} onBack={() => setActiveTool(null)} />;
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Contribute</h1>
        <p className="text-muted-foreground">
          Select a tool to help build the catalogue in your chapter.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sortedTools.map((tool) => (
          <ToolCard
            key={tool.key}
            title={tool.title}
            description={tool.description}
            icon={tool.icon}
            onClick={() => setActiveTool(tool.key)}
            active
            asChild={tool.asChild}
          >
            {tool.key === "community" && <Link to="/connect">Open Connect</Link>}
          </ToolCard>
        ))}
      </div>
    </div>
  );
}

function ToolCard({ title, description, icon, onClick, active = true, comingSoon, children, asChild }: { 
  title: string; 
  description: string; 
  icon: React.ReactNode; 
  onClick?: () => void;
  active?: boolean;
  comingSoon?: boolean;
  children?: React.ReactNode;
  asChild?: boolean;
}) {
  return (
    <Card 
      className={cn(
        "relative flex flex-col p-6 transition-all",
        active ? "hover:border-brand-primary cursor-pointer border-border-default shadow-sm" : "opacity-60 border-dashed"
      )}
      onClick={!asChild && active ? onClick : undefined}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          "p-2 rounded-lg",
          active ? "bg-brand-primary/10 text-brand-primary" : "bg-muted text-muted-foreground"
        )}>
          {icon}
        </div>
        {comingSoon && (
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider">Coming Soon</Badge>
        )}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 flex-1">{description}</p>
      {asChild ? (
        <Button asChild variant="default" size="sm" className="w-full mt-auto">
          {children}
        </Button>
      ) : (
        <Button 
          variant={active ? "default" : "secondary"} 
          size="sm" 
          className="w-full mt-auto"
          disabled={!active}
        >
          {active ? "Open Tool" : "Locked"}
        </Button>
      )}
    </Card>
  );
}

type ResearchStatus =
  | { status: "idle" }
  | { status: "loading"; buildingId: string }
  | { status: "ready"; result: BuildingResearchResult }
  | { status: "saving"; result: BuildingResearchResult };

type ResearchTab = "data-completion" | "duplicates";

function DataResearchTool({ chapterId, onBack }: { chapterId: string; onBack: () => void }) {
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [researchState, setResearchState] = useState<ResearchStatus>({ status: "idle" });
  const [tab, setTab] = useState<ResearchTab>("data-completion");

  const { data: buildings, isLoading, error } = useQuery({
    queryKey: ["embassy-missing-metadata", chapterId],
    queryFn: () => fetchAmbassadorBuildingsMissingMetadata(chapterId),
    enabled: !!chapterId,
  });

  const filteredBuildings = useMemo(() => {
    if (!buildings) return [];
    const needle = search.trim().toLowerCase();
    return buildings
      .map((b) => {
        const missing_fields: string[] = [];
        if (b.year_completed == null) missing_fields.push("year_completed");
        if (!b.has_styles) missing_fields.push("styles");
        if (!b.has_architect_credit) missing_fields.push("architect_credit");
        return { ...b, missing_fields };
      })
      .filter((b) => {
        const matchesSearch =
          needle.length === 0 ||
          b.name.toLowerCase().includes(needle) ||
          (b.city && b.city.toLowerCase().includes(needle)) ||
          (b.country && b.country.toLowerCase().includes(needle));
        const matchesFilter = filter === "all" || b.missing_fields.includes(filter);
        return matchesSearch && matchesFilter;
      });
  }, [buildings, search, filter]);

  const filters = [
    { label: "All tasks", value: "all" },
    { label: "Missing Architect", value: "architect_credit" },
    { label: "Missing Year", value: "year_completed" },
    { label: "Missing Style", value: "styles" },
  ];

  async function handleAiResearch(buildingId: string) {
    setResearchState({ status: "loading", buildingId });
    try {
      const res = await fetch("/api/embassy/building-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "research", building_id: buildingId }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Research failed");
      }
      const result = (await res.json()) as BuildingResearchResult;
      if (result.data_points.length === 0) {
        toast.info("No data found for this building. Try completing data manually.");
        setResearchState({ status: "idle" });
        return;
      }
      setResearchState({ status: "ready", result });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI research failed. Please try again.");
      setResearchState({ status: "idle" });
    }
  }

  // Show the review panel when results are ready
  if (researchState.status === "ready" || researchState.status === "saving") {
    return (
      <ResearchReviewPanel
        result={researchState.result}
        isSaving={researchState.status === "saving"}
        onBack={() => setResearchState({ status: "idle" })}
        onSave={async (updates) => {
          setResearchState({ status: "saving", result: researchState.result });
          try {
            const res = await fetch("/api/embassy/building-research", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "apply",
                building_id: researchState.result.building_id,
                updates,
              }),
            });
            if (!res.ok) {
              const err = (await res.json()) as { error?: string };
              throw new Error(err.error ?? "Save failed");
            }
            toast.success("Research data saved successfully.");
            setResearchState({ status: "idle" });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save. Please try again.");
            setResearchState({ status: "ready", result: researchState.result });
          }
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Data & Research</h1>
          <p className="text-sm text-muted-foreground">Complete missing records in your area.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ResearchTab)}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="data-completion">Data completion</TabsTrigger>
          <TabsTrigger value="duplicates">Duplicate Detection</TabsTrigger>
        </TabsList>

        <TabsContent value="data-completion" className="mt-6 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search buildings..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {filters.map((f) => (
                <Button
                  key={f.value}
                  variant={filter === f.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(f.value)}
                  className="whitespace-nowrap rounded-full"
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-4">
              {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
            </div>
          ) : error ? (
            <div className="p-8 text-center border rounded-xl bg-destructive/5 text-destructive">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Failed to load research tasks. Please try again.</p>
            </div>
          ) : filteredBuildings.length === 0 ? (
            <div className="p-12 text-center border border-dashed rounded-xl">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-lg font-medium">All caught up!</p>
              <p className="text-sm text-muted-foreground">No buildings match your current filters.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredBuildings.map((b) => {
                const isResearching =
                  researchState.status === "loading" && researchState.buildingId === b.id;
                return (
                  <Card
                    key={b.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-6 group hover:border-brand-primary transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{b.name}</h3>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-muted-foreground">
                          {b.city || b.country || "Global"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {b.missing_fields?.map(field => (
                          <Badge
                            key={field}
                            variant="secondary"
                            className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-none text-[10px] font-bold uppercase"
                          >
                            {field === "architect_credit" ? "No Architect" :
                             field === "year_completed" ? "No Year" :
                             field === "styles" ? "No Style" : field}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={researchState.status === "loading"}
                        onClick={() => handleAiResearch(b.id)}
                        className="gap-1.5"
                      >
                        {isResearching ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Researching…
                          </>
                        ) : (
                          <>
                            <Telescope className="h-3.5 w-3.5" />
                            Research with AI
                          </>
                        )}
                      </Button>
                      <Button size="sm" asChild>
                        <Link to={`${getBuildingUrl(b.id, b.slug, b.short_id)}/edit`}>
                          Complete Data
                        </Link>
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="duplicates" className="mt-6">
          <DuplicateDetectionPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------- Duplicate Detection Panel ----------

type PotentialDuplicate = {
  id1: string;
  name1: string;
  id2: string;
  name2: string;
  score: number;
};

const RPC_NAME_FOR_ENTITY_TYPE: Partial<Record<EntityType, string>> = {
  building: "get_potential_duplicates",
  person: "get_potential_duplicate_people",
  company: "get_potential_duplicate_companies",
  locality: "get_potential_duplicate_localities",
};

function DuplicateDetectionPanel() {
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState<EntityType>("building");
  const [potentialDuplicates, setPotentialDuplicates] = useState<PotentialDuplicate[]>([]);
  const [loadingPotential, setLoadingPotential] = useState(false);
  const [duplicateQueryRan, setDuplicateQueryRan] = useState(false);
  const [duplicateUnavailable, setDuplicateUnavailable] = useState(false);
  const [threshold, setThreshold] = useState(0.7);
  const [limitCount, setLimitCount] = useState("20");

  useEffect(() => {
    setPotentialDuplicates([]);
    setDuplicateQueryRan(false);
    setDuplicateUnavailable(false);
  }, [activeType]);

  const fetchPotentialDuplicates = async () => {
    const rpcName = RPC_NAME_FOR_ENTITY_TYPE[activeType];
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
      setDuplicateUnavailable(true);
      setPotentialDuplicates([]);
    } finally {
      setLoadingPotential(false);
      setDuplicateQueryRan(true);
    }
  };

  const typeIcons = {
    building: <Building2 className="w-4 h-4 mr-2" />,
    person: <User className="w-4 h-4 mr-2" />,
    company: <Briefcase className="w-4 h-4 mr-2" />,
    locality: <MapPin className="w-4 h-4 mr-2" />,
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeType} onValueChange={(v) => setActiveType(v as EntityType)} className="w-full md:w-auto">
        <TabsList className="grid grid-cols-2 md:flex bg-surface-muted p-1">
          <TabsTrigger value="building" className="px-4">{typeIcons.building} Buildings</TabsTrigger>
          <TabsTrigger value="person" className="px-4">{typeIcons.person} Architects</TabsTrigger>
          <TabsTrigger value="company" className="px-4">{typeIcons.company} Companies</TabsTrigger>
          <TabsTrigger value="locality" className="px-4">{typeIcons.locality} Localities</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-2xl font-black flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20">
              <Search className="w-4 h-4 text-brand-primary" />
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

      <Card className="bg-surface-card border border-border-default rounded-md">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-5 text-xs font-black text-text-secondary uppercase tracking-widest">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Query Parameters
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,auto] gap-6 items-end">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-text-primary">Similarity Threshold</label>
                <span className="text-sm font-black tabular-nums text-brand-primary bg-brand-primary/10 px-2.5 py-0.5 rounded-full border border-brand-primary/20">
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

            <Button
              onClick={fetchPotentialDuplicates}
              disabled={loadingPotential}
              className="h-10 px-6 bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold gap-2 shadow-md transition-colors"
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
            <Loader2 className="w-10 h-10 animate-spin text-brand-primary" />
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
                        <div className="text-[10px] font-black text-brand-primary uppercase tracking-tighter mb-0.5">Similarity</div>
                        <div className="px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-xs font-black border border-brand-primary/20">
                          {Math.round(pair.score * 100)}%
                        </div>
                      </div>

                      <div className="flex flex-col max-w-[40%] text-right">
                        <span className="text-sm font-bold truncate text-text-primary">{pair.name2}</span>
                        <span className="text-[10px] font-mono text-text-secondary">{pair.id2.slice(0, 8)}</span>
                      </div>
                    </div>

                    <Button
                      className="w-full h-9 bg-surface-muted hover:bg-brand-primary hover:text-white text-text-primary text-xs font-bold transition-all border-none"
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
  );
}

// ---------- Research Review Panel ----------

const FIELD_LABELS: Record<string, string> = {
  year_completed:   "Year Completed",
  status:           "Status",
  alt_name:         "Alternative Name",
  category:         "Category",
  typologies:       "Typologies",
  style:            "Architectural Style",
  materiality:      "Materiality",
  context:          "Context",
  access_level:     "Access Level",
  access_logistics: "Access Logistics",
  access_cost:      "Access Cost",
  access_notes:     "Access Notes",
  size_sqm:         "Floor Area (sqm)",
  height_m:         "Height (m)",
  storeys:          "Storeys",
};

const ARRAY_FIELDS = new Set(["typologies", "style", "materiality", "context"]);

type ReviewItem = ResearchDataPoint & { accepted: boolean; editedValue: string };

function ResearchReviewPanel({
  result,
  isSaving,
  onBack,
  onSave,
}: {
  result: BuildingResearchResult;
  isSaving: boolean;
  onBack: () => void;
  onSave: (updates: Record<string, unknown>) => void;
}) {
  const [items, setItems] = useState<ReviewItem[]>(() =>
    result.data_points.map((dp) => ({
      ...dp,
      accepted: true,
      editedValue: Array.isArray(dp.value) ? dp.value.join(", ") : String(dp.value),
    })),
  );

  const acceptedCount = items.filter((i) => i.accepted).length;

  function toggleAccepted(field: string) {
    setItems((prev) =>
      prev.map((i) => (i.field === field ? { ...i, accepted: !i.accepted } : i)),
    );
  }

  function handleValueChange(field: string, raw: string) {
    setItems((prev) =>
      prev.map((i) => (i.field === field ? { ...i, editedValue: raw } : i)),
    );
  }

  function handleSave() {
    const updates: Record<string, unknown> = {};
    for (const item of items) {
      if (!item.accepted) continue;
      const v = item.editedValue.trim();
      if (!v) continue;
      if (ARRAY_FIELDS.has(item.field)) {
        const arr = v.split(",").map((s) => s.trim()).filter(Boolean);
        if (arr.length > 0) updates[item.field] = arr;
      } else if (item.field === "year_completed" || item.field === "storeys") {
        const n = parseInt(v, 10);
        if (!isNaN(n)) updates[item.field] = n;
      } else if (item.field === "size_sqm" || item.field === "height_m") {
        const n = parseFloat(v);
        if (!isNaN(n)) updates[item.field] = n;
      } else {
        updates[item.field] = v;
      }
    }
    if (Object.keys(updates).length === 0) return;
    onSave(updates);
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} disabled={isSaving}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">
            Review: {result.building_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Accept or reject each data point. You can edit values inline before saving.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {items.map((item) => (
          <Card
            key={item.field}
            className={cn(
              "p-5 transition-all border-2",
              item.accepted
                ? "border-brand-primary/40 bg-brand-primary/[0.03]"
                : "border-border-default opacity-60",
            )}
          >
            <div className="flex items-start gap-4">
              {/* Accept / Reject buttons */}
              <div className="flex shrink-0 gap-1 mt-0.5">
                <button
                  type="button"
                  onClick={() => !item.accepted && toggleAccepted(item.field)}
                  disabled={isSaving || item.accepted}
                  aria-label="Accept this data point"
                  aria-pressed={item.accepted}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                    item.accepted
                      ? "bg-brand-primary text-white cursor-default"
                      : "border border-border-default text-muted-foreground hover:border-brand-primary hover:text-brand-primary",
                  )}
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => item.accepted && toggleAccepted(item.field)}
                  disabled={isSaving || !item.accepted}
                  aria-label="Reject this data point"
                  aria-pressed={!item.accepted}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                    !item.accepted
                      ? "bg-destructive text-white cursor-default"
                      : "border border-border-default text-muted-foreground hover:border-destructive hover:text-destructive",
                  )}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Reject
                </button>
              </div>

              <div className="flex-1 min-w-0 flex flex-col md:flex-row md:gap-5">
                {/* Left: label + editable value */}
                <div className="flex-1 min-w-0 space-y-3">
                  {/* Field label */}
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {FIELD_LABELS[item.field] ?? item.field}
                  </p>

                  {/* Editable value */}
                  {item.field === "access_notes" ? (
                    <Textarea
                      value={item.editedValue}
                      disabled={!item.accepted || isSaving}
                      onChange={(e) => handleValueChange(item.field, e.target.value)}
                      rows={3}
                      className="text-sm min-h-[80px]"
                    />
                  ) : (
                    <Input
                      value={item.editedValue}
                      disabled={!item.accepted || isSaving}
                      onChange={(e) => handleValueChange(item.field, e.target.value)}
                      className="text-sm"
                    />
                  )}
                  {ARRAY_FIELDS.has(item.field) && (
                    <p className="text-[11px] text-muted-foreground">Comma-separated — edit or remove values as needed.</p>
                  )}
                </div>

                {/* Right: source snippet + URL */}
                {(item.source_url || item.snippet) && (
                  <div className="md:w-72 shrink-0 rounded-md bg-muted/60 p-3 space-y-1.5 text-xs text-muted-foreground mt-3 md:mt-0 self-start">
                    {item.snippet && (
                      <p className="italic leading-relaxed">&ldquo;{item.snippet}&rdquo;</p>
                    )}
                    {item.source_url && (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-brand-primary hover:underline break-all"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        {item.source_url}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-background/95 backdrop-blur border-t border-border-default px-4 py-4 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {acceptedCount} of {items.length} data point{items.length !== 1 ? "s" : ""} accepted
        </p>
        <Button
          onClick={handleSave}
          disabled={acceptedCount === 0 || isSaving}
          className="gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Save {acceptedCount} accepted
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

const OUTREACH_PAGE_SIZE = 25;

function ArchitectOutreachTool({ chapterId, onBack }: { chapterId: string; onBack: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(OUTREACH_PAGE_SIZE);
  const [drawerFirm, setDrawerFirm] = useState<AmbassadorUnclaimedFirm | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data: firms, isLoading, error } = useQuery({
    queryKey: ["embassy-unclaimed-firms", chapterId],
    queryFn: () => fetchAmbassadorUnclaimedFirms(chapterId),
    enabled: !!chapterId,
  });

  // My most recent log per firm — used only for the status badge in the list
  const { data: myLogs } = useQuery({
    queryKey: ["embassy-outreach-logs", user?.id],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("outreach_log")
        .select("firm_id, status, created_at")
        .eq("ambassador_id", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as { firm_id: string; status: string; created_at: string }[];
    },
    enabled: !!user,
  });

  const myLogByFirm = useMemo(() => {
    const map: Record<string, string> = {};
    myLogs?.forEach(l => {
      if (!map[l.firm_id]) map[l.firm_id] = l.status;
    });
    return map;
  }, [myLogs]);

  // Search filters the full dataset; visibleCount controls how many are rendered.
  const filteredFirms = useMemo(() => {
    if (!firms) return [];
    return firms.filter(f =>
      f.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [firms, search]);

  // Reset visible count when search changes so results start from the top.
  useEffect(() => {
    setVisibleCount(OUTREACH_PAGE_SIZE);
  }, [search]);

  // Extend visible slice when the sentinel scrolls into view.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount(c => c + OUTREACH_PAGE_SIZE);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredFirms.length]);

  const visibleFirms = filteredFirms.slice(0, visibleCount);
  const hasMore = visibleCount < filteredFirms.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Architect Outreach</h1>
          <p className="text-sm text-muted-foreground">Help firms claim their portfolio and verify their credits.</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search firms..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : error ? (
        <div className="p-8 text-center border rounded-xl bg-destructive/5 text-destructive">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p>Failed to load firms. Please try again.</p>
        </div>
      ) : filteredFirms.length === 0 ? (
        <div className="p-12 text-center border border-dashed rounded-xl">
          <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-lg font-medium">No firms found</p>
          <p className="text-sm text-muted-foreground">All firms in your area have been claimed or contacted.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {visibleFirms.map((f) => {
            const latestStatus = myLogByFirm[f.id];
            return (
              <Card
                key={f.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:border-brand-primary transition-all"
                onClick={() => setDrawerFirm(f)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{f.name}</h3>
                    {latestStatus && (
                      <Badge variant="secondary" className={cn(
                        "text-[10px] uppercase font-bold",
                        latestStatus === "claimed" ? "bg-green-500/10 text-green-600" :
                        latestStatus === "declined" ? "bg-red-500/10 text-red-600" :
                        latestStatus === "replied" ? "bg-purple-500/10 text-purple-600" :
                        "bg-blue-500/10 text-blue-600"
                      )}>
                        {latestStatus}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {f.building_count} building{f.building_count === 1 ? "" : "s"} on Plano
                    {f.country ? ` · ${f.country}` : ""}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="shrink-0 gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Open
                </Button>
              </Card>
            );
          })}
          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}

      <FirmOutreachDrawer
        firm={drawerFirm}
        open={!!drawerFirm}
        onClose={() => setDrawerFirm(null)}
        userId={user?.id}
        onLogSuccess={() =>
          queryClient.invalidateQueries({ queryKey: ["embassy-outreach-logs", user?.id] })
        }
      />
    </div>
  );
}

function FirmOutreachDrawer({
  firm,
  open,
  onClose,
  userId,
  onLogSuccess,
}: {
  firm: AmbassadorUnclaimedFirm | null;
  open: boolean;
  onClose: () => void;
  userId: string | undefined;
  onLogSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("contacted");

  const { data: logs, isLoading: logsLoading, isError: logsError, refetch: refetchLogs } = useQuery({
    queryKey: ["embassy-firm-outreach-logs", firm?.id],
    queryFn: async () => {
      // Fetch logs without a profiles join so this works regardless of whether the
      // outreach_log.ambassador_id FK points to auth.users or public.profiles.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: logData, error: logsErr } = await (supabase as any)
        .from("outreach_log")
        .select("*")
        .eq("firm_id", firm!.id)
        .order("created_at", { ascending: false });
      if (logsErr) throw logsErr;
      const rows = (logData ?? []) as Omit<OutreachLogRow, "profiles">[];
      if (rows.length === 0) return [] as OutreachLogRow[];

      // Batch-fetch profiles for every unique ambassador in the result.
      const ambassadorIds = [...new Set(rows.map((r) => r.ambassador_id))];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profileData } = await (supabase as any)
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", ambassadorIds);
      const profileMap: Record<string, { username: string; avatar_url: string | null }> = {};
      for (const p of profileData ?? []) {
        profileMap[p.id] = { username: p.username, avatar_url: p.avatar_url };
      }

      return rows.map((log) => ({
        ...log,
        profiles: profileMap[log.ambassador_id] ?? null,
      })) as OutreachLogRow[];
    },
    enabled: !!firm?.id,
  });

  const logMutation = useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("outreach_log")
        .insert({ firm_id: firm!.id, ambassador_id: userId, status, notes: notes || null });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Interaction logged");
      setNotes("");
      setStatus("contacted");
      queryClient.invalidateQueries({ queryKey: ["embassy-firm-outreach-logs", firm?.id] });
      onLogSuccess();
    },
    onError: () => toast.error("Failed to log interaction"),
  });

  const statusColors: Record<string, string> = {
    claimed: "bg-green-500/10 text-green-600",
    declined: "bg-red-500/10 text-red-600",
    replied: "bg-purple-500/10 text-purple-600",
    contacted: "bg-blue-500/10 text-blue-600",
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="flex flex-col gap-0 p-0 w-full sm:max-w-md overflow-hidden">
        {/* Firm header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle className="truncate pr-6">{firm?.name}</SheetTitle>
          <SheetDescription>
            {firm?.building_count} building{firm?.building_count === 1 ? "" : "s"} on Plano
            {firm?.country ? ` · ${firm.country}` : ""}
          </SheetDescription>
          {firm?.slug && (
            <Button variant="outline" size="sm" asChild className="w-fit mt-1">
              <Link to={`/company/${firm.slug}`} onClick={onClose}>
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                View Firm Page
              </Link>
            </Button>
          )}
        </SheetHeader>

        {/* Log new interaction */}
        <div className="px-6 py-4 border-b shrink-0 bg-surface-muted/40 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Log Interaction</p>
          <div className="flex flex-wrap gap-1.5">
            {["contacted", "replied", "claimed", "declined"].map((s) => (
              <Button
                key={s}
                variant={status === s ? "default" : "outline"}
                size="sm"
                onClick={() => setStatus(s)}
                className="capitalize h-7 text-xs"
              >
                {s}
              </Button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="outreach-notes" className="text-xs">Notes</Label>
            <Textarea
              id="outreach-notes"
              placeholder="Who you spoke to, what was discussed…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="text-sm resize-none"
            />
          </div>
          <Button
            size="sm"
            className="w-full"
            onClick={() => logMutation.mutate()}
            disabled={logMutation.isPending}
          >
            {logMutation.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : "Save Interaction"}
          </Button>
        </div>

        {/* Interaction timeline */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Interaction History</p>
          {logsLoading ? (
            <div className="space-y-3">
              {[0, 1].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          ) : logsError ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-sm text-destructive">Failed to load interactions.</p>
              <Button variant="outline" size="sm" onClick={() => refetchLogs()}>
                Try again
              </Button>
            </div>
          ) : !logs?.length ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No interactions logged yet.
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => {
                const profile = log.profiles;
                const displayName = profile?.username
                  ? (log.ambassador_id === userId ? "You" : `@${profile.username}`)
                  : (log.ambassador_id === userId ? "You" : "Another ambassador");
                const initials = profile?.username
                  ? profile.username.slice(0, 2).toUpperCase()
                  : "?";
                return (
                  <div key={log.id} className="border rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant="secondary"
                        className={cn("text-[10px] uppercase font-bold", statusColors[log.status] ?? "bg-muted text-muted-foreground")}
                      >
                        {log.status}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(log.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                      </span>
                    </div>
                    {log.notes && (
                      <p className="text-sm text-foreground">{log.notes}</p>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Avatar className="h-5 w-5 shrink-0">
                        <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.username ?? ""} />
                        <AvatarFallback className="text-[9px] font-semibold">{initials}</AvatarFallback>
                      </Avatar>
                      <p className="text-[11px] text-muted-foreground">{displayName}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PhotographyTool({ chapterId, onBack }: { chapterId: string; onBack: () => void }) {
  const [view, setView] = useState<"list" | "map">("map");
  const { state: { filters }, methods: { setFilter } } = useMapContext();

  // Keep refs so the effect always calls the latest setFilter / reads the
  // latest filters without listing them as deps. Listing setFilter directly
  // would cause the effect to re-run on every map pan/zoom because setFilter
  // re-creates whenever filters changes (it closes over it), which triggers a
  // redundant setMapURL call and pollutes the map init timing.
  const setFilterRef = useRef(setFilter);
  setFilterRef.current = setFilter;
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const { data: buildings, isLoading, error } = useQuery({
    queryKey: ["embassy-buildings-no-photo", chapterId],
    queryFn: () => fetchAmbassadorBuildingsWithoutPhotos(chapterId),
    enabled: !!chapterId && view === "list",
  });

  // Enable/disable the photography-gap map filter when the view tab changes.
  // Only re-runs on view change — not on every map interaction.
  useEffect(() => {
    if (view === "map") {
      setFilterRef.current("photographyGaps", true);
      if (!filtersRef.current.gapPhotoCounts || filtersRef.current.gapPhotoCounts.length === 0) {
        setFilterRef.current("gapPhotoCounts", [0, 1]);
      }
    } else {
      setFilterRef.current("photographyGaps", false);
    }
  }, [view]);

  const gapFilters = [
    { label: "No photos", value: 0 },
    { label: "Fewer than 3", value: 1 },
    { label: "3+ photos", value: 3 },
  ];

  const toggleGapFilter = (val: number) => {
    const current = filters.gapPhotoCounts || [];
    if (current.includes(val)) {
      setFilter("gapPhotoCounts", current.filter(v => v !== val));
    } else {
      setFilter("gapPhotoCounts", [...current, val]);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] min-h-[500px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Photography</h1>
            <p className="text-sm text-muted-foreground">Find buildings that need images.</p>
          </div>
        </div>

        <div className="flex items-center bg-muted p-1 rounded-lg">
          <Button 
            variant={view === "map" ? "background" : "ghost"} 
            size="sm" 
            onClick={() => setView("map")}
            className={cn("gap-2", view === "map" && "bg-surface-card shadow-sm")}
          >
            <Map className="h-4 w-4" />
            Map
          </Button>
          <Button 
            variant={view === "list" ? "background" : "ghost"} 
            size="sm" 
            onClick={() => setView("list")}
            className={cn("gap-2", view === "list" && "bg-surface-card shadow-sm")}
          >
            <List className="h-4 w-4" />
            List
          </Button>
        </div>
      </div>

      {view === "map" ? (
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar shrink-0">
            {gapFilters.map((f) => (
              <Button
                key={f.value}
                variant={filters.gapPhotoCounts?.includes(f.value) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleGapFilter(f.value)}
                className="whitespace-nowrap rounded-full"
              >
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    f.value === 0 ? "bg-[#EF4444]" : f.value === 1 ? "bg-[#F59E0B]" : "bg-[#10B981]"
                  )} />
                  {f.label}
                </div>
              </Button>
            ))}
          </div>
          <div className="flex-1 border rounded-2xl overflow-hidden shadow-inner bg-surface-muted relative">
            <PlanoMap showGapCallout />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-2">
          {isLoading ? (
            <div className="grid gap-4">
              {[0, 1, 2].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
            </div>
          ) : error ? (
            <div className="p-8 text-center border rounded-xl bg-destructive/5 text-destructive">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Failed to load photography tasks.</p>
            </div>
          ) : buildings?.length === 0 ? (
            <div className="p-12 text-center border border-dashed rounded-xl">
              <Camera className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-lg font-medium">All photographed!</p>
              <p className="text-sm text-muted-foreground">Every building in your chapter has at least one photo.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {buildings?.map((b) => (
                <Card key={b.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-6 group hover:border-brand-primary transition-all">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate">{b.name}</h3>
                    <p className="text-xs text-muted-foreground">{b.city || b.country || "Global"}</p>
                  </div>
                  <Button size="sm" asChild>
                    <Link to={getBuildingUrl(b.id, b.slug, b.short_id)}>
                      View Building
                    </Link>
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type ModerationTab = "buildings" | "photos" | "videos" | "credits";

function CurationTool({ chapterId, onBack }: { chapterId: string; onBack: () => void }) {
  const [tab, setTab] = useState<ModerationTab>("buildings");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const handleApproveAll = (ids: string[]) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleFlag = (id: string, label: string, reason: FlagReason) => {
    setDismissed((prev) => new Set(prev).add(id));
    const reasonLabel = FLAG_REASONS.find((r) => r.value === reason)?.label ?? reason;
    toast("Flagged for admin review", { description: `${label} · ${reasonLabel}` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Moderation</h1>
          <p className="text-sm text-muted-foreground">
            Review new contributions and ensure they meet quality standards.
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ModerationTab)}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="buildings">Buildings</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
          <TabsTrigger value="credits">Credits</TabsTrigger>
        </TabsList>

        <TabsContent value="buildings" className="mt-6">
          <BuildingsModerationTab
            chapterId={chapterId}
            dismissed={dismissed}
            onApproveAll={handleApproveAll}
            onFlag={handleFlag}
          />
        </TabsContent>

        <TabsContent value="photos" className="mt-6">
          <PhotosModerationTab
            dismissed={dismissed}
            onApproveAll={handleApproveAll}
            onFlag={handleFlag}
          />
        </TabsContent>

        <TabsContent value="videos" className="mt-6">
          <VideosModerationTab
            dismissed={dismissed}
            onApproveAll={handleApproveAll}
            onFlag={handleFlag}
          />
        </TabsContent>

        <TabsContent value="credits" className="mt-6">
          <CreditsModerationTab
            chapterId={chapterId}
            dismissed={dismissed}
            onApproveAll={handleApproveAll}
            onFlag={handleFlag}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const FLAG_REASONS = [
  { value: "incorrect_info",    label: "Incorrect information" },
  { value: "low_quality",       label: "Low quality" },
  { value: "spam",              label: "Spam or off-topic" },
  { value: "copyright",         label: "Copyright issue" },
  { value: "inappropriate",     label: "Inappropriate content" },
] as const;

type FlagReason = (typeof FLAG_REASONS)[number]["value"];

function FlagButton({
  id,
  label,
  onFlag,
  overlay = false,
}: {
  id: string;
  label: string;
  onFlag: (id: string, label: string, reason: FlagReason) => void;
  overlay?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const triggerClass = overlay
    ? "p-1.5 rounded-md bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10"
    : "opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Flag for review"
          aria-label="Flag for review"
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          className={triggerClass}
        >
          <Flag className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-52 p-2"
        side="left"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 pb-1.5">
          Reason for flagging
        </p>
        <div className="space-y-0.5">
          {FLAG_REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onFlag(id, label, r.value);
              }}
              className="w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              {r.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ModerationEmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="p-12 text-center border border-dashed rounded-xl">
      <div className="flex justify-center mb-3 text-muted-foreground">{icon}</div>
      <p className="text-lg font-medium">All clear</p>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function BuildingsModerationTab({
  chapterId,
  dismissed,
  onApproveAll,
  onFlag,
}: {
  chapterId: string;
  dismissed: Set<string>;
  onApproveAll: (ids: string[]) => void;
  onFlag: (id: string, label: string, reason: FlagReason) => void;
}) {
  const queryClient = useQueryClient();
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());

  const { data: buildings, isLoading, error } = useQuery({
    queryKey: ["embassy-recent-buildings", chapterId],
    queryFn: () => fetchAmbassadorRecentBuildings(chapterId),
    enabled: !!chapterId,
  });

  const visible = useMemo(
    () => (buildings ?? []).filter((b) => !dismissed.has(b.id)),
    [buildings, dismissed],
  );

  async function handleApprove(ids: string[]) {
    setApprovingIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    const results = await Promise.allSettled(ids.map((id) => approveBuilding(id)));
    const succeeded = ids.filter((_, i) => results[i].status === "fulfilled");
    const failed = ids.length - succeeded.length;
    setApprovingIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    if (succeeded.length > 0) {
      onApproveAll(succeeded);
      queryClient.invalidateQueries({ queryKey: ["embassy-recent-buildings", chapterId] });
      toast.success(
        succeeded.length === 1
          ? "Building approved"
          : `${succeeded.length} buildings approved`,
      );
    }
    if (failed > 0) {
      toast.error(`${failed} approval${failed === 1 ? "" : "s"} failed — please retry`);
    }
  }

  if (isLoading) return <ModerationSkeletons />;
  if (error) return <ModerationError message="Failed to load buildings." />;
  if (visible.length === 0)
    return <ModerationEmptyState icon={<Sparkles className="h-10 w-10" />} message="No new buildings to review." />;

  const allIds = visible.map((b) => b.id);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((b) => {
          const addressLine = [b.address, b.city, b.country].filter(Boolean).join(", ");
          const mapsUrl =
            b.lat && b.lng
              ? `https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lng}`
              : null;
          const thumbUrl = getBuildingImageUrl(b.n ?? b.hero_image_url);
          const isApproving = approvingIds.has(b.id);
          return (
            <Card key={b.id} className="overflow-hidden group hover:border-brand-primary transition-all flex flex-col">
              {thumbUrl ? (
                <div className="h-44 bg-muted overflow-hidden shrink-0">
                  <img src={thumbUrl} alt={b.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="h-44 flex items-center justify-center bg-muted text-muted-foreground shrink-0">
                  <Camera className="h-8 w-8 opacity-30" />
                </div>
              )}
              <div className="flex flex-col flex-1 p-4 gap-3">
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{b.name}</h3>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-muted-foreground shrink-0">
                      New
                    </Badge>
                  </div>
                  {addressLine && (
                    <p className="text-xs text-muted-foreground truncate">{addressLine}</p>
                  )}
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-xs text-muted-foreground">
                      @{b.added_by_username || "anonymous"}
                    </p>
                    {mapsUrl && (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Map className="h-3 w-3" />
                        Map
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-border-default">
                  <FlagButton id={b.id} label={b.name} onFlag={onFlag} />
                  <Button size="sm" variant="outline" asChild className="flex-1">
                    <Link to={getBuildingUrl(b.id, b.slug, b.short_id)}>Review</Link>
                  </Button>
                  <Button
                    size="sm"
                    disabled={isApproving}
                    onClick={() => handleApprove([b.id])}
                    className="gap-1.5 flex-1"
                  >
                    {isApproving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Approve
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {allIds.length > 0 && (
        <div className="flex justify-end pt-2 border-t">
          <Button
            variant="default"
            size="sm"
            disabled={approvingIds.size > 0}
            onClick={() => handleApprove(allIds)}
          >
            {approvingIds.size > 0 ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Approving…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Approve all ({allIds.length})
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function PhotosModerationTab({
  dismissed,
  onApproveAll,
  onFlag,
}: {
  dismissed: Set<string>;
  onApproveAll: (ids: string[]) => void;
  onFlag: (id: string, label: string, reason: FlagReason) => void;
}) {
  const queryClient = useQueryClient();
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());

  const { data: photos, isLoading, error } = useQuery({
    queryKey: ["moderation-photos"],
    queryFn: fetchModerationPhotos,
  });

  const visible = useMemo(
    () => (photos ?? []).filter((p) => !dismissed.has(p.id)),
    [photos, dismissed],
  );

  async function handleApprove(ids: string[]) {
    setApprovingIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    const results = await Promise.allSettled(ids.map((id) => approvePhoto(id)));
    const succeeded = ids.filter((_, i) => results[i].status === "fulfilled");
    const failed = ids.length - succeeded.length;
    setApprovingIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    if (succeeded.length > 0) {
      onApproveAll(succeeded);
      queryClient.invalidateQueries({ queryKey: ["moderation-photos"] });
      toast.success(
        succeeded.length === 1 ? "Photo approved" : `${succeeded.length} photos approved`,
      );
    }
    if (failed > 0) {
      toast.error(`${failed} approval${failed === 1 ? "" : "s"} failed — please retry`);
    }
  }

  if (isLoading) return <ModerationSkeletons />;
  if (error) return <ModerationError message="Failed to load photos." />;
  if (visible.length === 0)
    return <ModerationEmptyState icon={<Camera className="h-10 w-10" />} message="No new photos to review." />;

  const allIds = visible.map((p) => p.id);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {visible.map((p) => {
          const imageUrl = getBuildingImageUrl(p.storage_path);
          const isApproving = approvingIds.has(p.id);
          return (
            <div key={p.id} className="group relative rounded-xl overflow-hidden bg-muted aspect-square border border-border-default hover:border-brand-primary transition-all">
              {imageUrl ? (
                <img src={imageUrl} alt={p.caption ?? p.building_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <Camera className="h-8 w-8 opacity-30" />
                </div>
              )}
              {/* Flag button — top-right corner, appears on hover */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <FlagButton
                  id={p.id}
                  label={`Photo on ${p.building_name}`}
                  onFlag={onFlag}
                  overlay
                />
              </div>
              {/* Approve button — top-left corner, appears on hover */}
              <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  disabled={isApproving}
                  onClick={() => handleApprove([p.id])}
                  className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-feedback-success hover:bg-feedback-success/10 disabled:opacity-50 transition-colors"
                  aria-label="Approve photo"
                  title="Approve photo"
                >
                  {isApproving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                </button>
              </div>
              {/* Bottom info overlay */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 translate-y-0">
                <p className="text-xs font-semibold text-white truncate leading-tight">{p.building_name}</p>
                {p.caption && (
                  <p className="text-[10px] text-white/70 truncate mt-0.5">{p.caption}</p>
                )}
                <Link
                  to={getBuildingUrl(p.building_id, p.building_slug, p.building_short_id)}
                  className="mt-2 text-[10px] text-white/80 hover:text-white underline underline-offset-2 block opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  View Building →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
      {allIds.length > 0 && (
        <div className="flex justify-end pt-2 border-t">
          <Button
            variant="default"
            size="sm"
            disabled={approvingIds.size > 0}
            onClick={() => handleApprove(allIds)}
          >
            {approvingIds.size > 0 ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Approving…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Approve all ({allIds.length})
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function VideosModerationTab({
  dismissed,
  onApproveAll,
  onFlag,
}: {
  dismissed: Set<string>;
  onApproveAll: (ids: string[]) => void;
  onFlag: (id: string, label: string, reason: FlagReason) => void;
}) {
  const queryClient = useQueryClient();
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());

  const { data: videos, isLoading, error } = useQuery({
    queryKey: ["moderation-videos"],
    queryFn: fetchModerationVideos,
  });

  const visible = useMemo(
    () => (videos ?? []).filter((v) => !dismissed.has(v.id)),
    [videos, dismissed],
  );

  async function handleApprove(ids: string[]) {
    setApprovingIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    const results = await Promise.allSettled(ids.map((id) => approveVideo(id)));
    const succeeded = ids.filter((_, i) => results[i].status === "fulfilled");
    const failed = ids.length - succeeded.length;
    setApprovingIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    if (succeeded.length > 0) {
      onApproveAll(succeeded);
      queryClient.invalidateQueries({ queryKey: ["moderation-videos"] });
      toast.success(
        succeeded.length === 1 ? "Video approved" : `${succeeded.length} videos approved`,
      );
    }
    if (failed > 0) {
      toast.error(`${failed} approval${failed === 1 ? "" : "s"} failed — please retry`);
    }
  }

  if (isLoading) return <ModerationSkeletons />;
  if (error) return <ModerationError message="Failed to load videos." />;
  if (visible.length === 0)
    return <ModerationEmptyState icon={<Video className="h-10 w-10" />} message="No new videos to review." />;

  const allIds = visible.map((v) => v.id);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {visible.map((v) => {
          const resolvedUrl = getStorageAssetUrl(v.video_url) ?? v.video_url;
          const isApproving = approvingIds.has(v.id);
          return (
            <Card key={v.id} className="overflow-hidden group hover:border-brand-primary transition-all">
              <div className="flex flex-col sm:flex-row">
                <div className="sm:w-2/3 shrink-0">
                  <VideoPlayer
                    src={resolvedUrl}
                    className="aspect-video w-full"
                  />
                </div>
                <div className="sm:w-1/3 flex flex-col justify-between gap-4 p-4 border-t sm:border-t-0 sm:border-l border-border">
                  <div className="space-y-3 min-w-0">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Building</p>
                      <p className="font-semibold text-sm leading-snug">{v.building_name}</p>
                    </div>
                    {v.uploader_username && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Uploaded by</p>
                        <p className="text-sm">@{v.uploader_username}</p>
                      </div>
                    )}
                    {v.title && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Title</p>
                        <p className="text-sm line-clamp-2">{v.title}</p>
                      </div>
                    )}
                    {v.body && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Caption</p>
                        <p className="text-sm text-muted-foreground line-clamp-4">{v.body}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Submitted</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(v.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FlagButton id={v.id} label={`Video on ${v.building_name}`} onFlag={onFlag} />
                    <Button size="sm" variant="outline" asChild className="flex-1">
                      <Link to={getBuildingUrl(v.building_id, v.building_slug, v.building_short_id)}>
                        View
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      disabled={isApproving}
                      onClick={() => handleApprove([v.id])}
                      className="gap-1.5 flex-1"
                    >
                      {isApproving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Approve
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {allIds.length > 0 && (
        <div className="flex justify-end pt-2 border-t">
          <Button
            variant="default"
            size="sm"
            disabled={approvingIds.size > 0}
            onClick={() => handleApprove(allIds)}
          >
            {approvingIds.size > 0 ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Approving…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Approve all ({allIds.length})
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function CreditsModerationTab({
  chapterId,
  dismissed,
  onApproveAll,
  onFlag,
}: {
  chapterId: string | undefined;
  dismissed: Set<string>;
  onApproveAll: (ids: string[]) => void;
  onFlag: (id: string, label: string, reason: FlagReason) => void;
}) {
  const queryClient = useQueryClient();
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());

  const { data: credits, isLoading, error } = useQuery({
    queryKey: ["moderation-credits", chapterId],
    queryFn: () => fetchModerationCredits(chapterId!),
    enabled: !!chapterId,
  });

  const visible = useMemo(
    () => (credits ?? []).filter((c) => !dismissed.has(c.id)),
    [credits, dismissed],
  );

  async function handleApprove(ids: string[]) {
    setApprovingIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    const results = await Promise.allSettled(ids.map((id) => approveCredit(id)));
    const succeeded = ids.filter((_, i) => results[i].status === "fulfilled");
    const failed = ids.length - succeeded.length;
    setApprovingIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    if (succeeded.length > 0) {
      onApproveAll(succeeded);
      queryClient.invalidateQueries({ queryKey: ["moderation-credits", chapterId] });
      toast.success(
        succeeded.length === 1 ? "Credit approved" : `${succeeded.length} credits approved`,
      );
    }
    if (failed > 0) {
      toast.error(`${failed} approval${failed === 1 ? "" : "s"} failed — please retry`);
    }
  }

  if (isLoading) return <ModerationSkeletons />;
  if (error) return <ModerationError message="Failed to load credits." />;
  if (visible.length === 0)
    return <ModerationEmptyState icon={<Award className="h-10 w-10" />} message="No new credits to review." />;

  const allIds = visible.map((c) => c.id);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((c) => {
          const isApproving = approvingIds.has(c.id);
          return (
            <Card key={c.id} className="p-4 group hover:border-brand-primary transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate text-sm">
                      {c.entity_name ?? <span className="italic text-muted-foreground">Unknown</span>}
                    </h3>
                    <Badge className="text-[10px] uppercase font-bold shrink-0 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 border-none">
                      {c.role.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    on{" "}
                    <Link
                      to={getBuildingUrl(c.building_id, c.building_slug, c.building_short_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground hover:underline transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {c.building_name}
                    </Link>
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <FlagButton id={c.id} label={`Credit on ${c.building_name}`} onFlag={onFlag} />
                  <Button
                    size="sm"
                    disabled={isApproving}
                    onClick={() => handleApprove([c.id])}
                    className="gap-1.5 h-7 px-2 text-xs"
                  >
                    {isApproving ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3" />
                    )}
                    Approve
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {allIds.length > 0 && (
        <div className="flex justify-end pt-2 border-t">
          <Button
            variant="default"
            size="sm"
            disabled={approvingIds.size > 0}
            onClick={() => handleApprove(allIds)}
          >
            {approvingIds.size > 0 ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Approving…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Approve all ({allIds.length})
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function ModerationSkeletons() {
  return (
    <div className="grid gap-4">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-28 w-full rounded-xl" />
      ))}
    </div>
  );
}

function ModerationError({ message }: { message: string }) {
  return (
    <div className="p-8 text-center border rounded-xl bg-destructive/5 text-destructive">
      <AlertCircle className="h-8 w-8 mx-auto mb-2" />
      <p>{message}</p>
    </div>
  );
}
