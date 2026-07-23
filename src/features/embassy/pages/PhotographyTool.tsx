import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { ArrowLeft, Camera, List, Map, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { PlanoMap, useMapContext } from "@/features/maps";
import {
  fetchAmbassadorBuildingsWithoutPhotos,
  EMBASSY_SEARCH_FEED_LIMIT,
} from "../api/taskFeed";
import { fetchChapterLocalityCenter, nextBuildingAfter } from "../api/photoUpload";
import { EmbassyEmptyState, EmbassyErrorState } from "../components/embassy-ui";
import {
  PhotoUploadSheet,
  type PhotoUploadTarget,
} from "../components/PhotoUploadSheet";

const PHOTOGRAPHY_POPULARITY_STEPS = [
  { label: "All", percent: 100 },
  { label: "Top 50%", percent: 50 },
  { label: "Top 20%", percent: 20 },
  { label: "Top 10%", percent: 10 },
] as const;

const PHOTO_GAP_FILTER_KEY = "plano:photography:gapPhotoCounts";

export function PhotographyTool({
  chapterId,
  onBack,
}: {
  chapterId: string;
  onBack: () => void;
}) {
  const [view, setView] = useState<"list" | "map">("map");
  const { state: { filters }, methods: { setFilter, moveMap } } = useMapContext();
  const [searchParams] = useSearchParams();
  // Capture at mount whether the URL already carried explicit lat/lng (e.g. a
  // shared deep-link). If it did, preserve the position. If it didn't (user
  // opened the tool from the tools list), always center on the chapter city —
  // regardless of what PlanoMap.onLoad restores from localStorage afterwards.
  const initialHasExplicitPosition = useRef(
    searchParams.get("lat") !== null && searchParams.get("lng") !== null,
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
    queryFn: () => fetchChapterLocalityCenter(chapterId),
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

  // The in-place upload sheet, shared by the list and the map gap-pin popup.
  const [activeBuilding, setActiveBuilding] = useState<PhotoUploadTarget | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Read the latest filtered list inside the (stable) onUploaded handler so the
  // "advance to next" step always uses the current queue ordering.
  const filteredRef = useRef(filteredBuildings);
  filteredRef.current = filteredBuildings;

  const openUploadSheet = (target: PhotoUploadTarget) => {
    setActiveBuilding(target);
    setSheetOpen(true);
  };

  const handleUploaded = (buildingId: string) => {
    const next = nextBuildingAfter(filteredRef.current, buildingId);
    if (next) {
      setActiveBuilding({ id: next.id, name: next.name });
    } else {
      setSheetOpen(false);
    }
  };

  // Enable/disable the photography-gap map filter when the view tab changes.
  // Only re-runs on view change — not on every map interaction.
  const readStoredGapCounts = (): number[] => {
    try {
      const raw = localStorage.getItem(PHOTO_GAP_FILTER_KEY);
      if (raw) return JSON.parse(raw) as number[];
    } catch { /* localStorage unavailable or corrupt JSON: fall back to default gap counts */ }
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
      ? current.filter((v) => v !== val)
      : [...current, val];
    setFilter("gapPhotoCounts", next);
    try { localStorage.setItem(PHOTO_GAP_FILTER_KEY, JSON.stringify(next)); } catch { /* localStorage unavailable (private mode / quota): persisting filter prefs is best-effort */ }
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
            <p className="text-sm text-muted-foreground">Find buildings that need images and add a photo without leaving the tool. Feel free to mark as hidden any building that is not interesting enough.</p>
          </div>
        </div>

        <div className="flex items-center bg-muted p-1 rounded-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView("map")}
            className={cn("gap-2", view === "map" && "bg-surface-card shadow-xs")}
          >
            <Map className="h-4 w-4" />
            Map
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView("list")}
            className={cn("gap-2", view === "list" && "bg-surface-card shadow-xs")}
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
                  f.value === 0 ? "bg-feedback-destructive" : f.value === 1 ? "bg-feedback-warning" : "bg-feedback-success",
                )} />
                {f.label}
              </div>
            </Button>
          ))}
        </div>
      </div>

      {view === "map" ? (
        <div className="flex-1 min-h-0 border rounded-sm overflow-hidden shadow-inner bg-surface-muted relative">
          <PlanoMap
            showGapCallout
            onAddPhoto={(buildingId, name) => openUploadSheet({ id: buildingId, name })}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-2">
          {isLoading ? (
            <div className="grid gap-4">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-sm" />)}
            </div>
          ) : error ? (
            <EmbassyErrorState message="Failed to load photography tasks." />
          ) : buildings?.length === 0 ? (
            <EmbassyEmptyState
              title="All photographed"
              description="Every building in your chapter has at least one photo."
            />
          ) : (
            <div className="grid gap-4">
              {filteredBuildings.map((b) => (
                <Card key={b.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-6 group hover:border-border-strong transition-all">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate">{b.name}</h3>
                    <p className="text-xs text-muted-foreground">{b.city || b.country || "Global"}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => openUploadSheet({ id: b.id, name: b.name })}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Add photo
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <PhotoUploadSheet
        building={activeBuilding}
        chapterId={chapterId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onUploaded={handleUploaded}
      />
    </div>
  );
}
