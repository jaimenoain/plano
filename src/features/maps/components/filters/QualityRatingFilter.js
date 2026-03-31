import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Slider } from '@/components/ui/slider';
export function QualityRatingFilter({ value, onChange }) {
    return (_jsxs("div", { className: "w-full space-y-3", children: [_jsx(Slider, { defaultValue: [0], max: 3, step: 1, value: [value], onValueChange: (values) => onChange(values[0]), className: "w-full" }), _jsxs("div", { className: "flex justify-between text-xs text-text-secondary px-1", children: [_jsx("span", { children: "All" }), _jsx("span", { children: "\u25CF" }), _jsx("span", { children: "\u25CF\u25CF" }), _jsx("span", { children: "\u25CF\u25CF\u25CF" })] })] }));
}
