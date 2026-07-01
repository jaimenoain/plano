import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, Link, useNavigate } from "react-router";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import {
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
  fetchPendingEventDiscoveries,
  publishEventDiscovery,
  discardEventDiscovery,
  updateEventDiscovery,
  fetchBuildingResearchQueue,
  dismissResearchQueueItem,
  fetchGlobalModerationPhotos,
  fetchGlobalModerationVideos,
  fetchGlobalModerationCredits,
  fetchGlobalModerationBuildings,
  approveBuildingGlobal,
  approveCreditGlobal,
  EMBASSY_PHOTO_MODERATION_BATCH_SIZE,
  EMBASSY_CREDITS_MODERATION_BATCH_SIZE,
  EMBASSY_SEARCH_FEED_LIMIT,
  type AmbassadorUnclaimedFirm,
  type EventDiscovery,
  type BuildingResearchQueueItem,
} from "@/features/embassy/api/taskFeed";
import type { ResearchDataPoint } from "@/features/embassy/api/building-research.route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Search, ArrowLeft, Filter, CheckCircle2,
  AlertCircle, MessageSquare, Loader2,
  Camera, Sparkles, UserPlus, ExternalLink, Map, List,
  Flag, Video, Award, XCircle, CheckCircle,
  RefreshCw, SlidersHorizontal, ChevronRight, CalendarClock,
  Clock, SkipForward,
} from "lucide-react";
import { format, formatDistanceToNow, parseISO, differenceInDays } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { getBuildingImageUrl, getStorageAssetUrl } from "@/utils/image";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { getBuildingUrl } from "@/utils/url";
import { resizeImage } from "@/lib/image-compression";
import { uploadFile } from "@/utils/upload";
import { cn } from "@/lib/utils";
import {
  EmbassyPageHeader,
  EMBASSY_SKELETON_ROUNDED,
} from "@/features/embassy/components/embassy-ui";
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

type ToolType = "research" | "photography" | "outreach" | "curation" | "community" | "events" | null;

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
  {
    key: "events",
    title: "Events",
    description: "Review architecture events found by AI in your locality. Edit details, publish, or discard.",
    icon: <CalendarClock className="h-6 w-6" />,
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

  // Separate key from EmbassyLayout so preferred_tools is always fetched by this queryFn
  const { data: membership, isLoading: membershipLoading } = useQuery({
    queryKey: ["ambassador-membership-contribute", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ambassador_memberships")
        .select("role, status, onboarded_at, chapter_id, preferred_tools")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .order("joined_at", { ascending: false })
        .maybeSingle();
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
            <Skeleton key={i} className={cn("h-28 w-full", EMBASSY_SKELETON_ROUNDED)} />
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

  if (activeTool === "events" && chapterId) {
    return (
      <EventsTool
        chapterId={chapterId}
        role={membership?.role ?? null}
        onBack={() => setActiveTool(null)}
      />
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <EmbassyPageHeader
        title="Contribute"
        description="Select a tool to help build the catalogue in your chapter."
      />

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
        "relative flex flex-col border-border-default p-6 transition-colors",
        active ? "cursor-pointer hover:border-border-strong" : "border-dashed opacity-60",
      )}
      onClick={!asChild && active ? onClick : undefined}
    >
      <div className="mb-4 flex items-start justify-between">
        <div
          className={cn(
            "rounded-sm p-2",
            active ? "bg-surface-muted text-text-primary" : "bg-surface-muted text-text-secondary",
          )}
        >
          {icon}
        </div>
        {comingSoon && (
          <Badge variant="outline" className="text-[10px] uppercase tracking-[0.15em]">
            Coming soon
          </Badge>
        )}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-text-primary">{title}</h3>
      <p className="mb-6 flex-1 text-sm text-text-secondary">{description}</p>
      {asChild ? (
        <Button asChild variant="outline" size="sm" className="mt-auto w-full min-h-11">
          {children}
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="mt-auto w-full min-h-11"
          disabled={!active}
        >
          {active ? "Open tool →" : "Locked"}
        </Button>
      )}
    </Card>
  );
}

type ResearchTab = "data-completion" | "duplicates";

function DataResearchTool({ chapterId, onBack }: { chapterId: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<ResearchTab>("data-completion");
  const [activeItem, setActiveItem] = useState<BuildingResearchQueueItem | null>(null);
  const [queueStalled, setQueueStalled] = useState(false);
  const [isRefilling, setIsRefilling] = useState(false);

  const { data: queue = [], isLoading, error, refetch } = useQuery({
    queryKey: ["embassy-research-queue", chapterId],
    queryFn: () => fetchBuildingResearchQueue(chapterId),
    enabled: !!chapterId,
    staleTime: 60 * 1000,
    // Fail fast so the error banner shows immediately instead of oscillating
    // between skeletons and the empty state during TanStack Query's retry backoffs.
    retry: 0,
    // Poll every 30 s while the queue is empty so the view updates as soon as
    // the background fill route finishes inserting items.
    refetchInterval: (query) => {
      const d = query.state.data;
      return Array.isArray(d) && d.length === 0 && !query.state.error ? 30_000 : false;
    },
  });

  // After 90 s of an empty, non-erroring queue assume the fill either timed out
  // or found no candidates — switch to the "stalled" message and offer a retry.
  useEffect(() => {
    if (!isLoading && !error && queue.length === 0) {
      const t = setTimeout(() => setQueueStalled(true), 90_000);
      return () => clearTimeout(t);
    }
    setQueueStalled(false);
    return undefined;
  }, [isLoading, error, queue.length]);

  async function handleRetryFill() {
    setIsRefilling(true);
    setQueueStalled(false);
    try {
      await fetch("/api/embassy/research-queue", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "fill", chapter_id: chapterId }),
      });
    } catch {
      // fire-and-forget; ignore network errors
    }
    setIsRefilling(false);
    void refetch();
  }

  const dismissMutation = useMutation({
    mutationFn: dismissResearchQueueItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["embassy-research-queue", chapterId] });
    },
  });

  function handleDismiss(item: BuildingResearchQueueItem) {
    dismissMutation.mutate(item.id);
    setActiveItem(null);
  }

  async function handleSave(item: BuildingResearchQueueItem, updates: Record<string, unknown>) {
    const res = await fetch("/api/embassy/building-research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "apply",
        building_id: item.building_id,
        updates,
        queue_id: item.id,
      }),
    });
    if (!res.ok) {
      const err = (await res.json()) as { error?: string };
      throw new Error(err.error ?? "Save failed");
    }
    queryClient.invalidateQueries({ queryKey: ["embassy-research-queue", chapterId] });
    setActiveItem(null);
    toast.success("Research data saved successfully.");
  }

  if (activeItem) {
    return (
      <ResearchReviewPanel
        buildingId={activeItem.building_id}
        buildingName={activeItem.building_name}
        dataPoints={activeItem.data_points}
        currentValues={activeItem.current_values}
        onBack={() => setActiveItem(null)}
        onSave={(updates) => handleSave(activeItem, updates)}
        onDismiss={() => handleDismiss(activeItem)}
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
          <p className="text-sm text-muted-foreground">Review AI-researched buildings and complete missing records.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ResearchTab)}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="data-completion">AI Research Queue</TabsTrigger>
          <TabsTrigger value="duplicates">Duplicate Detection</TabsTrigger>
        </TabsList>

        <TabsContent value="data-completion" className="mt-6 space-y-4">
          {isLoading ? (
            <div className="grid gap-4">
              {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-sm" />)}
            </div>
          ) : error ? (
            <div className="p-8 text-center border rounded-sm bg-feedback-destructive/5 text-feedback-destructive">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Failed to load research queue.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>
                Try again
              </Button>
            </div>
          ) : queue.length === 0 ? (
            <div className="p-12 text-center border border-dashed rounded-sm">
              {queueStalled ? (
                <>
                  <Sparkles className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-lg font-medium">No buildings ready for AI research</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    All buildings in your chapter are either up to date or have already been researched. Check back after your chapter's buildings are updated.
                  </p>
                </>
              ) : (
                <>
                  <Clock className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-lg font-medium">Building your research queue…</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    AI is researching buildings in your chapter. This may take a minute — the view will refresh automatically.
                  </p>
                </>
              )}
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => void refetch()}>
                  <RefreshCw className="h-4 w-4" />
                  Refresh now
                </Button>
                {queueStalled && (
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => void handleRetryFill()} disabled={isRefilling}>
                    {isRefilling ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Check for new buildings
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {queue.length} building{queue.length !== 1 ? "s" : ""} researched and ready to review. AI has found new data — confirm or reject each suggestion.
              </p>
              <div className="grid gap-3">
                {queue.map((item) => {
                  const newCount = item.data_points.filter((dp) => {
                    const cur = item.current_values[dp.field];
                    return cur === null || cur === undefined;
                  }).length;
                  const conflictCount = item.data_points.filter((dp) => {
                    const cur = item.current_values[dp.field];
                    if (cur === null || cur === undefined) return false;
                    const aiStr = Array.isArray(dp.value) ? dp.value.join(", ") : String(dp.value);
                    return String(cur).toLowerCase().trim() !== aiStr.toLowerCase().trim();
                  }).length;
                  return (
                    <Card
                      key={item.id}
                      className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:border-border-strong transition-all group"
                      onClick={() => setActiveItem(item)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{item.building_name}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {newCount > 0 && (
                            <Badge variant="secondary" className="text-[10px] font-bold uppercase bg-brand-primary/10 text-brand-primary border-none">
                              {newCount} new field{newCount !== 1 ? "s" : ""}
                            </Badge>
                          )}
                          {conflictCount > 0 && (
                            <Badge variant="secondary" className="text-[10px] font-bold uppercase bg-feedback-warning/10 text-feedback-warning border-none">
                              {conflictCount} updated value{conflictCount !== 1 ? "s" : ""}
                            </Badge>
                          )}
                          {newCount === 0 && conflictCount === 0 && (
                            <Badge variant="secondary" className="text-[10px] font-bold uppercase bg-feedback-success/10 text-feedback-success border-none">
                              {item.data_points.length} confirmed
                            </Badge>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-brand-primary transition-colors" />
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="duplicates" className="mt-6">
          <DuplicateDetectionPanel chapterId={chapterId} />
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

async function fetchPotentialDuplicateBuildings(chapterId: string): Promise<PotentialDuplicate[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.rpc("get_potential_duplicate_buildings" as any, {
    p_chapter_id: chapterId,
    p_limit: 20,
  });
  if (error) throw error;
  return (data as PotentialDuplicate[]) ?? [];
}

async function dismissDuplicatePair(id1: string, id2: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.rpc("dismiss_building_duplicate_pair" as any, {
    p_id1: id1,
    p_id2: id2,
  });
  if (error) throw error;
}

function DuplicateDetectionPanel({ chapterId }: { chapterId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: pairs = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["building-duplicate-suggestions", chapterId],
    queryFn: () => fetchPotentialDuplicateBuildings(chapterId),
    enabled: !!chapterId,
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });

  const dismissMutation = useMutation({
    mutationFn: ({ id1, id2 }: { id1: string; id2: string }) => dismissDuplicatePair(id1, id2),
    onMutate: async ({ id1, id2 }) => {
      await queryClient.cancelQueries({ queryKey: ["building-duplicate-suggestions", chapterId] });
      const previous = queryClient.getQueryData<PotentialDuplicate[]>(["building-duplicate-suggestions", chapterId]);
      queryClient.setQueryData<PotentialDuplicate[]>(
        ["building-duplicate-suggestions", chapterId],
        (old) => (old ?? []).filter((p) => !(p.id1 === id1 && p.id2 === id2)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["building-duplicate-suggestions", chapterId], context.previous);
      }
      toast.error("Could not save dismissal — please try again.");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-2xl font-black flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20">
              <Search className="w-4 h-4 text-brand-primary" />
            </div>
            Potential Duplicates
            {!isLoading && !isError && (
              <Badge variant="outline" className="ml-1 font-mono">{pairs.length} found</Badge>
            )}
          </h3>
          <p className="text-sm text-text-secondary">
            Buildings in your chapter with very similar names — review each pair and merge or dismiss.
          </p>
        </div>
        {!isLoading && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            className="rounded-full h-9 shrink-0"
          >
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Refresh
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16 space-y-4"
          >
            <Loader2 className="w-10 h-10 animate-spin text-brand-primary" />
            <p className="text-sm font-medium text-text-secondary animate-pulse">Scanning buildings for similar names…</p>
          </motion.div>
        )}

        {!isLoading && isError && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-8 text-center border rounded-sm bg-feedback-destructive/5 text-feedback-destructive"
          >
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load duplicate suggestions.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>
              Try again
            </Button>
          </motion.div>
        )}

        {!isLoading && !isError && pairs.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-14 text-text-secondary space-y-3"
          >
            <div className="w-14 h-14 rounded-md bg-surface-muted flex items-center justify-center opacity-40">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="font-medium opacity-50 text-sm">No potential duplicates found in your chapter.</p>
          </motion.div>
        )}

        {!isLoading && !isError && pairs.length > 0 && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pairs.map((pair, idx) => (
                <motion.div
                  key={`${pair.id1}-${pair.id2}`}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex flex-col p-4 bg-surface-card border border-border-default rounded hover:border-border-strong transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col max-w-[40%]">
                      <span className="text-sm font-bold truncate text-text-primary">{pair.name1}</span>
                      <span className="text-[10px] font-mono text-text-secondary">{pair.id1.slice(0, 8)}</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="text-[10px] font-black text-brand-primary uppercase tracking-tighter mb-0.5">Match</div>
                      <div className="px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-xs font-black border border-brand-primary/20">
                        {Math.round(pair.score * 100)}%
                      </div>
                    </div>

                    <div className="flex flex-col max-w-[40%] text-right">
                      <span className="text-sm font-bold truncate text-text-primary">{pair.name2}</span>
                      <span className="text-[10px] font-mono text-text-secondary">{pair.id2.slice(0, 8)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1 h-9 bg-surface-muted hover:bg-brand-primary hover:text-white text-text-primary text-xs font-bold transition-all border-none"
                      onClick={() => navigate(`/admin/merge/building/${pair.id1}/${pair.id2}`)}
                    >
                      Analyze & Merge
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 px-3 text-xs text-text-secondary hover:text-feedback-destructive shrink-0"
                      disabled={dismissMutation.isPending}
                      onClick={() => dismissMutation.mutate({ id1: pair.id1, id2: pair.id2 })}
                      title="Not a duplicate — hide this suggestion"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Not a duplicate
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
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

// Array fields use a "has_X" count key in current_values to detect existing data.
const ARRAY_COUNT_KEYS: Record<string, string> = {
  typologies: "typologies_count",
  style:      "style_count",
  materiality: "materiality_count",
  context:    "context_count",
};

type FieldStatus = "new" | "conflict" | "confirmed";

function getFieldStatus(
  field: string,
  aiValue: string | number | string[],
  currentValues: Record<string, unknown>,
): FieldStatus {
  if (ARRAY_FIELDS.has(field)) {
    const countKey = ARRAY_COUNT_KEYS[field];
    const count = Number(currentValues[countKey] ?? 0);
    return count === 0 ? "new" : "conflict";
  }
  const cur = currentValues[field];
  if (cur === null || cur === undefined || cur === "") return "new";
  const curStr = String(cur).toLowerCase().trim();
  const aiStr = (Array.isArray(aiValue) ? aiValue.join(", ") : String(aiValue)).toLowerCase().trim();
  return curStr === aiStr ? "confirmed" : "conflict";
}

type ReviewItem = ResearchDataPoint & {
  accepted: boolean;
  editedValue: string;
  fieldStatus: FieldStatus;
  currentDisplayValue: string;
};

function ResearchReviewPanel({
  buildingId,
  buildingName,
  dataPoints,
  currentValues,
  onBack,
  onSave,
  onDismiss,
}: {
  buildingId: string;
  buildingName: string;
  dataPoints: ResearchDataPoint[];
  currentValues: Record<string, unknown>;
  onBack: () => void;
  onSave: (updates: Record<string, unknown>) => Promise<void>;
  onDismiss?: () => void;
}) {
  const [isSaving, setIsSaving] = useState(false);

  const [items, setItems] = useState<ReviewItem[]>(() =>
    dataPoints.map((dp) => {
      const status = getFieldStatus(dp.field, dp.value, currentValues);
      const cur = currentValues[dp.field];
      const curDisplay = ARRAY_FIELDS.has(dp.field)
        ? `${Number(currentValues[ARRAY_COUNT_KEYS[dp.field]] ?? 0)} existing value(s)`
        : cur !== null && cur !== undefined && cur !== ""
          ? String(cur)
          : "";
      return {
        ...dp,
        // "new" → accept by default; "conflict" → user must explicitly accept; "confirmed" → no change needed
        accepted: status === "new",
        editedValue: Array.isArray(dp.value) ? dp.value.join(", ") : String(dp.value),
        fieldStatus: status,
        currentDisplayValue: curDisplay,
      };
    }),
  );

  // Split into display groups
  const newItems      = items.filter((i) => i.fieldStatus === "new");
  const conflictItems = items.filter((i) => i.fieldStatus === "conflict");
  const confirmedItems = items.filter((i) => i.fieldStatus === "confirmed");
  const actionableItems = [...newItems, ...conflictItems];
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

  async function handleSave() {
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
    setIsSaving(true);
    try {
      await onSave(updates);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  function renderItem(item: ReviewItem) {
    const isConflict = item.fieldStatus === "conflict";
    return (
      <Card
        key={item.field}
        className={cn(
          "p-5 transition-all border-2",
          item.accepted
            ? isConflict
              ? "border-feedback-warning/50 bg-feedback-warning/[0.03]"
              : "border-brand-primary/40 bg-brand-primary/[0.03]"
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
                  ? isConflict ? "bg-feedback-warning text-text-primary cursor-default" : "bg-text-primary text-surface-default cursor-default"
                  : "border border-border-default text-muted-foreground hover:border-border-strong hover:text-brand-primary",
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
            {/* Left: label + current value + editable AI value */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">
                  {FIELD_LABELS[item.field] ?? item.field}
                </p>
                {isConflict && (
                  <Badge variant="outline" className="text-[10px] font-bold uppercase border-feedback-warning/50 text-feedback-warning">
                    Updated value
                  </Badge>
                )}
              </div>

              {/* Current value (shown only for conflict fields) */}
              {isConflict && item.currentDisplayValue && (
                <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-medium">Current:</span> {item.currentDisplayValue}
                </div>
              )}

              {/* AI suggested value (editable) */}
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
                <p className="text-[11px] text-muted-foreground">
                  {isConflict
                    ? "AI suggests additions to existing values. Comma-separated — edit as needed."
                    : "Comma-separated — edit or remove values as needed."}
                </p>
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
    );
  }

  // Suppress TypeScript unused variable warning — buildingId is passed to the route via onSave closure
  void buildingId;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} disabled={isSaving}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">
            Review: {buildingName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Accept or reject each data point. You can edit values inline before saving.
          </p>
        </div>
      </div>

      {/* New data (empty → AI filled) */}
      {newItems.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">
            New data found
          </h2>
          <div className="grid gap-4">{newItems.map(renderItem)}</div>
        </section>
      )}

      {/* Conflicting data (existing ≠ AI suggestion) */}
      {conflictItems.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xs font-medium uppercase tracking-[0.15em] text-feedback-warning flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            AI suggests different values
          </h2>
          <p className="text-xs text-muted-foreground -mt-1">
            These fields already have a value. Review the AI suggestion and accept only if it is more accurate.
          </p>
          <div className="grid gap-4">{conflictItems.map(renderItem)}</div>
        </section>
      )}

      {actionableItems.length === 0 && confirmedItems.length === 0 && (
        <div className="p-12 text-center border border-dashed rounded-sm">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-lg font-medium">No changes to review.</p>
        </div>
      )}

      {/* Confirmed data (AI matches existing) — collapsed at bottom */}
      {confirmedItems.length > 0 && (
        <section className="mt-6 pt-6 border-t border-border-default space-y-3 opacity-60">
          <h2 className="text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5 text-feedback-success" />
            AI confirms existing values ({confirmedItems.length})
          </h2>
          <p className="text-xs text-muted-foreground -mt-1">
            These values are already correct — no action needed.
          </p>
          <div className="grid gap-2">
            {confirmedItems.map((item) => (
              <div key={item.field} className="flex items-center gap-3 px-3 py-2 rounded-md bg-muted/40 text-sm">
                <CheckCircle className="h-3.5 w-3.5 shrink-0 text-feedback-success" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground w-32 shrink-0">
                  {FIELD_LABELS[item.field] ?? item.field}
                </span>
                <span className="text-muted-foreground truncate">{item.editedValue}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sticky save / skip bar */}
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-background/95 backdrop-blur border-t border-border-default px-4 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              disabled={isSaving}
              className="gap-1.5 text-muted-foreground"
            >
              <SkipForward className="h-3.5 w-3.5" />
              Skip building
            </Button>
          )}
          <p className="text-sm text-muted-foreground hidden sm:block">
            {acceptedCount} of {actionableItems.length} suggestion{actionableItems.length !== 1 ? "s" : ""} accepted
          </p>
        </div>
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
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-28 w-full rounded-sm" />)}
        </div>
      ) : error ? (
        <div className="p-8 text-center border rounded-sm bg-feedback-destructive/5 text-feedback-destructive">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p>Failed to load firms. Please try again.</p>
        </div>
      ) : filteredFirms.length === 0 ? (
        <div className="p-12 text-center border border-dashed rounded-sm">
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
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:border-border-strong transition-all"
                onClick={() => setDrawerFirm(f)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{f.name}</h3>
                    {latestStatus && (
                      <Badge variant="secondary" className={cn(
                        "text-[10px] uppercase font-bold",
                        latestStatus === "claimed" ? "bg-feedback-success/10 text-feedback-success" :
                        latestStatus === "declined" ? "bg-feedback-destructive/10 text-feedback-destructive" :
                        latestStatus === "replied" ? "bg-surface-muted text-text-primary" :
                        "bg-surface-muted text-text-secondary"
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
    claimed: "bg-feedback-success/10 text-feedback-success",
    declined: "bg-feedback-destructive/10 text-feedback-destructive",
    replied: "bg-surface-muted text-text-primary",
    contacted: "bg-surface-muted text-text-secondary",
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

const PHOTOGRAPHY_POPULARITY_STEPS = [
  { label: "All", percent: 100 },
  { label: "Top 50%", percent: 50 },
  { label: "Top 20%", percent: 20 },
  { label: "Top 10%", percent: 10 },
] as const;

function PhotographyTool({ chapterId, onBack }: { chapterId: string; onBack: () => void }) {
  const [view, setView] = useState<"list" | "map">("map");
  const { state: { filters }, methods: { setFilter, moveMap } } = useMapContext();
  const [searchParams] = useSearchParams();
  // Capture at mount whether the URL already carried explicit lat/lng (e.g. a
  // shared deep-link). If it did, preserve the position. If it didn't (user
  // opened the tool from the tools list), always center on the chapter city —
  // regardless of what PlanoMap.onLoad restores from localStorage afterwards.
  const initialHasExplicitPosition = useRef(
    searchParams.get('lat') !== null && searchParams.get('lng') !== null
  );

  // Keep refs so the effect always calls the latest setFilter / reads the
  // latest filters without listing them as deps. Listing setFilter directly
  // would cause the effect to re-run on every map pan/zoom because setFilter
  // re-creates whenever filters changes (it closes over it), which triggers a
  // redundant setMapURL call and pollutes the map init timing.
  const setFilterRef = useRef(setFilter);
  setFilterRef.current = setFilter;
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const moveMapRef = useRef(moveMap);
  moveMapRef.current = moveMap;

  // Fetch the chapter's locality center so we can auto-position the map.
  const { data: chapterCenter } = useQuery({
    queryKey: ["chapter-locality-center", chapterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ambassador_chapters")
        .select("localities(lat, lng)")
        .eq("id", chapterId)
        .single();
      if (error) throw error;
      const locality = data?.localities as { lat: number | null; lng: number | null } | null;
      if (!locality?.lat || !locality?.lng) return null;
      return { lat: locality.lat, lng: locality.lng };
    },
    enabled: !!chapterId,
    staleTime: Infinity,
  });

  // Resolve the user's geolocation once on mount (silently — no toast).
  // Stored as 'pending' until the browser responds, then null or a coordinate.
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null | "pending">("pending");
  useEffect(() => {
    if (initialHasExplicitPosition.current) { setUserLocation(null); return; }
    if (!navigator.geolocation) { setUserLocation(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserLocation(null),
    );
  }, []);

  // One-shot: center the map on the user's location (preferred) or the chapter
  // locality (fallback), unless the URL already carried an explicit position.
  // We wait for geolocation to settle before falling back so we don't jump twice.
  const hasCenteredRef = useRef(false);
  useEffect(() => {
    if (hasCenteredRef.current) return;
    if (initialHasExplicitPosition.current) return;
    if (view !== "map") return;
    if (userLocation === "pending") return;
    const target = userLocation ?? chapterCenter;
    if (!target) return;
    moveMapRef.current(target.lat, target.lng, 13);
    hasCenteredRef.current = true;
  }, [view, userLocation, chapterCenter]);

  const [popularityStep, setPopularityStep] = useState(0);

  const { data: buildings, isLoading, error } = useQuery({
    queryKey: ["embassy-buildings-no-photo", chapterId],
    queryFn: () => fetchAmbassadorBuildingsWithoutPhotos(chapterId, EMBASSY_SEARCH_FEED_LIMIT),
    enabled: !!chapterId && view === "list",
  });

  const sortedBuildings = useMemo(
    () => [...(buildings ?? [])].sort((a, b) => b.popularity_score - a.popularity_score),
    [buildings],
  );

  const filteredBuildings = useMemo(() => {
    const pct = PHOTOGRAPHY_POPULARITY_STEPS[popularityStep].percent;
    if (pct === 100 || sortedBuildings.length === 0) return sortedBuildings;
    return sortedBuildings.slice(0, Math.max(1, Math.ceil(sortedBuildings.length * pct / 100)));
  }, [sortedBuildings, popularityStep]);

  // Enable/disable the photography-gap map filter when the view tab changes.
  // Only re-runs on view change — not on every map interaction.
  const PHOTO_GAP_FILTER_KEY = "plano:photography:gapPhotoCounts";

  const readStoredGapCounts = (): number[] => {
    try {
      const raw = localStorage.getItem(PHOTO_GAP_FILTER_KEY);
      if (raw) return JSON.parse(raw) as number[];
    } catch {}
    return [0, 1];
  };

  useEffect(() => {
    if (view === "map") {
      setFilterRef.current("photographyGaps", true);
      if (!filtersRef.current.gapPhotoCounts || filtersRef.current.gapPhotoCounts.length === 0) {
        setFilterRef.current("gapPhotoCounts", readStoredGapCounts());
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
    const next = current.includes(val)
      ? current.filter(v => v !== val)
      : [...current, val];
    setFilter("gapPhotoCounts", next);
    try { localStorage.setItem(PHOTO_GAP_FILTER_KEY, JSON.stringify(next)); } catch {}
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
            <p className="text-sm text-muted-foreground">Find buildings that need images. Feel free to mark as hidden any building that is not interesting enough.</p>
          </div>
        </div>

        <div className="flex items-center bg-muted p-1 rounded-lg">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView("map")}
            className={cn("gap-2", view === "map" && "bg-surface-card shadow-sm")}
          >
            <Map className="h-4 w-4" />
            Map
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView("list")}
            className={cn("gap-2", view === "list" && "bg-surface-card shadow-sm")}
          >
            <List className="h-4 w-4" />
            List
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-4 shrink-0 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5 shrink-0">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Popularity
          </span>
          <div className="w-full sm:w-44 flex flex-col gap-1.5">
            <Slider
              min={0}
              max={3}
              step={1}
              value={[popularityStep]}
              onValueChange={([v]) => setPopularityStep(v)}
            />
            <div className="flex justify-between">
              {PHOTOGRAPHY_POPULARITY_STEPS.map((s, i) => (
                <span key={i} className="text-xs text-muted-foreground">{s.label}</span>
              ))}
            </div>
          </div>
          {view === "list" && (
            <Badge variant="secondary" className="shrink-0 tabular-nums">
              {filteredBuildings.length}
            </Badge>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
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
      </div>

      {view === "map" ? (
        <div className="flex-1 min-h-0 border rounded-2xl overflow-hidden shadow-inner bg-surface-muted relative">
          <PlanoMap showGapCallout />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-2">
          {isLoading ? (
            <div className="grid gap-4">
              {[0, 1, 2].map(i => <Skeleton key={i} className="h-28 w-full rounded-sm" />)}
            </div>
          ) : error ? (
            <div className="p-8 text-center border rounded-sm bg-feedback-destructive/5 text-feedback-destructive">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Failed to load photography tasks.</p>
            </div>
          ) : buildings?.length === 0 ? (
            <div className="p-12 text-center border border-dashed rounded-sm">
              <Camera className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-lg font-medium">All photographed!</p>
              <p className="text-sm text-muted-foreground">Every building in your chapter has at least one photo.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredBuildings.map((b) => (
                <Card key={b.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-6 group hover:border-border-strong transition-all">
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleApproveRevert = (ids: string[]) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
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
            You don&apos;t need to verify copyright or accuracy — users flag those issues. Just check that submissions don&apos;t contain anything inappropriate, which you can do at a glance.
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ModerationTab)}>
        <TabsList className="mb-2 h-auto w-full gap-4 border-b border-border-default bg-transparent p-0 sm:w-auto">
          <TabsTrigger
            value="buildings"
            className="rounded-none border-b-2 border-transparent px-0 pb-3 data-[state=active]:border-text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Buildings
          </TabsTrigger>
          <TabsTrigger
            value="photos"
            className="rounded-none border-b-2 border-transparent px-0 pb-3 data-[state=active]:border-text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Photos
          </TabsTrigger>
          <TabsTrigger
            value="videos"
            className="rounded-none border-b-2 border-transparent px-0 pb-3 data-[state=active]:border-text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Videos
          </TabsTrigger>
          <TabsTrigger
            value="credits"
            className="rounded-none border-b-2 border-transparent px-0 pb-3 data-[state=active]:border-text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Credits
          </TabsTrigger>
        </TabsList>

        <TabsContent value="buildings" className="mt-6">
          <BuildingsModerationTab
            chapterId={chapterId}
            dismissed={dismissed}
            onApproveAll={handleApproveAll}
            onApproveRevert={handleApproveRevert}
            onFlag={handleFlag}
          />
        </TabsContent>

        <TabsContent value="photos" className="mt-6">
          <PhotosModerationTab
            chapterId={chapterId}
            dismissed={dismissed}
            onApproveAll={handleApproveAll}
            onApproveRevert={handleApproveRevert}
            onFlag={handleFlag}
          />
        </TabsContent>

        <TabsContent value="videos" className="mt-6">
          <VideosModerationTab
            chapterId={chapterId}
            dismissed={dismissed}
            onApproveAll={handleApproveAll}
            onApproveRevert={handleApproveRevert}
            onFlag={handleFlag}
          />
        </TabsContent>

        <TabsContent value="credits" className="mt-6">
          <CreditsModerationTab
            chapterId={chapterId}
            dismissed={dismissed}
            onApproveAll={handleApproveAll}
            onApproveRevert={handleApproveRevert}
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

function ModerationEmptyState({
  icon,
  message,
  onShowGlobal,
}: {
  icon: React.ReactNode;
  message: string;
  onShowGlobal?: () => void;
}) {
  return (
    <div className="p-12 text-center border border-dashed rounded-sm">
      <div className="flex justify-center mb-3 text-muted-foreground">{icon}</div>
      <p className="text-lg font-medium">All clear</p>
      <p className="text-sm text-muted-foreground">{message}</p>
      {onShowGlobal && (
        <button
          type="button"
          onClick={onShowGlobal}
          className="mt-4 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
        >
          Browse content from uncharted locations
        </button>
      )}
    </div>
  );
}

function BuildingsModerationTab({
  chapterId,
  dismissed,
  onApproveAll,
  onApproveRevert,
  onFlag,
}: {
  chapterId: string;
  dismissed: Set<string>;
  onApproveAll: (ids: string[]) => void;
  onApproveRevert: (ids: string[]) => void;
  onFlag: (id: string, label: string, reason: FlagReason) => void;
}) {
  const queryClient = useQueryClient();
  const [showGlobal, setShowGlobal] = useState(false);

  const { data: buildings, isLoading, error } = useQuery({
    queryKey: showGlobal
      ? ["global-moderation-buildings", chapterId]
      : ["embassy-recent-buildings", chapterId],
    queryFn: () =>
      showGlobal
        ? fetchGlobalModerationBuildings(chapterId)
        : fetchAmbassadorRecentBuildings(chapterId),
    enabled: !!chapterId,
  });

  const visible = useMemo(
    () => (buildings ?? []).filter((b) => !dismissed.has(b.id)),
    [buildings, dismissed],
  );

  async function handleApprove(ids: string[]) {
    onApproveAll(ids);
    const approveFn = showGlobal ? approveBuildingGlobal : approveBuilding;
    const results = await Promise.allSettled(ids.map((id) => approveFn(id)));
    const failedIds = ids.filter((_, i) => results[i].status === "rejected");
    if (failedIds.length > 0) {
      onApproveRevert(failedIds);
      toast.error(
        `${failedIds.length} approval${failedIds.length === 1 ? "" : "s"} failed — please retry`,
      );
    } else {
      queryClient.invalidateQueries({
        queryKey: showGlobal
          ? ["global-moderation-buildings", chapterId]
          : ["embassy-recent-buildings", chapterId],
      });
    }
  }

  if (isLoading) return <ModerationSkeletons />;
  if (error) return <ModerationError message="Failed to load buildings." />;
  if (visible.length === 0)
    return (
      <ModerationEmptyState
        icon={<Sparkles className="h-10 w-10" />}
        message="No new buildings to review."
        onShowGlobal={showGlobal ? undefined : () => setShowGlobal(true)}
      />
    );

  const allIds = visible.map((b) => b.id);

  return (
    <div className="space-y-4">
      {showGlobal && (
        <GlobalModerationBanner onBack={() => setShowGlobal(false)} />
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((b) => {
          const addressLine = [b.address, b.city, b.country].filter(Boolean).join(", ");
          const mapsUrl =
            b.lat && b.lng
              ? `https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lng}`
              : null;
          const thumbUrl = getBuildingImageUrl(b.n ?? b.hero_image_url);
          return (
            <Card key={b.id} className="overflow-hidden group hover:border-border-strong transition-all flex flex-col">
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
                    onClick={() => handleApprove([b.id])}
                    className="gap-1.5 flex-1"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
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
            onClick={() => handleApprove(allIds)}
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Approve all ({allIds.length})
          </Button>
        </div>
      )}
    </div>
  );
}

function PhotosModerationTab({
  chapterId,
  dismissed,
  onApproveAll,
  onApproveRevert,
  onFlag,
}: {
  chapterId: string;
  dismissed: Set<string>;
  onApproveAll: (ids: string[]) => void;
  onApproveRevert: (ids: string[]) => void;
  onFlag: (id: string, label: string, reason: FlagReason) => void;
}) {
  const queryClient = useQueryClient();
  const [showGlobal, setShowGlobal] = useState(false);

  const { data: photos, isLoading, error } = useQuery({
    queryKey: showGlobal
      ? ["global-moderation-photos", chapterId]
      : ["moderation-photos", chapterId],
    queryFn: () =>
      showGlobal
        ? fetchGlobalModerationPhotos(chapterId)
        : fetchModerationPhotos(chapterId),
  });

  const allVisible = useMemo(
    () => (photos ?? []).filter((p) => !dismissed.has(p.id)),
    [photos, dismissed],
  );

  const visibleBatch = useMemo(
    () => allVisible.slice(0, EMBASSY_PHOTO_MODERATION_BATCH_SIZE),
    [allVisible],
  );

  async function handleApprove(ids: string[]) {
    onApproveAll(ids);
    const results = await Promise.allSettled(ids.map((id) => approvePhoto(id)));
    const failedIds = ids.filter((_, i) => results[i].status === "rejected");
    if (failedIds.length > 0) {
      onApproveRevert(failedIds);
      toast.error(
        `${failedIds.length} approval${failedIds.length === 1 ? "" : "s"} failed — please retry`,
      );
    } else {
      queryClient.invalidateQueries({
        queryKey: showGlobal
          ? ["global-moderation-photos", chapterId]
          : ["moderation-photos", chapterId],
      });
    }
  }

  if (isLoading) return <ModerationSkeletons />;
  if (error) return <ModerationError message="Failed to load photos." />;
  if (visibleBatch.length === 0)
    return (
      <ModerationEmptyState
        icon={<Camera className="h-10 w-10" />}
        message="No new photos to review."
        onShowGlobal={showGlobal ? undefined : () => setShowGlobal(true)}
      />
    );

  const allIds = visibleBatch.map((p) => p.id);

  return (
    <div className="space-y-4">
      {showGlobal && (
        <GlobalModerationBanner onBack={() => setShowGlobal(false)} />
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {visibleBatch.map((p) => {
          const imageUrl = getBuildingImageUrl(p.storage_path);
          return (
            <div key={p.id} className="group relative rounded-sm overflow-hidden bg-muted aspect-square border border-border-default hover:border-border-strong transition-all">
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
                  onClick={() => handleApprove([p.id])}
                  className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-feedback-success hover:bg-feedback-success/10 transition-colors"
                  aria-label="Approve photo"
                  title="Approve photo"
                >
                  <CheckCircle2 className="h-4 w-4" />
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
            onClick={() => handleApprove(allIds)}
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Approve all ({allIds.length})
          </Button>
        </div>
      )}
    </div>
  );
}

function VideosModerationTab({
  chapterId,
  dismissed,
  onApproveAll,
  onApproveRevert,
  onFlag,
}: {
  chapterId: string;
  dismissed: Set<string>;
  onApproveAll: (ids: string[]) => void;
  onApproveRevert: (ids: string[]) => void;
  onFlag: (id: string, label: string, reason: FlagReason) => void;
}) {
  const queryClient = useQueryClient();
  const [showGlobal, setShowGlobal] = useState(false);

  const { data: videos, isLoading, error } = useQuery({
    queryKey: showGlobal
      ? ["global-moderation-videos", chapterId]
      : ["moderation-videos", chapterId],
    queryFn: () =>
      showGlobal
        ? fetchGlobalModerationVideos(chapterId)
        : fetchModerationVideos(chapterId),
  });

  const visible = useMemo(
    () => (videos ?? []).filter((v) => !dismissed.has(v.id)),
    [videos, dismissed],
  );

  async function handleApprove(ids: string[]) {
    onApproveAll(ids);
    const results = await Promise.allSettled(ids.map((id) => approveVideo(id)));
    const failedIds = ids.filter((_, i) => results[i].status === "rejected");
    if (failedIds.length > 0) {
      onApproveRevert(failedIds);
      toast.error(
        `${failedIds.length} approval${failedIds.length === 1 ? "" : "s"} failed — please retry`,
      );
    } else {
      queryClient.invalidateQueries({
        queryKey: showGlobal
          ? ["global-moderation-videos", chapterId]
          : ["moderation-videos", chapterId],
      });
    }
  }

  if (isLoading) return <ModerationSkeletons />;
  if (error) return <ModerationError message="Failed to load videos." />;
  if (visible.length === 0)
    return (
      <ModerationEmptyState
        icon={<Video className="h-10 w-10" />}
        message="No new videos to review."
        onShowGlobal={showGlobal ? undefined : () => setShowGlobal(true)}
      />
    );

  const allIds = visible.map((v) => v.id);

  return (
    <div className="space-y-4">
      {showGlobal && (
        <GlobalModerationBanner onBack={() => setShowGlobal(false)} />
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {visible.map((v) => {
          const resolvedUrl = getStorageAssetUrl(v.video_url) ?? v.video_url;
          return (
            <Card key={v.id} className="overflow-hidden group hover:border-border-strong transition-all">
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
                      onClick={() => handleApprove([v.id])}
                      className="gap-1.5 flex-1"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
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
            onClick={() => handleApprove(allIds)}
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Approve all ({allIds.length})
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
  onApproveRevert,
  onFlag,
}: {
  chapterId: string | undefined;
  dismissed: Set<string>;
  onApproveAll: (ids: string[]) => void;
  onApproveRevert: (ids: string[]) => void;
  onFlag: (id: string, label: string, reason: FlagReason) => void;
}) {
  const queryClient = useQueryClient();
  const [showGlobal, setShowGlobal] = useState(false);

  const { data: credits, isLoading, error } = useQuery({
    queryKey: showGlobal
      ? ["global-moderation-credits", chapterId]
      : ["moderation-credits", chapterId],
    queryFn: () =>
      showGlobal
        ? fetchGlobalModerationCredits(chapterId!)
        : fetchModerationCredits(chapterId!),
    enabled: !!chapterId,
  });

  const allVisible = useMemo(
    () => (credits ?? []).filter((c) => !dismissed.has(c.id)),
    [credits, dismissed],
  );

  const visibleBatch = useMemo(
    () => allVisible.slice(0, EMBASSY_CREDITS_MODERATION_BATCH_SIZE),
    [allVisible],
  );

  async function handleApprove(ids: string[]) {
    onApproveAll(ids);
    const approveFn = showGlobal ? approveCreditGlobal : approveCredit;
    const results = await Promise.allSettled(ids.map((id) => approveFn(id)));
    const failedIds = ids.filter((_, i) => results[i].status === "rejected");
    if (failedIds.length > 0) {
      onApproveRevert(failedIds);
      toast.error(
        `${failedIds.length} approval${failedIds.length === 1 ? "" : "s"} failed — please retry`,
      );
    } else {
      queryClient.invalidateQueries({
        queryKey: showGlobal
          ? ["global-moderation-credits", chapterId]
          : ["moderation-credits", chapterId],
      });
    }
  }

  if (isLoading) return <ModerationSkeletons />;
  if (error) return <ModerationError message="Failed to load credits." />;
  if (visibleBatch.length === 0)
    return (
      <ModerationEmptyState
        icon={<Award className="h-10 w-10" />}
        message="No new credits to review."
        onShowGlobal={showGlobal ? undefined : () => setShowGlobal(true)}
      />
    );

  const allIds = visibleBatch.map((c) => c.id);

  return (
    <div className="space-y-4">
      {showGlobal && (
        <GlobalModerationBanner onBack={() => setShowGlobal(false)} />
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibleBatch.map((c) => {
          return (
            <Card key={c.id} className="p-4 group hover:border-border-strong transition-all">
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
                    onClick={() => handleApprove([c.id])}
                    className="gap-1.5 h-7 px-2 text-xs"
                  >
                    <CheckCircle2 className="h-3 w-3" />
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
            onClick={() => handleApprove(allIds)}
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Approve all ({allIds.length})
          </Button>
        </div>
      )}
    </div>
  );
}

function GlobalModerationBanner({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-muted/60 border border-border-default">
      <p className="text-xs text-muted-foreground">
        Showing content from uncharted locations — places not yet covered by an active chapter.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 whitespace-nowrap transition-colors shrink-0"
      >
        Back to my chapter
      </button>
    </div>
  );
}

function ModerationSkeletons() {
  return (
    <div className="grid gap-4">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-28 w-full rounded-sm" />
      ))}
    </div>
  );
}

function ModerationError({ message }: { message: string }) {
  return (
    <div className="p-8 text-center border rounded-sm bg-feedback-destructive/5 text-feedback-destructive">
      <AlertCircle className="h-8 w-8 mx-auto mb-2" />
      <p>{message}</p>
    </div>
  );
}

// ─── Events Tool ─────────────────────────────────────────────────────────────

function EventsTool({
  chapterId,
  role,
  onBack,
}: {
  chapterId: string;
  role: string | null;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const canForceSearch = role === "exco" || role === "president";
  const [editingDiscovery, setEditingDiscovery] = useState<EventDiscovery | null>(null);
  const [editDraft, setEditDraft] = useState<{
    title: string;
    description: string;
    start_at: string;
    end_at: string;
    address: string;
    external_link: string;
    cover_image_url: string;
  }>({ title: "", description: "", start_at: "", end_at: "", address: "", external_link: "", cover_image_url: "" });
  const [coverUploading, setCoverUploading] = useState(false);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  const { data: chapter } = useQuery({
    queryKey: ["ambassador-chapter-meta", chapterId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("ambassador_chapters")
        .select("last_event_search_at, locality_id")
        .eq("id", chapterId)
        .single();
      if (error) throw error;
      return data as { last_event_search_at: string | null; locality_id: string | null };
    },
    enabled: !!chapterId,
    // Poll until search completes; skip polling for national (no-locality) chapters
    refetchInterval: (query) => {
      const d = query.state.data as { last_event_search_at: string | null; locality_id: string | null } | undefined;
      if (d !== undefined && !d.locality_id) return false;
      return !d?.last_event_search_at ? 20_000 : false;
    },
  });

  const isNationalChapter = chapter !== undefined && !chapter.locality_id;

  const { data: discoveries, isLoading, error, refetch } = useQuery({
    queryKey: ["embassy-event-discoveries", chapterId],
    queryFn: () => fetchPendingEventDiscoveries(chapterId),
    enabled: !!chapterId,
    // Poll in sync with chapter meta; stop for national chapters and once search completes
    refetchInterval: !chapter?.last_event_search_at && !isNationalChapter ? 20_000 : false,
  });

  const publishMutation = useMutation({
    mutationFn: publishEventDiscovery,
    onSuccess: () => {
      toast.success("Event published");
      queryClient.invalidateQueries({ queryKey: ["embassy-event-discoveries", chapterId] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to publish"),
  });

  const discardMutation = useMutation({
    mutationFn: discardEventDiscovery,
    onSuccess: () => {
      toast("Event discarded");
      queryClient.invalidateQueries({ queryKey: ["embassy-event-discoveries", chapterId] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to discard"),
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateEventDiscovery>[1] }) =>
      updateEventDiscovery(id, patch),
    onSuccess: () => {
      toast.success("Changes saved");
      queryClient.invalidateQueries({ queryKey: ["embassy-event-discoveries", chapterId] });
      setEditingDiscovery(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save"),
  });

  // Manual re-run (leadership only). Bypasses the 4-day stale gate; useful when a
  // previous run found nothing or failed silently.
  const forceSearchMutation = useMutation({
    mutationFn: async () => {
      const resp = await fetch("/api/embassy/event-search", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "run", chapter_id: chapterId, force: true }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error((data as { error?: string }).error ?? `Search failed (${resp.status})`);
      }
      return data as { inserted?: number; skipped?: number; duplicates_flagged?: number };
    },
    onSuccess: (data) => {
      const n = data.inserted ?? 0;
      if (n > 0) {
        toast.success(`Found ${n} new event${n === 1 ? "" : "s"}`);
      } else {
        toast("Search complete — no new events found");
      }
      queryClient.invalidateQueries({ queryKey: ["ambassador-chapter-meta", chapterId] });
      queryClient.invalidateQueries({ queryKey: ["embassy-event-discoveries", chapterId] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Search failed"),
  });

  const lastSearchedAt = chapter?.last_event_search_at ?? null;
  const duplicateCount = (discoveries ?? []).filter((d) => d.duplicate_of_event_id).length;


  function openEdit(d: EventDiscovery) {
    setEditingDiscovery(d);
    setEditDraft({
      title: d.title,
      description: d.description ?? "",
      start_at: d.start_at ? d.start_at.slice(0, 16) : "",
      end_at: d.end_at ? d.end_at.slice(0, 16) : "",
      address: d.address ?? "",
      external_link: d.external_link ?? "",
      cover_image_url: d.cover_image_url ?? "",
    });
  }

  async function handleCoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setCoverUploading(true);
    try {
      const resized = await resizeImage(file, 1920, 1080, 0.88);
      const key = await uploadFile(resized, "event-covers");
      const url = getStorageAssetUrl(key);
      if (!url) { toast.error("Could not resolve the uploaded image URL."); return; }
      setEditDraft((d) => ({ ...d, cover_image_url: url }));
    } catch {
      toast.error("Cover upload failed. Try a smaller image or check your connection.");
    } finally {
      setCoverUploading(false);
    }
  }

  function handleSave() {
    if (!editingDiscovery) return;
    saveMutation.mutate({
      id: editingDiscovery.id,
      patch: {
        title: editDraft.title || undefined,
        description: editDraft.description || null,
        start_at: editDraft.start_at || undefined,
        end_at: editDraft.end_at || null,
        address: editDraft.address || null,
        external_link: editDraft.external_link || null,
        cover_image_url: editDraft.cover_image_url || null,
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Events</h1>
            <p className="text-sm text-muted-foreground">Review AI-discovered events for your chapter.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 pl-14 sm:pl-0">
          {lastSearchedAt && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Last searched: {formatDistanceToNow(parseISO(lastSearchedAt), { addSuffix: true })}
            </span>
          )}
          {canForceSearch && !isNationalChapter && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => forceSearchMutation.mutate()}
              disabled={forceSearchMutation.isPending}
            >
              <RefreshCw className={cn("mr-2 h-3.5 w-3.5", forceSearchMutation.isPending && "animate-spin")} />
              {forceSearchMutation.isPending ? "Searching…" : "Search now"}
            </Button>
          )}
        </div>
      </div>

      {!isLoading && !error && discoveries && discoveries.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {discoveries.length} event{discoveries.length === 1 ? "" : "s"} found
          {duplicateCount > 0 && (
            <>
              {" · "}
              <span className="text-feedback-warning">
                {duplicateCount} possible duplicate{duplicateCount === 1 ? "" : "s"}
              </span>
            </>
          )}
        </p>
      )}

      {isLoading ? (
        <div className="grid gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className={cn("h-28 w-full", EMBASSY_SKELETON_ROUNDED)} />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center border rounded-sm bg-feedback-destructive/5 text-feedback-destructive">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p>Failed to load events.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : discoveries?.length === 0 ? (
        <div className="p-12 text-center border border-dashed rounded-sm">
          <CalendarClock className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          {isNationalChapter ? (
            <>
              <p className="text-lg font-medium">Events not available</p>
              <p className="text-sm text-muted-foreground">
                Event discovery is only available for city-based chapters.
              </p>
            </>
          ) : lastSearchedAt ? (
            <>
              <p className="text-lg font-medium">No new events found</p>
              <p className="text-sm text-muted-foreground">
                Plano will check again in{" "}
                {Math.max(1, 4 - differenceInDays(new Date(), parseISO(lastSearchedAt)))} days.
              </p>
              {canForceSearch && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => forceSearchMutation.mutate()}
                  disabled={forceSearchMutation.isPending}
                >
                  <RefreshCw className={cn("mr-2 h-3.5 w-3.5", forceSearchMutation.isPending && "animate-spin")} />
                  {forceSearchMutation.isPending ? "Searching…" : "Search again now"}
                </Button>
              )}
            </>
          ) : (
            <>
              <p className="text-lg font-medium">Search in progress</p>
              <p className="text-sm text-muted-foreground">
                Your first event search will run shortly — check back in a minute.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {discoveries?.map((d) => (
            <EventDiscoveryCard
              key={d.id}
              discovery={d}
              onEdit={() => openEdit(d)}
              onPublish={() => publishMutation.mutate(d.id)}
              onDiscard={() => discardMutation.mutate(d.id)}
              isPublishing={publishMutation.isPending && publishMutation.variables === d.id}
              isDiscarding={discardMutation.isPending && discardMutation.variables === d.id}
            />
          ))}
        </div>
      )}

      {/* Server enforces the 4-day gate. This is opportunistic — never block the layout on it. */}
      <Sheet open={!!editingDiscovery} onOpenChange={(open) => { if (!open) setEditingDiscovery(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit event</SheetTitle>
            <SheetDescription>Update the details before publishing.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-1.5">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editDraft.title}
                onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                rows={3}
                value={editDraft.description}
                onChange={(e) => setEditDraft((d) => ({ ...d, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-start">Start</Label>
                <Input
                  id="edit-start"
                  type="datetime-local"
                  value={editDraft.start_at}
                  onChange={(e) => setEditDraft((d) => ({ ...d, start_at: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-end">End (optional)</Label>
                <Input
                  id="edit-end"
                  type="datetime-local"
                  value={editDraft.end_at}
                  onChange={(e) => setEditDraft((d) => ({ ...d, end_at: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={editDraft.address}
                onChange={(e) => setEditDraft((d) => ({ ...d, address: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-link">External link</Label>
              <Input
                id="edit-link"
                type="url"
                value={editDraft.external_link}
                onChange={(e) => setEditDraft((d) => ({ ...d, external_link: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cover image</Label>
              <input
                ref={coverFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handleCoverFileChange}
              />
              {editDraft.cover_image_url && (
                <div className="overflow-hidden rounded-md border border-border-default">
                  <img
                    src={editDraft.cover_image_url}
                    alt=""
                    className="max-h-36 w-full object-cover"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={coverUploading}
                  onClick={() => coverFileInputRef.current?.click()}
                >
                  {coverUploading ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Uploading…
                    </>
                  ) : editDraft.cover_image_url ? (
                    "Replace image"
                  ) : (
                    "Upload cover image"
                  )}
                </Button>
                {editDraft.cover_image_url && !coverUploading && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditDraft((d) => ({ ...d, cover_image_url: "" }))}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditingDiscovery(null)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending || coverUploading}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function EventDiscoveryCard({
  discovery: d,
  onEdit,
  onPublish,
  onDiscard,
  isPublishing,
  isDiscarding,
}: {
  discovery: EventDiscovery;
  onEdit: () => void;
  onPublish: () => void;
  onDiscard: () => void;
  isPublishing: boolean;
  isDiscarding: boolean;
}) {
  const isDuplicate = !!d.duplicate_of_event_id;

  return (
    <Card className={cn("p-5 transition-all", isDuplicate ? "border-feedback-warning/40" : "border-border-default")}>
      <CardContent className="p-0">
        <div className="flex gap-4">
          {d.cover_image_url && (
            <img
              src={d.cover_image_url}
              alt=""
              className="w-16 h-16 rounded-lg object-cover shrink-0"
            />
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <h3 className="font-semibold text-text-primary leading-snug">{d.title}</h3>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>{format(parseISO(d.start_at), "EEE d MMM yyyy · HH:mm")}</p>
              {d.address && <p>{d.address}</p>}
            </div>

            {isDuplicate && d.duplicate_of_title && (
              <div className="flex items-start gap-1.5 rounded-md bg-feedback-warning/10 border border-feedback-warning/30 px-3 py-2 text-xs text-feedback-warning">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  Possible duplicate of{" "}
                  <Link
                    to={`/events/${d.duplicate_of_event_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:opacity-80"
                  >
                    &ldquo;{d.duplicate_of_title}&rdquo;
                    {d.duplicate_of_start_at && (
                      <> ({format(parseISO(d.duplicate_of_start_at), "d MMM")})</>
                    )}
                  </Link>
                </span>
              </div>
            )}

            {d.description && (
              <p className="text-sm text-text-primary/80 leading-snug">{d.description}</p>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              {d.external_link ? (
                <a
                  href={d.external_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-text-primary hover:opacity-70 transition-opacity"
                >
                  View event <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <a
                  href={d.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-text-primary hover:opacity-70 transition-opacity"
                >
                  View event <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {d.external_link && d.source_url !== d.external_link && (
                <a
                  href={d.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-text-primary transition-colors"
                >
                  Source <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-border-default">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-feedback-destructive border-feedback-destructive/40 hover:bg-feedback-destructive/10"
              disabled={isDiscarding}
              onClick={onDiscard}
            >
              {isDiscarding && <Loader2 className="h-3 w-3 animate-spin" />}
              Discard
            </Button>
          </div>
          <Button
            size="sm"
            disabled={isPublishing}
            onClick={onPublish}
            variant={isDuplicate ? "ghost" : "default"}
            className={cn(
              isDuplicate &&
                "border border-feedback-destructive/40 bg-feedback-destructive/10 text-feedback-destructive hover:bg-feedback-destructive/20",
            )}
          >
            {isPublishing && <Loader2 className="h-3 w-3 animate-spin" />}
            {isDuplicate ? "Publish anyway" : "Publish event"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
