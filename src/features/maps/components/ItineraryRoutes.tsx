import { useMemo, useState, useEffect } from 'react';
import { Source, Layer, useMap } from 'react-map-gl';
import { useItineraryStore } from '@/features/itinerary/stores/useItineraryStore';
import { DAY_COLORS } from '@/features/maps/constants';

export function ItineraryRoutes() {
  const days = useItineraryStore((state) => state.days);
  const { current: map } = useMap();
  const [firstSymbolId, setFirstSymbolId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!map) return;

    const findFirstSymbolLayer = () => {
        const style = map.getStyle();
        if (!style || !style.layers) return;

        const labelLayer = style.layers.find(layer => layer.type === 'symbol');
        if (labelLayer) {
            setFirstSymbolId(labelLayer.id);
        }
    };

    if (map.isStyleLoaded()) {
        findFirstSymbolLayer();
    }

    const onStyleLoad = () => findFirstSymbolLayer();
    map.on('style.load', onStyleLoad);

    return () => {
        map.off('style.load', onStyleLoad);
    };
  }, [map]);

  const routes = useMemo(() => {
    return days.map((day, index) => {
      if (!day.routeGeometry) return null;

      const color = DAY_COLORS[index % DAY_COLORS.length];
      const isFallback = day.isFallback;

      return (
        <Source
          key={`route-source-${day.dayNumber}`}
          id={`route-source-${day.dayNumber}`}
          type="geojson"
          data={day.routeGeometry}
        >
          <Layer
            id={`route-layer-${day.dayNumber}`}
            type="line"
            beforeId={firstSymbolId}
            layout={{
              'line-join': 'round',
              'line-cap': 'round',
            }}
            paint={{
              'line-color': color,
              'line-width': 4,
              'line-dasharray': isFallback ? [2, 2] : undefined,
            }}
          />
        </Source>
      );
    });
  }, [days, firstSymbolId]);

  return <>{routes}</>;
}
