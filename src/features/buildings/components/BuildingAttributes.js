import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Building2, Activity, Hammer, Palette, Calendar, Map as MapIcon, Wrench, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
export const BuildingAttributes = ({ building, className, }) => {
    // Helper to check if a value is effectively empty
    const isEmpty = (val) => {
        if (val === null || val === undefined)
            return true;
        if (Array.isArray(val) && val.length === 0)
            return true;
        if (typeof val === 'string' && val.trim() === '')
            return true;
        return false;
    };
    // Helper to get formatted string from value
    const getFormattedValue = (val) => {
        if (Array.isArray(val)) {
            if (val.length === 0)
                return '';
            const isObjectArray = typeof val[0] === 'object' && val[0] !== null && 'name' in val[0];
            if (isObjectArray) {
                return val.map((item) => item.name).join(', ');
            }
            return val.join(', ');
        }
        return String(val);
    };
    const fields = [
        { key: 'year_completed', label: 'Year', icon: Calendar, value: building.year_completed?.toString() },
        { key: 'category', label: 'Category', icon: Tag, value: building.category },
        { key: 'typology', label: 'Typology', icon: Building2, value: building.typology },
        { key: 'context', label: 'Context', icon: MapIcon, value: building.context },
        { key: 'intervention', label: 'Intervention', icon: Wrench, value: building.intervention },
        { key: 'materials', label: 'Materials', icon: Hammer, value: building.materials },
        { key: 'styles', label: 'Styles', icon: Palette, value: building.styles },
        { key: 'status', label: 'Status', icon: Activity, value: building.status },
    ];
    // Filter out empty fields
    const activeFields = fields.filter(f => !isEmpty(f.value));
    if (activeFields.length === 0)
        return null;
    return (_jsx("dl", { className: cn("grid grid-cols-[120px_1fr] gap-y-3 gap-x-4 text-sm text-text-primary", className), children: activeFields.map((field) => {
            const value = field.value;
            const isMultiValue = Array.isArray(value) && value.length > 0;
            if (isMultiValue) {
                const items = value;
                const isObjectArray = typeof items[0] === "object" &&
                    items[0] !== null &&
                    "name" in items[0];
                const labels = isObjectArray
                    ? items.map((item) => item.name)
                    : items;
                return (_jsxs("div", { className: "contents", children: [_jsxs("dt", { className: "text-xs font-medium text-text-secondary uppercase tracking-wide flex items-center gap-1.5", children: [_jsx(field.icon, { className: "w-3.5 h-3.5" }), field.label] }), _jsx("dd", { className: "flex flex-wrap gap-2", children: labels.map((label) => (_jsx(Badge, { variant: "outline", className: "text-xs", children: label }, label))) })] }, field.key));
            }
            return (_jsxs("div", { className: "contents", children: [_jsxs("dt", { className: "text-xs font-medium text-text-secondary uppercase tracking-wide flex items-center gap-1.5", children: [_jsx(field.icon, { className: "w-3.5 h-3.5" }), field.label] }), _jsx("dd", { children: getFormattedValue(field.value) })] }, field.key));
        }) }));
};
