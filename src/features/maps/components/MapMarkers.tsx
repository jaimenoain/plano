import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { Marker, useMap, Popup } from 'react-map-gl/maplibre';
import { ClusterResponse } from '../hooks/useMapData';
import { BuildingPopupContent } from './BuildingPopupContent';
import { getPinStyle } from '../utils/pinStyling';
import { MapPin } from './MapPin';
import { MAP_MARKER_FILL } from '@/features/maps/constants/mapMarkerFills';
import { getCollectionMarkerLucideIcon } from '@/features/collections/markerPlaceDisplay';
import type { CollectionMarkerCategory } from '@/features/collections/types';
import '../../../App.css';
import { getBuildingUrl } from '@/utils/url';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

import { useOptionalMapContext } from '../providers/MapContext';

/**
 * The React key for a cluster/marker. Derived solely from `id` (+ `count` for
 * clusters, so a cell that gains/loses a member remounts cleanly). Shared by the
 * dedupe pass and the render so the two can never drift apart.
 */
const markerKey = (c: ClusterResponse): string =>
  c.is_cluster ? `cluster-${c.id}-${c.count}` : `marker-${c.id}`;

interface MapMarkersProps {
  clusters: ClusterResponse[];
  highlightedId?: string | null;
  /**
   * Coordinates of the highlighted building when the highlight came from a SERP
   * row. When set and no individual pin matches `highlightedId` (browse mode,
   * grouped), the nearest containing cluster is emphasised instead.
   */
  highlightedPoint?: { lat: number; lng: number } | null;
  setHighlightedId: (id: string | null) => void;
  /** Currently selected building id — keeps its pin emphasised while the detail drawer is open. */
  selectedId?: string | null;
  /**
   * When provided, a building-pin click selects the building (opening the detail
   * drawer) instead of opening the full page in a new tab, and the inline hover
   * popup is suppressed. The search map passes this; collection maps do not, so
   * they keep their original hover-popup + open-in-new-tab behaviour.
   */
  onSelectBuilding?: (cluster: ClusterResponse) => void;
  onRemoveFromCollection?: (id: string) => void;
  onAddCandidate?: (id: string) => void;
}

export function MapMarkers({
  clusters,
  highlightedId,
  highlightedPoint,
  setHighlightedId,
  selectedId,
  onSelectBuilding,
  onRemoveFromCollection,
  onAddCandidate
}: MapMarkersProps) {
  const { current: map } = useMap();
  const mapCtx = useOptionalMapContext();
  const photographyGaps = mapCtx?.state.filters.photographyGaps ?? false;
  // Mode selects the pin code (library → personal points, discover → global
  // percentiles). Surfaces without a MapProvider (collections, localities,
  // building maps) have no mode and read as discover/global.
  const mode = mapCtx?.state.mode ?? 'discover';
  const isMobile = useIsMobile();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ref to retain the currently highlighted cluster even if it disappears from the backend clusters array
  // (e.g., when a filter hides it instantly upon saving)
  const retainedClusterRef = useRef<ClusterResponse | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = useCallback((id: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setHighlightedId(id);
  }, [setHighlightedId]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setHighlightedId(null);
      timeoutRef.current = null;
    }, 300);
  }, [setHighlightedId]);

  // Find the active cluster based on the highlightedId
  const activeCluster = useMemo(() => {
    if (!highlightedId) {
        retainedClusterRef.current = null;
        return null;
    }

    const found = clusters.find(c =>
      !c.is_cluster && // Only single items
      String(c.id) === String(highlightedId) // Match the ID directly (ensure string comparison)
    );

    if (found) {
        retainedClusterRef.current = found;
        return found;
    }

    // If not found in current clusters, but we have it in memory for this highlightedId
    return retainedClusterRef.current;
  }, [clusters, highlightedId]);

  // Create a display array that includes the retained cluster if it's missing
  const displayClusters = useMemo(() => {
      if (!activeCluster) return clusters;
      const isStillInClusters = clusters.some(c => String(c.id) === String(activeCluster.id));
      if (!isStillInClusters) {
          return [...clusters, activeCluster];
      }
      return clusters;
  }, [clusters, activeCluster]);

  // Guard React's key invariant at the render boundary. Every marker key comes
  // from `markerKey(cluster)`; if two entries ever collide — a server-clustering
  // regression, a fan-out introduced by a future filter join, or the
  // retained-cluster append above racing a refetch — React throws "two children
  // with the same key" and silently drops one marker. Dropping the later
  // duplicate keeps the map correct regardless of the source.
  const dedupedClusters = useMemo(() => {
    const seen = new Set<string>();
    const out: ClusterResponse[] = [];
    for (const c of displayClusters) {
      const key = markerKey(c);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(c);
    }
    return out.length === displayClusters.length ? displayClusters : out;
  }, [displayClusters]);

  // When the highlight comes from a SERP row whose building has no individual
  // pin (it's grouped into a cluster at this zoom), emphasise the containing
  // cluster instead. Resolve it by nearest screen-pixel distance to the point,
  // capped so we never light up a far-away cluster.
  const hoveredClusterId = useMemo(() => {
    if (!highlightedPoint || !map) return null;
    const hasIndividual = displayClusters.some(
      (c) => !c.is_cluster && String(c.id) === String(highlightedId)
    );
    if (hasIndividual) return null;

    const target = map.project([highlightedPoint.lng, highlightedPoint.lat]);
    let bestId: string | null = null;
    let bestDist = Infinity;
    for (const c of displayClusters) {
      if (!c.is_cluster) continue;
      const p = map.project([c.lng, c.lat]);
      const d = Math.hypot(p.x - target.x, p.y - target.y);
      if (d < bestDist) {
        bestDist = d;
        bestId = String(c.id);
      }
    }
    return bestDist <= 80 ? bestId : null;
  }, [highlightedPoint, highlightedId, displayClusters, map]);

  const markers = useMemo(
    () =>
      dedupedClusters.map((cluster) => {
        // Determine the unique key for the marker (deduped upstream).
        const key = markerKey(cluster);

        const isCluster = cluster.is_cluster;
        const buildingUrl = !isCluster ? getBuildingUrl(String(cluster.id), cluster.slug) : '#';

        let pinStyle = getPinStyle(cluster, { photographyGaps, mode });

        // Itinerary overrides
        const itinerarySequence = cluster.itinerary_sequence;
        const itineraryDayIndex = cluster.itinerary_day_index;

        if (itinerarySequence !== undefined && itineraryDayIndex !== undefined) {
             // Kit `.pin .num`: black face, white 2px ring, white numeral. The day is
             // carried by the route's opacity, not the marker's hue. Rebuild `classes`
             // rather than append — the tier's own `border-border-strong` would otherwise
             // race `border-white` in the stylesheet, since Tailwind resolves conflicts
             // by rule order, not by class-attribute order. The construction treatment
             // is the one modifier worth carrying over.
             const constructionModifier =
                 pinStyle.classes.match(/\b(?:opacity-50|border-dashed)\b/)?.[0] ?? '';
             pinStyle = {
                 ...pinStyle,
                 backgroundColor: MAP_MARKER_FILL.brandPrimary,
                 showContent: true,
                 classes: `border-white border-2 text-white font-bold text-sm shadow-xs ${constructionModifier}`.trim(),
                 zIndex: 100, // High priority but below hover
                 dots: 0, // The sequence numeral replaces any rating/saved mark
                 savedMark: false
             };
        }

        const isSelected = selectedId != null && String(selectedId) === String(cluster.id);
        const isClusterHovered =
          cluster.is_cluster && hoveredClusterId != null && String(cluster.id) === hoveredClusterId;
        const isHovered = String(highlightedId) === String(cluster.id) || isSelected || isClusterHovered;

        // Keep markers below map chrome (e.g. CollectionMapGL / PlanoMap overlays at z-40–z-60)
        // while preserving tier ordering (5 < 20 < 100 → capped relative ranks).
        const MAP_MARKER_Z_MAX = 38;
        const MAP_MARKER_Z_HOVER = 39;
        const finalZIndex = isHovered
          ? MAP_MARKER_Z_HOVER
          : Math.min(pinStyle.zIndex, MAP_MARKER_Z_MAX);

        // Icon logic for custom markers (Google primary type refines dining/transport/etc.)
        let MarkerIcon: React.ComponentType<{ className?: string }> | null = null;
        if (cluster.is_custom_marker && cluster.marker_category) {
          MarkerIcon = getCollectionMarkerLucideIcon(
            cluster.marker_category as CollectionMarkerCategory,
            cluster.marker_google_primary_type,
          );
        }

        const content = (
          <MapPin
              style={pinStyle}
              isHovered={isHovered}
          >
              {/* Logic for children */}
              {cluster.is_cluster ? (
                  <span>{cluster.count}</span>
              ) : (
                  MarkerIcon ? (
                     <MarkerIcon className="w-3.5 h-3.5 text-white" />
                  ) : itinerarySequence !== undefined ? (
                      <span>{itinerarySequence}</span>
                  ) : (
                      pinStyle.showContent && (
                        /* Rating dots / saved marks are rendered by MapPin from
                           the PinStyle itself; the children slot only carries
                           the candidate dot. */
                        cluster.is_candidate ? (
                            <div
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: MAP_MARKER_FILL.brandPrimary }}
                            />
                        ) : null
                      )
                  )
              )}
          </MapPin>
        );

        // Wrap non-cluster content with mouse handlers for hover effect
        const interactiveContent = (
          <div
            onMouseEnter={() => !isCluster && handleMouseEnter(String(cluster.id))}
            onMouseLeave={() => !isCluster && handleMouseLeave()}
            className={cn("cursor-pointer", isMobile && "p-2 -m-2")}
          >
            {content}
          </div>
        );

        return (
          <Marker
            key={key}
            longitude={cluster.lng}
            latitude={cluster.lat}
            style={{ zIndex: finalZIndex }}
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              if (cluster.is_cluster) {
                const expansionZoom = Math.min(
                  (map?.getZoom() || 0) + 2,
                  20
                );

                map?.flyTo({
                  center: [cluster.lng, cluster.lat],
                  zoom: expansionZoom,
                  duration: 500,
                });
              }
            }}
          >
            {isCluster ? (
                interactiveContent
            ) : onSelectBuilding ? (
                <button
                  type="button"
                  className={cn("block text-inherit cursor-pointer", isMobile && "p-2 -m-2")}
                  aria-label={`View details for ${cluster.name || 'Building'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectBuilding(cluster);
                  }}
                  onMouseEnter={() => handleMouseEnter(String(cluster.id))}
                  onMouseLeave={() => handleMouseLeave()}
                >
                  {content}
                </button>
            ) : (
                <a
                  href={buildingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn("block text-inherit no-underline", isMobile && "p-2 -m-2")}
                  aria-label={`View details for ${cluster.name || 'Building'}`}
                  onClick={(e) => {
                      // If it's a custom marker, prevent navigation and just select (highlight)
                      if (cluster.is_custom_marker) {
                          e.preventDefault();
                          handleMouseEnter(String(cluster.id));
                          return;
                      }

                      // On first tap/click, if not already highlighted, prevent navigation and show popup
                      if (String(highlightedId) !== String(cluster.id)) {
                          e.preventDefault();
                          handleMouseEnter(String(cluster.id));
                      }
                  }}
                  onMouseEnter={() => handleMouseEnter(String(cluster.id))}
                  onMouseLeave={() => handleMouseLeave()}
                >
                    {content}
                </a>
            )}
          </Marker>
        );
      }),
    [dedupedClusters, map, handleMouseEnter, handleMouseLeave, highlightedId, hoveredClusterId, selectedId, onSelectBuilding, isMobile, photographyGaps, mode]
  );

  return (
    <>
      {markers}
      {/* Inline hover popup/drawer — only when NOT in selection mode (the search
          map renders its own BuildingDetailDrawer driven by selectedId instead). */}
      {!onSelectBuilding && activeCluster && (
        isMobile ? (
          <Drawer open={!!activeCluster} onOpenChange={(open) => !open && setHighlightedId(null)}>
            <DrawerContent className="border-none">
              <div className="overflow-y-auto max-h-[70vh] pb-8">
                <BuildingPopupContent
                  cluster={activeCluster}
                  onRemoveFromCollection={onRemoveFromCollection}
                  onAddCandidate={onAddCandidate}
                  fullWidth
                />
              </div>
            </DrawerContent>
          </Drawer>
        ) : (
          <Popup
            longitude={activeCluster.lng}
            latitude={activeCluster.lat}
            offset={20}
            closeButton={false}
            closeOnClick={false}
            className="plano-map-popup z-100"
            maxWidth="300px"
          >
            <BuildingPopupContent
              cluster={activeCluster}
              onMouseEnter={() => handleMouseEnter(String(activeCluster.id))}
              onMouseLeave={handleMouseLeave}
              onRemoveFromCollection={onRemoveFromCollection}
              onAddCandidate={onAddCandidate}
            />
          </Popup>
        )
      )}
    </>
  );
}
