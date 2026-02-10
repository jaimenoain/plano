import { useMemo } from 'react';
import { Marker, useMap } from 'react-map-gl';
import { ClusterResponse } from '../hooks/useMapData';

interface MapMarkersProps {
  clusters: ClusterResponse[];
  highlightedId?: string | null;
}

export function MapMarkers({ clusters, highlightedId }: MapMarkersProps) {
  const { current: map } = useMap();

  const markers = useMemo(() => {
    return clusters.map((cluster) => {
      // Handle Cluster
      if (cluster.is_cluster) {
        return (
          <Marker
            key={`cluster-${cluster.id}`}
            longitude={cluster.lng}
            latitude={cluster.lat}
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              if (map) {
                map.flyTo({ center: [cluster.lng, cluster.lat], zoom: map.getZoom() + 2 });
              }
            }}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-xs font-bold shadow-sm cursor-pointer hover:bg-gray-50 transition-colors">
              {cluster.count}
            </div>
          </Marker>
        );
      }

      // Check if highlighted
      const isHighlighted = highlightedId && String(cluster.id) === highlightedId;
      const highlightClass = isHighlighted ? 'scale-125 z-50 ring-2 ring-primary ring-offset-2' : '';
      const transitionClass = 'transition-all duration-300 ease-in-out';

      // Handle Individual Building (Rating Scale)
      const rating = cluster.rating ?? 0;
      let markerContent;

      switch (rating) {
        case 3: // Special Journey: Gold, pulsating
          markerContent = (
            <div className={`h-8 w-8 animate-pulse rounded-full border-2 border-white bg-[#FFD700] shadow-lg ${highlightClass} ${transitionClass}`} />
          );
          break;
        case 2: // Worth Detour: Silver
          markerContent = (
            <div className={`h-6 w-6 rounded-full border-2 border-white bg-[#C0C0C0] shadow-md ${highlightClass} ${transitionClass}`} />
          );
          break;
        case 1: // Interesting: Bronze
          markerContent = (
            <div className={`h-4 w-4 rounded-full border border-white bg-[#CD7F32] shadow-sm ${highlightClass} ${transitionClass}`} />
          );
          break;
        default: // Standard (0 or null): Grey dot
          markerContent = (
            <div className={`h-2 w-2 rounded-full bg-gray-500/50 ${highlightClass} ${transitionClass}`} />
          );
          break;
      }

      return (
        <Marker
          key={`building-${cluster.id}`}
          longitude={cluster.lng}
          latitude={cluster.lat}
          style={{ cursor: 'pointer', zIndex: isHighlighted ? 50 : 'auto' }}
        >
          {markerContent}
        </Marker>
      );
    });
  }, [clusters, map, highlightedId]);

  return <>{markers}</>;
}
