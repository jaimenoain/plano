/**
 * Public surface of the maps feature.
 *
 * Other features import from here, never from `@/features/maps/<internal path>` —
 * see the `no-restricted-imports` deep-feature rule in `eslint.config.js`.
 */
export { MAP_MARKER_FILL } from "./constants/mapMarkerFills";
export { BuildingListRow } from "./components/BuildingListRow";
export { PlanoMap } from "./components/PlanoMap";
export { MapProvider, useMapContext, useOptionalMapContext } from "./providers/MapContext";
export type { ClusterResponse } from "./hooks/useMapData";
