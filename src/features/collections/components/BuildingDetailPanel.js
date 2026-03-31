import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useBuildingImages } from "@/features/buildings";
import { getBuildingImageUrl } from "@/utils/image";
import { ExternalLink, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { BuildingAttributes } from "@/features/buildings/components/BuildingAttributes";
export function BuildingDetailPanel({ building }) {
    const { data: images } = useBuildingImages(building.id);
    const allImages = [];
    if (building.hero_image_url) {
        allImages.push({ id: 'hero', url: building.hero_image_url });
    }
    if (images) {
        images.forEach(img => {
            const url = getBuildingImageUrl(img.storage_path);
            if (url !== building.hero_image_url) {
                allImages.push({ id: img.id, url });
            }
        });
    }
    return (_jsx("div", { className: "flex-1 border-l h-full flex flex-col bg-surface-default min-w-0", children: _jsxs("div", { className: "p-6 space-y-6 overflow-y-auto h-full", children: [_jsxs("div", { children: [_jsxs(Link, { to: `/building/${building.slug || building.id}`, target: "_blank", className: "group flex items-start gap-2 hover:text-brand-primary transition-colors", children: [_jsx("h2", { className: "text-xl font-semibold leading-tight", children: building.name }), _jsx(ExternalLink, { className: "h-5 w-5 opacity-50 group-hover:opacity-100 shrink-0 mt-0.5" })] }), _jsxs("div", { className: "flex items-center text-text-secondary text-sm mt-2", children: [_jsx(MapPin, { className: "h-4 w-4 mr-1" }), _jsx("span", { children: building.city && building.country
                                        ? `${building.city}, ${building.country}`
                                        : "Unknown location" })] })] }), allImages.length > 0 ? (_jsxs(Carousel, { className: "w-full", children: [_jsx(CarouselContent, { children: allImages.map((img) => (_jsx(CarouselItem, { children: _jsx(Link, { to: `/building/${building.slug || building.id}`, target: "_blank", className: "block aspect-square relative overflow-hidden rounded-md border bg-surface-muted group cursor-pointer", children: _jsx("img", { src: img.url, alt: building.name, className: "object-cover w-full h-full transition-transform duration-300 group-hover:scale-105" }) }) }, img.id))) }), allImages.length > 1 && (_jsxs(_Fragment, { children: [_jsx(CarouselPrevious, { className: "left-2" }), _jsx(CarouselNext, { className: "right-2" })] }))] })) : (_jsx("div", { className: "aspect-square rounded-md border bg-surface-muted flex items-center justify-center text-text-secondary", children: "No images available" })), _jsx(BuildingAttributes, { building: building, className: "grid-cols-2" })] }) }));
}
