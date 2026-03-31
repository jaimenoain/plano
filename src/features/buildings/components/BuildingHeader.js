import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PopularityBadge } from "./PopularityBadge";
import { getBuildingUrl } from "@/utils/url";
import { synthesizeAccess } from "@/utils/accessSynthesis";
import { BuildingAttributes } from "./BuildingAttributes";
export const BuildingHeader = ({ building, showEditLink, className, isEditing, nameValue, yearValue, onNameChange, onYearChange }) => {
    const accessSynthesis = building.access_level || building.access_logistics || building.access_cost
        ? synthesizeAccess(building.access_level || null, building.access_logistics || null, building.access_cost || null)
        : null;
    const accessBadgeVariant = () => {
        const level = building.access_level;
        if (level === "public")
            return "success";
        if (level === "commercial")
            return "brand";
        if (level === "private" || level === "restricted")
            return "warning";
        if (accessSynthesis?.variant === "warning")
            return "warning";
        if (accessSynthesis?.variant === "outline")
            return "brand";
        return "default";
    };
    return (_jsxs("div", { className: `${className || ""} group`, children: [_jsx("div", { className: "flex justify-between items-start gap-4", children: _jsxs("div", { className: "flex flex-col items-start gap-2 mb-2 w-full min-w-0", children: [_jsx(PopularityBadge, { rank: building.tier_rank, city: building.city }), isEditing ? (_jsx(Input, { value: nameValue, onChange: (e) => onNameChange?.(e.target.value), className: "text-3xl md:text-4xl font-bold tracking-tight leading-tight h-auto px-3 py-2 w-full max-w-md", placeholder: "Official Building Name" })) : (_jsx("h1", { className: "text-3xl md:text-4xl font-bold tracking-tight leading-tight text-text-primary", children: building.name })), building.alt_name && building.alt_name !== building.name && !isEditing && (_jsx("p", { className: "text-lg text-text-secondary mt-1", children: building.alt_name }))] }) }), _jsxs("div", { className: "flex flex-wrap gap-4 text-sm text-text-secondary items-center mt-2", children: [isEditing && (_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx(Calendar, { className: "w-4 h-4 text-text-secondary" }), _jsx(Input, { type: "number", value: yearValue, onChange: (e) => onYearChange?.(parseInt(e.target.value)), className: "w-24 max-w-[8rem] h-8 text-sm", placeholder: "Year" })] })), (building.architects && building.architects.length > 0) && (_jsx("div", { className: "flex flex-wrap items-center gap-1.5", children: building.architects.map((arch, i) => (_jsxs("span", { children: [_jsx(Link, { to: `/architect/${arch.id}`, className: "hover:underline text-brand-primary", children: arch.name }), i < building.architects.length - 1 && ", "] }, arch.id))) }))] }), !isEditing && _jsx(BuildingAttributes, { building: building, className: "mt-4" }), (accessSynthesis || building.access_notes) && (_jsxs("div", { className: "flex flex-col gap-2 mt-4", children: [accessSynthesis && (_jsx("div", { className: "flex items-center gap-2", children: _jsxs(Badge, { variant: accessBadgeVariant(), className: "flex items-center gap-1.5 w-fit", children: [_jsx(accessSynthesis.icon, { className: "w-3.5 h-3.5" }), accessSynthesis.label] }) })), building.access_notes && (_jsx("div", { className: "text-sm text-text-secondary border-l-2 border-brand-primary/20 pl-3 py-0.5 bg-surface-muted/30 rounded-sm", children: building.access_notes }))] })), showEditLink && !isEditing && (_jsx("div", { className: "mt-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200", children: _jsx(Link, { to: getBuildingUrl(building.id, building.slug, building.short_id) + "/edit", className: "text-xs text-text-secondary hover:underline", children: "Edit building information" }) }))] }));
};
