import React from 'react';
import { PinStyle } from '../utils/pinStyling';
import { MAP_MARKER_SHADOW } from '../constants/mapMarkerFills';

interface MapPinProps {
  style: PinStyle;
  children?: React.ReactNode;
  isHovered: boolean;
}

export const MapPin: React.FC<MapPinProps> = ({ style, children, isHovered }) => {
  const isPinShape = style.shape === 'pin';

  // Apply rotation for pin shape (teardrop)
  // We use rounded-br-none to make one corner sharp, then rotate 45deg so it points down.
  const shapeClasses = isPinShape
    ? 'rounded-full rounded-br-none rotate-45'
    : 'rounded-full';

  // Apply scale, z-index and a soft shadow on hover so the pin (or cluster) pops
  // against a dense map — used for both direct pin-hover and SERP-row hover.
  const hoverClasses = isHovered ? 'scale-[1.3] z-50 drop-shadow-md' : '';

  const containerStyle: React.CSSProperties = {
    width: `${style.size}px`,
    height: `${style.size}px`,
    // The edge that separates a white pin from the pale basemap. Inline, because the
    // marker is portaled and because .ds-rollout strips the shadow-* utilities.
    boxShadow: MAP_MARKER_SHADOW,
  };
  if (style.backgroundColor) {
    containerStyle.backgroundColor = style.backgroundColor;
  }
  if (style.opacity < 1) {
    containerStyle.opacity = style.opacity;
  }

  return (
    <div
      className={`
        relative flex items-center justify-center
        transition-[transform,filter] duration-150 ease-out
        ${style.ringClasses}
        ${style.classes}
        ${shapeClasses}
        ${hoverClasses}
      `}
      style={containerStyle}
      data-testid="map-pin-container"
    >
      {/* Inner Content Wrapper */}
      {/* Counter-rotate if it's a pin shape so content stays upright */}
      <div
        className={`
          flex items-center justify-center w-full h-full
          ${isPinShape ? '-rotate-45' : ''}
        `}
      >
        {/* Personal code: the user's award dots (1–3), the same visual language
            as RatingDots — inline fill so it paints inside the MapLibre portal. */}
        {style.dots > 0 ? (
          <div
            className="absolute flex items-center justify-center gap-[2px]"
            data-testid="map-pin-dots"
          >
            {Array.from({ length: style.dots }).map((_, i) => (
              <div
                key={i}
                className="h-[3px] w-[3px] rounded-full"
                style={{ backgroundColor: style.innerMarkColor }}
              />
            ))}
          </div>
        ) : style.savedMark ? (
          /* Global code: subtle centre dot = "in your library" */
          <div
            className="absolute h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: style.innerMarkColor }}
            data-testid="map-pin-saved-mark"
          />
        ) : null}

        {/* Content */}
        <div className="z-10 relative">
          {children}
        </div>
      </div>
    </div>
  );
};
