import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useArchitectPortfolio } from "../hooks/useArchitectPortfolio";
import { Skeleton } from "@/components/ui/skeleton";
import { PortfolioBuildingCard } from "./PortfolioBuildingCard";
import { getBuildingImageUrl } from "@/utils/image";
export function ArchitectPortfolio({ architectId, isOwnProfile }) {
    const { buildings, isLoading } = useArchitectPortfolio(architectId);
    return (_jsxs("div", { className: "py-6", children: [_jsx("h3", { className: "text-xl font-semibold mb-6", children: "Portfolio" }), isLoading ? (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: Array.from({ length: 6 }).map((_, i) => (_jsx(Skeleton, { className: "h-[200px] rounded-xl w-full" }, i))) })) : buildings.length === 0 ? (_jsx("div", { className: "py-12 text-center border rounded-xl bg-surface-muted/10", children: _jsx("p", { className: "text-text-secondary", children: "System recognizes you as a verified architect, but no buildings were found in your portfolio." }) })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: buildings.map((building) => {
                    // Map PortfolioBuilding to SmartBuilding expected format for a premium visual grid
                    let main_image_url = null;
                    const selectedImage = building.hero_image_url || building.community_preview_url;
                    if (selectedImage) {
                        if (selectedImage.startsWith('http')) {
                            main_image_url = selectedImage;
                        }
                        else {
                            main_image_url = getBuildingImageUrl(selectedImage);
                        }
                    }
                    const mappedBuilding = {
                        id: building.id,
                        name: building.name,
                        main_image_url: main_image_url ?? null,
                        year_completed: building.year_completed,
                        architects: null,
                    };
                    return (_jsx("div", { className: "min-w-0 flex flex-col", children: _jsx(PortfolioBuildingCard, { building: mappedBuilding, hideBucketListButton: isOwnProfile }) }, building.id));
                }) }))] }));
}
