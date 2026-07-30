import React from 'react';
import { MapPin } from './MapPin';
import type { PinStyle } from '../utils/pinStyling';
import { ClusterResponse } from '../hooks/useMapData';
import { MAP_MARKER_FILL } from '../constants/mapMarkerFills';
import { resolveCollectionMarkerIcon } from '@/features/collections/markerPlaceDisplay';
import type { CollectionMarkerCategory } from '@/features/collections/types';

interface MapMarkerFaceProps {
  cluster: ClusterResponse;
  style: PinStyle;
  isHovered: boolean;
  /** Set on itinerary stops — the numeral outranks every other mark. */
  itinerarySequence?: number;
}

/**
 * What a pin carries on its face, in priority order: a cluster count, the
 * place's own category glyph, an itinerary numeral, a quiet dot for a place we
 * cannot classify, or the candidate dot. Rating dots and saved marks are not
 * here — they live on the PinStyle and are drawn by MapPin itself.
 */
export const MapMarkerFace: React.FC<MapMarkerFaceProps> = ({
  cluster,
  style,
  isHovered,
  itinerarySequence,
}) => {
  // Google primary type refines the category (dining → cafe, transport → train).
  // Stays null when the place kind is unknown: the pin shell already says "a
  // place", so a generic pin glyph would only draw a pin inside a pin.
  const MarkerIcon: React.ComponentType<{ className?: string }> | null =
    cluster.is_custom_marker && cluster.marker_category
      ? resolveCollectionMarkerIcon(
          cluster.marker_category as CollectionMarkerCategory,
          cluster.marker_google_primary_type,
        )
      : null;

  return (
    <MapPin style={style} isHovered={isHovered}>
      {cluster.is_cluster ? (
        <span>{cluster.count}</span>
      ) : MarkerIcon ? (
        <span style={{ color: style.innerMarkColor }}>
          <MarkerIcon className="w-3.5 h-3.5" />
        </span>
      ) : itinerarySequence !== undefined ? (
        <span>{itinerarySequence}</span>
      ) : cluster.is_custom_marker ? (
        /* An unclassified place: the quietest mark we have, so the pin still
           reads as a place rather than as a building. */
        <div
          className="h-[5px] w-[5px] shrink-0 rounded-full"
          style={{ backgroundColor: style.innerMarkColor }}
          data-testid="map-pin-generic-mark"
        />
      ) : (
        style.showContent &&
        (cluster.is_candidate ? (
          <div
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: MAP_MARKER_FILL.brandPrimary }}
          />
        ) : null)
      )}
    </MapPin>
  );
};
