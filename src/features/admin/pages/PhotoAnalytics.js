import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { fetchPhotoHeatmapData } from "@/features/admin/api/admin";
import { PhotoHeatmapZone } from "@/features/admin/components/PhotoHeatmapZone";
import { NoPhotosMapZone } from "@/features/admin/components/NoPhotosMapZone";
import { BottomNav } from "@/components/layout/BottomNav";
export default function PhotoAnalytics() {
    const [heatmapData, setHeatmapData] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await fetchPhotoHeatmapData();
                setHeatmapData(data);
            }
            catch (_error) {
            }
            finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);
    if (loading) {
        return (_jsx("div", { className: "min-h-screen bg-surface-default flex items-center justify-center", children: _jsx("p", { className: "text-text-secondary", children: "Loading analytics..." }) }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-surface-default pb-20", children: [_jsxs("div", { className: "container py-8 space-y-8", children: [_jsx("div", { className: "flex items-center justify-between", children: _jsx("h1", { className: "text-3xl font-bold", children: "Photo Analytics" }) }), _jsxs("div", { className: "space-y-4", children: [_jsx("section", { className: "space-y-4", children: _jsx(PhotoHeatmapZone, { data: heatmapData || [] }) }), _jsx("section", { className: "space-y-4", children: _jsx(NoPhotosMapZone, {}) })] })] }), _jsx(BottomNav, {})] }));
}
