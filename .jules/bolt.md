## 2025-03-11 - React.memo on Map Pins
**Learning:** React maps that render numerous markers often suffer from performance issues if the individual markers are not memoized. In `MapMarkers`, `MapPin` is rendered hundreds of times, and whenever the map state changes (hovering over a cluster), all `MapPin` instances re-render unless `React.memo` is used.
**Action:** Always consider `React.memo` for components rendered inside arrays, especially in high-frequency update components like Maps.
