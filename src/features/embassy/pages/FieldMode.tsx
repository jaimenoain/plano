import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, Crosshair, Loader2, MapPin } from "lucide-react";
import { useAuth } from "@/features/auth";
import { useUserLocation } from "@/hooks/useUserLocation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EmbassyPageHeader,
  EmbassyEmptyState,
  EmbassyErrorState,
  EMBASSY_SKELETON_ROUNDED,
} from "../components/embassy-ui";
import { PhotoUploadSheet, type PhotoUploadTarget } from "../components/PhotoUploadSheet";
import { fetchChapterLocalityCenter, nextBuildingAfter } from "../api/photoUpload";
import {
  fetchMyActiveChapterId,
  fetchNearbyPhotoGaps,
  formatDistance,
  nextRadiusAfter,
  FIELD_RADII_METERS,
  type NearbyPhotoGap,
} from "../api/fieldMode";

type Origin =
  | { kind: "locating" }
  | { kind: "device"; lat: number; lng: number }
  | { kind: "chapter"; lat: number; lng: number }
  | { kind: "unavailable" };

/**
 * Field mode (roadmap 4.3) — what to photograph from where you are standing.
 *
 * Mobile-first on purpose: the whole point is the moment an ambassador is out on foot with
 * a phone. One column, big tap targets, the camera one tap from every row.
 *
 * The list is chapter-scoped (owner decision): photographing outside your chapter would not
 * count toward it, so the honest answer there is an empty state, not a longer list.
 */
export default function FieldModePage() {
  const { user } = useAuth();
  const { requestLocation } = useUserLocation();

  const [origin, setOrigin] = useState<Origin>({ kind: "locating" });
  const [radiusMeters, setRadiusMeters] = useState<number>(FIELD_RADII_METERS[0]);
  const [activeBuilding, setActiveBuilding] = useState<PhotoUploadTarget | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const gapsRef = useRef<NearbyPhotoGap[]>([]);

  const { data: chapterId } = useQuery({
    queryKey: ["ambassador-membership-field", user?.id],
    queryFn: () => fetchMyActiveChapterId(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // useUserLocation returns a fresh `requestLocation` identity on every render (and calling it
  // sets state in the hook), so depending on it directly would re-fire this effect forever.
  // Latest-value ref, same trick PhotographyTool uses to keep its effects off map churn.
  const requestLocationRef = useRef(requestLocation);
  requestLocationRef.current = requestLocation;

  // Ask the device, and fall back to the chapter's own centre so the page is still useful
  // when location is refused — with the substitution stated on screen, never silently.
  const locate = useCallback(async () => {
    setOrigin({ kind: "locating" });
    const position = await requestLocationRef.current({ silent: true });
    if (position) {
      setOrigin({ kind: "device", lat: position.lat, lng: position.lng });
      return;
    }
    if (!chapterId) {
      setOrigin({ kind: "unavailable" });
      return;
    }
    try {
      const centre = await fetchChapterLocalityCenter(chapterId);
      setOrigin(centre ? { kind: "chapter", ...centre } : { kind: "unavailable" });
    } catch {
      setOrigin({ kind: "unavailable" });
    }
  }, [chapterId]);

  useEffect(() => {
    if (chapterId === undefined) return; // membership still loading
    void locate();
  }, [chapterId, locate]);

  const hasPosition = origin.kind === "device" || origin.kind === "chapter";

  const gapsQuery = useQuery({
    queryKey: [
      "embassy-field-gaps",
      chapterId,
      hasPosition ? (origin as { lat: number }).lat : null,
      hasPosition ? (origin as { lng: number }).lng : null,
      radiusMeters,
    ],
    queryFn: () =>
      fetchNearbyPhotoGaps({
        chapterId: chapterId!,
        lat: (origin as { lat: number }).lat,
        lng: (origin as { lng: number }).lng,
        radiusMeters,
      }),
    enabled: !!chapterId && hasPosition,
    staleTime: 30_000,
  });

  // Memoised so the empty-array fallback doesn't get a new identity on every render and
  // re-fire the ref sync below.
  const gaps = useMemo(() => gapsQuery.data ?? [], [gapsQuery.data]);
  const widerRadius = nextRadiusAfter(radiusMeters);

  // Kept in a ref so `handleUploaded` can find the next building without the sheet having to
  // re-mount every time the queue refetches.
  useEffect(() => {
    gapsRef.current = gaps;
  }, [gaps]);

  const handleUploaded = (buildingId: string) => {
    const next = nextBuildingAfter(gapsRef.current, buildingId);
    if (next) {
      setActiveBuilding({ id: next.id, name: next.name });
    } else {
      setSheetOpen(false);
    }
  };

  return (
    <div className="space-y-8 pb-24">
      <EmbassyPageHeader
        eyebrow="Field mode"
        title="Shoot what's nearest"
        description="Buildings around you with no photo yet. Tap one, take the shot, it drops off the list."
      />

      <OriginBanner origin={origin} radiusMeters={radiusMeters} onRelocate={() => void locate()} />

      {origin.kind === "unavailable" ? (
        <EmbassyEmptyState
          title="We can't tell where you are"
          description="Field mode needs your location, or a chapter with a home city, to know what's nearby. Allow location access and try again."
        >
          <Button variant="outline" size="sm" onClick={() => void locate()}>
            Try again
          </Button>
        </EmbassyEmptyState>
      ) : origin.kind === "locating" || gapsQuery.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className={`h-20 w-full ${EMBASSY_SKELETON_ROUNDED}`} />
          ))}
        </div>
      ) : gapsQuery.isError ? (
        <EmbassyErrorState message="Could not load what's nearby right now. Try again in a moment." />
      ) : gaps.length === 0 ? (
        <EmbassyEmptyState
          title={`Nothing within ${formatDistance(radiusMeters)}`}
          description={
            widerRadius
              ? "Every building around you already has a photo. Widen the search, or move on and check again later."
              : "Every building in range already has a photo — in this chapter, at least. Nice work."
          }
        >
          {widerRadius ? (
            <Button variant="outline" size="sm" onClick={() => setRadiusMeters(widerRadius)}>
              Search {formatDistance(widerRadius)}
            </Button>
          ) : null}
        </EmbassyEmptyState>
      ) : (
        <div className="space-y-3">
          {gaps.map((gap) => (
            <GapRow
              key={gap.id}
              gap={gap}
              onShoot={() => {
                setActiveBuilding({ id: gap.id, name: gap.name });
                setSheetOpen(true);
              }}
            />
          ))}

          {widerRadius && (
            <Button
              variant="outline"
              className="w-full min-h-11"
              onClick={() => setRadiusMeters(widerRadius)}
            >
              Search further out ({formatDistance(widerRadius)})
            </Button>
          )}
        </div>
      )}

      {chapterId && (
        <PhotoUploadSheet
          building={activeBuilding}
          chapterId={chapterId}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          onUploaded={handleUploaded}
          cameraFirst
          invalidateKeys={[["embassy-field-gaps"]]}
        />
      )}
    </div>
  );
}

function OriginBanner({
  origin,
  radiusMeters,
  onRelocate,
}: {
  origin: Origin;
  radiusMeters: number;
  onRelocate: () => void;
}) {
  if (origin.kind === "unavailable") return null;

  return (
    <div className="flex items-center gap-3 rounded-sm border border-border-default p-4">
      {origin.kind === "locating" ? (
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-text-disabled" aria-hidden />
      ) : (
        <MapPin className="h-5 w-5 shrink-0 text-text-secondary" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-text-primary">
          {origin.kind === "locating"
            ? "Finding you…"
            : origin.kind === "device"
              ? `Within ${formatDistance(radiusMeters)} of you`
              : "Using your chapter's centre"}
        </p>
        {origin.kind === "chapter" && (
          <p className="text-2xs uppercase tracking-widest text-text-disabled">
            We couldn't read your location
          </p>
        )}
      </div>
      {origin.kind !== "locating" && (
        <Button variant="ghost" size="sm" className="min-h-11 shrink-0" onClick={onRelocate}>
          <Crosshair className="mr-2 h-4 w-4" aria-hidden />
          Recentre
        </Button>
      )}
    </div>
  );
}

function GapRow({ gap, onShoot }: { gap: NearbyPhotoGap; onShoot: () => void }) {
  return (
    <div className="flex items-center gap-4 rounded-sm border border-border-default p-4">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">{gap.name}</p>
        <p className="text-2xs uppercase tracking-widest text-text-disabled tabular-nums">
          {formatDistance(gap.distanceMeters)}
          {gap.city ? ` · ${gap.city}` : ""}
        </p>
      </div>
      <Button className="min-h-12 shrink-0" onClick={onShoot}>
        <Camera className="mr-2 h-4 w-4" aria-hidden />
        Photo
      </Button>
    </div>
  );
}
