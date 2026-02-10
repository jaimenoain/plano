import { useMemo, useState } from 'react';
import { Marker, useMap, Popup } from 'react-map-gl';
import { ClusterResponse } from '../hooks/useMapData';
import { getBuildingImageUrl } from '@/utils/image';

interface MapMarkersProps {
  clusters: ClusterResponse[];
  highlightedId?: string | null;
}

export function MapMarkers({ clusters, highlightedId }: MapMarkersProps) {
  const { current: map } = useMap();

  // Find the active cluster based on the highlightedId
  const activeCluster = useMemo(() => {
    if (!highlightedId || !clusters.length) return null;

    const found = clusters.find(c =>
      !c.is_cluster && // Only single items
      c.id === highlightedId // Match the ID directly
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

        return (
          <Marker
            key={key}
            longitude={cluster.lng}
            latitude={cluster.lat}
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
              } else {
                if (cluster.slug) {
                    window.location.href = `/building/${cluster.slug}`;
                } else if (cluster.id) {
                    window.location.href = `/building/${cluster.id}`;
                }
              }
            }}
          >
            <div
              className={`
                flex items-center justify-center rounded-full border border-white shadow-md transition-all hover:scale-110
                ${cluster.is_cluster
                  ? 'bg-primary text-primary-foreground font-bold'
                  : 'bg-background text-foreground'
                }
              `}
              style={{
                width: cluster.is_cluster ? `${30 + (cluster.count || 0) * 2}px` : '32px',
                height: cluster.is_cluster ? `${30 + (cluster.count || 0) * 2}px` : '32px',
                maxWidth: '60px',
                maxHeight: '60px',
              }}
            >
              {cluster.is_cluster ? (
                cluster.count
              ) : (
                <div className="flex flex-col items-center justify-center text-[10px] font-medium leading-none">
                   {/* Show rating if available, otherwise a generic icon */}
                   {cluster.rating && cluster.rating > 0 ? (
                      <span>{cluster.rating.toFixed(1)}</span>
                   ) : (
                      <div className="h-2 w-2 rounded-full bg-foreground" />
                   )}
                </div>
              )}
            </div>
          </Marker>
        );
      }),
    [clusters, map]
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
          maxWidth="220px"
        >
          <div className="flex flex-col overflow-hidden rounded-md bg-background shadow-lg">
            {/* Image */}
            <div className="relative h-24 w-full bg-muted">
                {activeCluster.image_url ? (
                    <img
                        src={getBuildingImageUrl(activeCluster.image_url)}
                        alt={activeCluster.name || 'Building'}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        No Image
                    </div>
                )}
            </div>
            {/* Content */}
            {activeCluster.name ? (
                <div className="p-2">
                    <h3 className="text-sm font-semibold line-clamp-2">{activeCluster.name}</h3>
                </div>
            ) : (
                <div className="px-3 py-2">
                    <span className="text-xs text-muted-foreground">Loading details...</span>
                </div>
            )}
          </div>
        </Popup>
      )}
    </>
  );
}
