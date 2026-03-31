import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBuildingImageUrl } from "@/utils/image";
export function ContentIntelligenceZone({ trendingBuildings }) {
    return (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Trending Buildings (Last 7 Days)" }) }), _jsx(CardContent, { children: _jsx("div", { className: "grid grid-cols-1 md:grid-cols-5 gap-4", children: trendingBuildings.map((building) => {
                        const imageUrl = getBuildingImageUrl(building.main_image_url);
                        return (_jsxs("div", { className: "flex flex-col items-center text-center space-y-2", children: [_jsx("div", { className: "relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-surface-muted", children: imageUrl ? (_jsx("img", { src: imageUrl, alt: building.name, className: "h-full w-full object-cover" })) : (_jsx("div", { className: "flex h-full items-center justify-center text-xs text-text-secondary", children: "No Image" })) }), _jsxs("div", { className: "space-y-1", children: [_jsx("p", { className: "text-sm font-medium leading-none line-clamp-2", children: building.name }), _jsxs("p", { className: "text-xs text-text-secondary", children: [building.visit_count, " interactions"] })] })] }, building.building_id));
                    }) }) })] }));
}
