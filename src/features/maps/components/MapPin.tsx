import React from 'react';
import { PinStyle } from '../utils/pinStyling';

interface MapPinProps {
  style: PinStyle;
  children?: React.ReactNode;
  isHovered: boolean;
}

export const MapPin = React.memo(function MapPin({ style, children, isHovered }: MapPinProps) {
  const isPinShape = style.shape === 'pin';

  // Apply rotation for pin shape (teardrop)
  // We use rounded-br-none to make one corner sharp, then rotate 45deg so it points down.
  const shapeClasses = isPinShape
    ? 'rounded-full rounded-br-none rotate-45'
    : 'rounded-full';

  // Apply scale and z-index on hover
  const hoverClasses = isHovered ? 'scale-125 z-50' : '';

  return (
    <div
      className={`
        relative flex items-center justify-center
        transition-transform duration-300 ease-out
        ${style.classes}
        ${shapeClasses}
        ${hoverClasses}
      `}
      style={{
        width: `${style.size}px`,
        height: `${style.size}px`,
        backgroundColor: style.backgroundColor,
      }}
      data-testid="map-pin-container"
    >
      {/* Pulse Effect (Tier S) */}
      {style.tier === 'S' && (
        <div
          className="absolute inset-0 -z-10 animate-ping-large-slow rounded-full bg-lime-high opacity-30"
          data-testid="map-pin-pulse"
        />
      )}

      {/* Inner Content Wrapper */}
      {/* Counter-rotate if it's a pin shape so content stays upright */}
      <div
        className={`
          flex items-center justify-center w-full h-full
          ${isPinShape ? '-rotate-45' : ''}
        `}
      >
        {/* Dot Decoration (Tier A) */}
        {style.showDot && (
          <div
            className="absolute h-2 w-2 rounded-full bg-lime-high"
            data-testid="map-pin-dot"
          />
        )}

        {/* Content */}
        <div className="z-10 relative">
          {children}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  if (prevProps.isHovered !== nextProps.isHovered) return false;
  if (prevProps.children !== nextProps.children) return false;

  // Shallow compare the style object
  const prevStyleKeys = Object.keys(prevProps.style) as Array<keyof typeof prevProps.style>;
  const nextStyleKeys = Object.keys(nextProps.style) as Array<keyof typeof nextProps.style>;

  if (prevStyleKeys.length !== nextStyleKeys.length) return false;

  for (const key of prevStyleKeys) {
    if (prevProps.style[key] !== nextProps.style[key]) {
      return false;
    }
  }

  return true;
});

MapPin.displayName = 'MapPin';
