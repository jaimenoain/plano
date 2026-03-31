import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const MapPin = ({ style, children, isHovered }) => {
    const isPinShape = style.shape === 'pin';
    // Apply rotation for pin shape (teardrop)
    // We use rounded-br-none to make one corner sharp, then rotate 45deg so it points down.
    const shapeClasses = isPinShape
        ? 'rounded-full rounded-br-none rotate-45'
        : 'rounded-full';
    // Apply scale and z-index on hover
    const hoverClasses = isHovered ? 'scale-125 z-50' : '';
    return (_jsxs("div", { className: `
        relative flex items-center justify-center
        transition-transform duration-300 ease-out
        ${style.classes}
        ${shapeClasses}
        ${hoverClasses}
      `, style: {
            width: `${style.size}px`,
            height: `${style.size}px`,
            backgroundColor: style.backgroundColor,
        }, "data-testid": "map-pin-container", children: [style.tier === 'S' && (_jsx("div", { className: "absolute inset-0 -z-10 animate-ping-large-slow rounded-full bg-lime-high opacity-30", "data-testid": "map-pin-pulse" })), _jsxs("div", { className: `
          flex items-center justify-center w-full h-full
          ${isPinShape ? '-rotate-45' : ''}
        `, children: [style.showDot && (_jsx("div", { className: "absolute h-2 w-2 rounded-full bg-lime-high", "data-testid": "map-pin-dot" })), _jsx("div", { className: "z-10 relative", children: children })] })] }));
};
