import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  fetchAmbassadorBuildingsMissingMetadata, 
  fetchAmbassadorUnclaimedFirms, 
  fetchAmbassadorRecentBuildings,
  fetchAmbassadorBuildingsWithoutPhotos,
  type AmbassadorBuildingMissingMeta, 
  type AmbassadorUnclaimedFirm,
  type AmbassadorRecentBuilding,
  type AmbassadorBuildingNoPhoto
} from "@/features/embassy/api/taskFeed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Link } from "react-router";
import { 
  Building2, Search, ArrowLeft, Filter, CheckCircle2, 
  AlertCircle, MessageSquare, History, Check, Loader2,
  Camera, Sparkles, UserPlus, ExternalLink, Map
} from "lucide-react";
import { getBuildingUrl } from "@/utils/url";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapProvider, useMapContext } from "@/features/maps/providers/MapContext";
import { PlanoMap } from "@/features/maps/components/PlanoMap";
import { List } from "lucide-react";

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
    title: "Curation",
    description: "Review tags, group buildings into collections, and highlight gems.",
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
  const [activeTool, setActiveTool] = useState<ToolType>(null);

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
    return buildings.filter(b => {
      const matchesSearch = b.name.toLowerCase().includes(search.toLowerCase()) || 
                            (b.city && b.city.toLowerCase().includes(search.toLowerCase()));
      const matchesFilter = filter === "all" || b.missing_fields?.includes(filter);
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
  const [logOpen, setLogOpen] = useState(false);
  const [selectedFirm, setSelectedFirm] = useState<AmbassadorUnclaimedFirm | null>(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string>("contacted");

  const { data: firms, isLoading, error } = useQuery({
    queryKey: ["embassy-unclaimed-firms", chapterId],
    queryFn: () => fetchAmbassadorUnclaimedFirms(chapterId),
    enabled: !!chapterId,
  });

  const { data: outreachLogs } = useQuery({
    queryKey: ["embassy-outreach-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outreach_log")
        .select("*")
        .eq("ambassador_id", user?.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const filteredFirms = useMemo(() => {
    if (!firms) return [];
    return firms.filter(f => 
      f.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [firms, search]);

  const logMutation = useMutation({
    mutationFn: async (data: { firm_id: string, status: string, notes: string }) => {
      const { error } = await supabase
        .from("outreach_log")
        .upsert({
          firm_id: data.firm_id,
          ambassador_id: user?.id,
          status: data.status,
          notes: data.notes,
          updated_at: new Date().toISOString()
        }, { onConflict: 'firm_id, ambassador_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Outreach logged successfully");
      setLogOpen(false);
      setSelectedFirm(null);
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["embassy-outreach-logs"] });
    },
    onError: () => {
      toast.error("Failed to log outreach.");
    }
  });

  const openLog = (firm: AmbassadorUnclaimedFirm) => {
    const existing = outreachLogs?.find(l => l.firm_id === firm.id);
    setSelectedFirm(firm);
    setNotes(existing?.notes || "");
    setStatus(existing?.status || "contacted");
    setLogOpen(true);
  };

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
            const log = outreachLogs?.find(l => l.firm_id === f.id);
            return (
              <Card key={f.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-6 group hover:border-brand-primary transition-all">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{f.name}</h3>
                    {log && (
                      <Badge variant="secondary" className={cn(
                        "text-[10px] uppercase font-bold",
                        log.status === 'claimed' ? "bg-green-500/10 text-green-600" : "bg-blue-500/10 text-blue-600"
                      )}>
                        {log.status}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {f.building_count} building{f.building_count === 1 ? "" : "s"} on Plano · {f.country || "Global"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/company/${f.slug}`}>View Firm</Link>
                  </Button>
                  <Button size="sm" onClick={() => openLog(f)} className="gap-2">
                    {log ? <History className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                    {log ? "Update Log" : "Log Outreach"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Outreach: {selectedFirm?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex flex-wrap gap-2">
                {['contacted', 'replied', 'claimed', 'declined'].map((s) => (
                  <Button
                    key={s}
                    variant={status === s ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatus(s)}
                    className="capitalize"
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="outreach-notes">Notes</Label>
              <Textarea
                id="outreach-notes"
                placeholder="Details about the conversation, who you spoke to, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => logMutation.mutate({ firm_id: selectedFirm!.id, status, notes })}
              disabled={logMutation.isPending}
            >
              {logMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Log"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PhotographyTool({ chapterId, onBack }: { chapterId: string; onBack: () => void }) {
  const [view, setView] = useState<"list" | "map">("map");
  const { state: { filters }, methods: { setFilter } } = useMapContext();
  
  const { data: buildings, isLoading, error } = useQuery({
    queryKey: ["embassy-buildings-no-photo", chapterId],
    queryFn: () => fetchAmbassadorBuildingsWithoutPhotos(chapterId),
    enabled: !!chapterId && view === "list",
  });

  // Photography map is always active in Photography mode
  useEffect(() => {
    if (view === "map") {
      setFilter("photographyGaps", true);
      // Default to "All gaps" if none selected
      if (!filters.gapPhotoCounts || filters.gapPhotoCounts.length === 0) {
        setFilter("gapPhotoCounts", [0, 1]); // Show 0 and 1-2 photos by default as "gaps"
      }
    } else {
      setFilter("photographyGaps", false);
    }
  }, [view, setFilter]);

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

function CurationTool({ chapterId, onBack }: { chapterId: string; onBack: () => void }) {
  const { data: buildings, isLoading, error } = useQuery({
    queryKey: ["embassy-recent-buildings", chapterId],
    queryFn: () => fetchAmbassadorRecentBuildings(chapterId),
    enabled: !!chapterId,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Curation</h1>
          <p className="text-sm text-muted-foreground">Review recently added buildings and ensure they meet quality standards.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : error ? (
        <div className="p-8 text-center border rounded-xl bg-destructive/5 text-destructive">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p>Failed to load curation tasks.</p>
        </div>
      ) : buildings?.length === 0 ? (
        <div className="p-12 text-center border border-dashed rounded-xl">
          <Sparkles className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-lg font-medium">Clear for now</p>
          <p className="text-sm text-muted-foreground">No new buildings have been added recently.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {buildings?.map((b) => (
            <Card key={b.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-6 group hover:border-brand-primary transition-all">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold truncate">{b.name}</h3>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-muted-foreground">
                    New
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Added by @{b.added_by_username || "anonymous"}</p>
              </div>
              <Button size="sm" asChild>
                <Link to={getBuildingUrl(b.id, b.slug, b.short_id)}>
                  Review
                </Link>
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
