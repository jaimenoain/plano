import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchAmbassadorBuildingsMissingMetadata,
  fetchAmbassadorUnclaimedFirms,
  fetchAmbassadorRecentBuildings,
  fetchAmbassadorBuildingsWithoutPhotos,
  fetchModerationPhotos,
  fetchModerationVideos,
  fetchModerationCredits,
  type AmbassadorUnclaimedFirm,
} from "@/features/embassy/api/taskFeed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Search, ArrowLeft, Filter, CheckCircle2,
  AlertCircle, MessageSquare, Loader2,
  Camera, Sparkles, UserPlus, ExternalLink, Map, List,
  Flag, Video, Award, Users,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getBuildingImageUrl, getStorageAssetUrl } from "@/utils/image";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { getBuildingUrl } from "@/utils/url";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { MapProvider, useMapContext } from "@/features/maps/providers/MapContext";
import { PlanoMap } from "@/features/maps/components/PlanoMap";
import { fetchChapterTeam, type ChapterTeamMember } from "@/features/embassy/api/leadership";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface OutreachLogRow {
  id: string;
  firm_id: string;
  ambassador_id: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type ToolType = "research" | "photography" | "outreach" | "curation" | "community" | "team" | null;

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
    key: "team",
    title: "Team",
    description: "Meet your chapter's president, Executive Committee, and fellow ambassadors.",
    icon: <Users className="h-6 w-6" />,
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
  const { data: membership } = useQuery({
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

  if (activeTool === "team" && chapterId) {
    return <TeamTool chapterId={chapterId} onBack={() => setActiveTool(null)} />;
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

function DataResearchTool({ chapterId, onBack }: { chapterId: string; onBack: () => void }) {
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

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
          {filteredBuildings.map((b) => (
            <Card key={b.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-6 group hover:border-brand-primary transition-all">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold truncate">{b.name}</h3>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-muted-foreground">
                    {b.city || b.country || "Global"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {b.missing_fields?.map(field => (
                    <Badge key={field} variant="secondary" className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-none text-[10px] font-bold uppercase">
                      {field === 'architect_credit' ? 'No Architect' : 
                       field === 'year_completed' ? 'No Year' : 
                       field === 'styles' ? 'No Style' : field}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button size="sm" asChild className="shrink-0">
                <Link to={`${getBuildingUrl(b.id, b.slug, b.short_id)}/edit`}>
                  Complete Data
                </Link>
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ArchitectOutreachTool({ chapterId, onBack }: { chapterId: string; onBack: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [drawerFirm, setDrawerFirm] = useState<AmbassadorUnclaimedFirm | null>(null);

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

  const filteredFirms = useMemo(() => {
    if (!firms) return [];
    return firms.filter(f =>
      f.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [firms, search]);

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
          {filteredFirms.map((f) => {
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

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ["embassy-firm-outreach-logs", firm?.id],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("outreach_log")
        .select("*")
        .eq("firm_id", firm!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as OutreachLogRow[];
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
          ) : !logs?.length ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No interactions logged yet.
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
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
                  <p className="text-[11px] text-muted-foreground">
                    {log.ambassador_id === userId ? "You" : "Another ambassador"}
                  </p>
                </div>
              ))}
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
    toast.success(`${ids.length} item${ids.length === 1 ? "" : "s"} approved`);
  };

  const handleFlag = (id: string, label: string) => {
    setDismissed((prev) => new Set(prev).add(id));
    toast("Flagged for admin review", { description: label });
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
            dismissed={dismissed}
            onApproveAll={handleApproveAll}
            onFlag={handleFlag}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FlagButton({ id, label, onFlag }: { id: string; label: string; onFlag: (id: string, label: string) => void }) {
  return (
    <button
      type="button"
      title="Flag for review"
      aria-label="Flag for review"
      onClick={(e) => { e.stopPropagation(); onFlag(id, label); }}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
    >
      <Flag className="h-4 w-4" />
    </button>
  );
}

function ApproveAllButton({ ids, onApproveAll }: { ids: string[]; onApproveAll: (ids: string[]) => void }) {
  if (ids.length === 0) return null;
  return (
    <div className="flex justify-end pt-2 border-t">
      <Button variant="default" size="sm" onClick={() => onApproveAll(ids)}>
        <CheckCircle2 className="h-4 w-4 mr-1.5" />
        Approve all ({ids.length})
      </Button>
    </div>
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
  onFlag: (id: string, label: string) => void;
}) {
  const { data: buildings, isLoading, error } = useQuery({
    queryKey: ["embassy-recent-buildings", chapterId],
    queryFn: () => fetchAmbassadorRecentBuildings(chapterId),
    enabled: !!chapterId,
  });

  const visible = useMemo(
    () => (buildings ?? []).filter((b) => !dismissed.has(b.id)),
    [buildings, dismissed],
  );

  if (isLoading) return <ModerationSkeletons />;
  if (error) return <ModerationError message="Failed to load buildings." />;
  if (visible.length === 0)
    return <ModerationEmptyState icon={<Sparkles className="h-10 w-10" />} message="No new buildings to review." />;

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {visible.map((b) => {
          const addressLine = [b.address, b.city, b.country].filter(Boolean).join(", ");
          const mapsUrl =
            b.lat && b.lng
              ? `https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lng}`
              : null;
          const thumbUrl = getBuildingImageUrl(b.n ?? b.hero_image_url);
          return (
            <Card key={b.id} className="overflow-hidden group hover:border-brand-primary transition-all">
              <div className="flex flex-col sm:flex-row">
                {thumbUrl ? (
                  <div className="sm:w-36 sm:shrink-0 h-40 sm:h-auto bg-muted overflow-hidden">
                    <img src={thumbUrl} alt={b.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="hidden sm:flex sm:w-36 sm:shrink-0 items-center justify-center bg-muted text-muted-foreground">
                    <Camera className="h-8 w-8 opacity-30" />
                  </div>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 flex-1 min-w-0">
                  <div className="min-w-0 flex-1 space-y-1.5">
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
                        Added by @{b.added_by_username || "anonymous"}
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
                  <div className="flex items-center gap-2 shrink-0">
                    <FlagButton id={b.id} label={b.name} onFlag={onFlag} />
                    <Button size="sm" asChild>
                      <Link to={getBuildingUrl(b.id, b.slug, b.short_id)}>Review</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <ApproveAllButton ids={visible.map((b) => b.id)} onApproveAll={onApproveAll} />
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
  onFlag: (id: string, label: string) => void;
}) {
  const { data: photos, isLoading, error } = useQuery({
    queryKey: ["moderation-photos"],
    queryFn: fetchModerationPhotos,
  });

  const visible = useMemo(
    () => (photos ?? []).filter((p) => !dismissed.has(p.id)),
    [photos, dismissed],
  );

  if (isLoading) return <ModerationSkeletons />;
  if (error) return <ModerationError message="Failed to load photos." />;
  if (visible.length === 0)
    return <ModerationEmptyState icon={<Camera className="h-10 w-10" />} message="No new photos to review." />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {visible.map((p) => {
          const imageUrl = getBuildingImageUrl(p.storage_path);
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
                <button
                  type="button"
                  title="Flag for review"
                  aria-label="Flag for review"
                  onClick={(e) => { e.stopPropagation(); onFlag(p.id, `Photo on ${p.building_name}`); }}
                  className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Flag className="h-4 w-4" />
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
      <ApproveAllButton ids={visible.map((p) => p.id)} onApproveAll={onApproveAll} />
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
  onFlag: (id: string, label: string) => void;
}) {
  const { data: videos, isLoading, error } = useQuery({
    queryKey: ["moderation-videos"],
    queryFn: fetchModerationVideos,
  });

  const visible = useMemo(
    () => (videos ?? []).filter((v) => !dismissed.has(v.id)),
    [videos, dismissed],
  );

  if (isLoading) return <ModerationSkeletons />;
  if (error) return <ModerationError message="Failed to load videos." />;
  if (visible.length === 0)
    return <ModerationEmptyState icon={<Video className="h-10 w-10" />} message="No new videos to review." />;

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {visible.map((v) => {
          const resolvedUrl = getStorageAssetUrl(v.video_url) ?? v.video_url;
          return (
            <Card key={v.id} className="p-5 group hover:border-brand-primary transition-all">
              <div className="space-y-4">
                <VideoPlayer
                  src={resolvedUrl}
                  className="aspect-video w-full rounded-sm"
                />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <h3 className="font-semibold truncate">{v.building_name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(v.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <FlagButton id={v.id} label={`Video on ${v.building_name}`} onFlag={onFlag} />
                    <Button size="sm" asChild>
                      <Link to={getBuildingUrl(v.building_id, v.building_slug, v.building_short_id)}>
                        View Building
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <ApproveAllButton ids={visible.map((v) => v.id)} onApproveAll={onApproveAll} />
    </div>
  );
}

function CreditsModerationTab({
  dismissed,
  onApproveAll,
  onFlag,
}: {
  dismissed: Set<string>;
  onApproveAll: (ids: string[]) => void;
  onFlag: (id: string, label: string) => void;
}) {
  const { data: credits, isLoading, error } = useQuery({
    queryKey: ["moderation-credits"],
    queryFn: fetchModerationCredits,
  });

  const visible = useMemo(
    () => (credits ?? []).filter((c) => !dismissed.has(c.id)),
    [credits, dismissed],
  );

  if (isLoading) return <ModerationSkeletons />;
  if (error) return <ModerationError message="Failed to load credits." />;
  if (visible.length === 0)
    return <ModerationEmptyState icon={<Award className="h-10 w-10" />} message="No new credits to review." />;

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {visible.map((c) => (
          <Card key={c.id} className="p-5 group hover:border-brand-primary transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold truncate">
                    {c.entity_name ?? <span className="italic text-muted-foreground">Unknown</span>}
                  </h3>
                  <Badge className="text-[10px] uppercase font-bold shrink-0 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 border-none">
                    {c.role.replace(/_/g, " ")}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  on {c.building_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <FlagButton id={c.id} label={`Credit on ${c.building_name}`} onFlag={onFlag} />
                <Button size="sm" asChild>
                  <Link to={getBuildingUrl(c.building_id, c.building_slug, c.building_short_id)}>
                    View Building
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <ApproveAllButton ids={visible.map((c) => c.id)} onApproveAll={onApproveAll} />
    </div>
  );
}

const EXCO_LABELS: Record<string, string> = {
  content: "Content",
  marketing: "Marketing",
  architect_relations: "Architect relations",
  data_quality: "Data quality",
  community: "Community",
};

const ROLE_LABELS: Record<string, string> = {
  president: "President",
  exco: "Executive Committee",
  ambassador: "Ambassador",
};

function TeamTool({ chapterId, onBack }: { chapterId: string; onBack: () => void }) {
  const { data: members, isLoading, error } = useQuery({
    queryKey: ["chapter-team", chapterId],
    queryFn: () => fetchChapterTeam(chapterId),
    enabled: !!chapterId,
    staleTime: 5 * 60 * 1000,
  });

  const grouped = useMemo(() => {
    if (!members) return { president: [], exco: [], ambassador: [] };
    return {
      president: members.filter((m) => m.role === "president"),
      exco: members.filter((m) => m.role === "exco"),
      ambassador: members.filter((m) => m.role === "ambassador"),
    };
  }, [members]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground">Your chapter's leadership and ambassadors.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <div className="grid gap-3">
                {[0, 1].map((j) => <Skeleton key={j} className="h-20 w-full rounded-xl" />)}
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center border rounded-xl bg-destructive/5 text-destructive">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p>Failed to load team. Please try again.</p>
        </div>
      ) : !members?.length ? (
        <div className="p-12 text-center border border-dashed rounded-xl">
          <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-lg font-medium">No team members yet</p>
          <p className="text-sm text-muted-foreground">Your chapter hasn't set up its team yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {(["president", "exco", "ambassador"] as const).map((role) => {
            const group = grouped[role];
            if (group.length === 0) return null;
            return (
              <div key={role} className="space-y-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {ROLE_LABELS[role]}
                  </h2>
                  <div className="flex-1 border-t" />
                  <span className="text-xs text-muted-foreground">{group.length}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {group.map((member) => (
                    <TeamMemberCard key={member.user_id} member={member} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TeamMemberCard({ member }: { member: ChapterTeamMember }) {
  const initials = member.username
    .split(/[\s_-]/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  return (
    <Card className="p-4 flex items-center gap-4 hover:border-brand-primary transition-all">
      <Avatar className="h-12 w-12 shrink-0">
        <AvatarImage src={member.avatar_url ?? undefined} alt={member.username} />
        <AvatarFallback className="text-sm font-semibold">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold truncate">@{member.username}</span>
          {member.role === "president" && (
            <Badge className="text-[10px] uppercase font-bold bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 border-none">
              President
            </Badge>
          )}
          {member.role === "exco" && (
            <Badge variant="secondary" className="text-[10px] uppercase font-bold">
              ExCo
            </Badge>
          )}
        </div>
        {member.role === "exco" && member.exco_responsibility && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {EXCO_LABELS[member.exco_responsibility] ?? member.exco_responsibility}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">
          Joined {new Date(member.joined_at).toLocaleDateString(undefined, { year: "numeric", month: "short" })}
        </p>
      </div>
    </Card>
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
