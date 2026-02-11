import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Marker, useMap, Popup } from 'react-map-gl';
import { ClusterResponse } from '../hooks/useMapData';
import { BuildingPopupContent } from './BuildingPopupContent';
import '../../../App.css';

interface MapMarkersProps {
  clusters: ClusterResponse[];
  highlightedId?: string | null;
  setHighlightedId: (id: string | null) => void;
  onRemoveFromCollection?: (id: string) => void;
  onAddCandidate?: (id: string) => void;
}

export function MapMarkers({
  clusters,
  highlightedId,
  setHighlightedId,
  onRemoveFromCollection,
  onAddCandidate
}: MapMarkersProps) {
  const { current: map } = useMap();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    if (!highlightedId || !clusters.length) return null;

    const found = clusters.find(c =>
      !c.is_cluster && // Only single items
      String(c.id) === String(highlightedId) // Match the ID directly (ensure string comparison)
    );

    return found || null;
  }, [clusters, highlightedId]);

  const markers = useMemo(
    () =>
      clusters.map((cluster) => {
        // Determine the unique key for the marker
        const key = cluster.is_cluster
          ? `cluster-${cluster.id}-${cluster.count}`
          : `marker-${cluster.id}`;

        const isCluster = cluster.is_cluster;
        const buildingUrl = !isCluster ? (cluster.slug ? `/building/${cluster.slug}` : `/building/${cluster.id}`) : '#';

        // Determine hierarchy properties
        let zIndex = isCluster ? 10 : 1;
        let tierClass = '';

        if (!isCluster) {
          if (cluster.tier_rank === 'Top 1%') {
            zIndex = 100;
            tierClass = 'marker-halo-gold';
          } else if (cluster.tier_rank === 'Top 5%') {
            zIndex = 50;
            tierClass = 'marker-halo-silver';
          } else {
            tierClass = 'marker-standard';
          }
        }

        const content = (
            <div
              className={`
                flex items-center justify-center rounded-full border border-white shadow-md
                ${isCluster
                  ? 'bg-primary text-primary-foreground font-bold transition-all hover:scale-110'
                  : `bg-background text-foreground ${tierClass}`
                }
              `}
              style={{
                width: isCluster
                  ? cluster.count > 1000
                    ? '64px'
                    : cluster.count > 100
                      ? '48px'
                      : '32px'
                  : '32px',
                height: isCluster
                  ? cluster.count > 1000
                    ? '64px'
                    : cluster.count > 100
                      ? '48px'
                      : '32px'
                  : '32px',
              }}
              onMouseEnter={() => !isCluster && handleMouseEnter(String(cluster.id))}
              onMouseLeave={() => !isCluster && handleMouseLeave()}
              data-testid={isCluster ? "map-marker-cluster" : "map-marker-building"}
            >
              {isCluster ? (
                cluster.count
              ) : (
                <div className="flex flex-col items-center justify-center text-[10px] font-medium leading-none">
                   {/* Show rating if available, otherwise a generic icon */}
                   {cluster.rating && cluster.rating > 0 ? (
                      <span>{cluster.rating.toFixed(1)}</span>
                   ) : (
                      <div className={`h-2 w-2 rounded-full ${cluster.is_candidate ? 'bg-yellow-500' : 'bg-foreground'}`} />
                   )}
                </div>
              )}
            </div>
        );

        return (
          <Marker
            key={key}
            longitude={cluster.lng}
            latitude={cluster.lat}
            style={{ zIndex }}
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
                content
            ) : (
                <a
                  href={buildingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-inherit no-underline"
                  aria-label={`View details for ${cluster.name || 'Building'}`}
                  onClick={(e) => {
                      // If it's a custom marker, prevent navigation and just select (highlight)
                      if (cluster.is_custom_marker) {
                          e.preventDefault();
                          handleMouseEnter(String(cluster.id));
                      }
                  }}
                >
                    {content}
                </a>
            )}
          </Marker>
        );
      }),
    [clusters, map, handleMouseEnter, handleMouseLeave]
  );

  return (
    <>
      {markers}
      {activeCluster && (
        <Popup
          longitude={activeCluster.lng}
          latitude={activeCluster.lat}
          offset={20}
          closeButton={false}
          closeOnClick={false}
          className="z-[100] map-popup-test"
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
      )}
    </>
  );
}
