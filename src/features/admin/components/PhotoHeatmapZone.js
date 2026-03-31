import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import Map, { Source, Layer } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
const CIRCLE_LAYER = {
    id: 'heatmap-circles',
    type: 'circle',
    minzoom: 0, // Allow at all zooms since heatmap is gone
    paint: {
        'circle-radius': 6,
        'circle-color': '#FF0000',
        'circle-stroke-color': 'white',
        'circle-stroke-width': 1,
        'circle-opacity': 1
    }
};
export function PhotoHeatmapZone({ data }) {
    const geoJsonData = useMemo(() => {
        return {
            type: 'FeatureCollection',
            features: data.map(point => ({
                type: 'Feature',
                properties: { weight: point.weight },
                geometry: {
                    type: 'Point',
                    coordinates: [point.lng, point.lat]
                }
            }))
        };
    }, [data]);
    return (_jsxs(Card, { className: "col-span-4", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Global Photo Distribution (Static)" }) }), _jsx(CardContent, { className: "h-[500px] p-0 overflow-hidden rounded-b-lg relative", children: _jsx(Map, { initialViewState: {
                        latitude: 20,
                        longitude: 0,
                        zoom: 1.5
                    }, style: { width: '100%', height: '100%' }, mapStyle: "https://tiles.openfreemap.org/styles/positron", mapLib: maplibregl, attributionControl: false, children: _jsx(Source, { type: "geojson", data: geoJsonData, children: _jsx(Layer, { ...CIRCLE_LAYER }) }) }) })] }));
}
