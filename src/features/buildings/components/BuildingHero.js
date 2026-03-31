import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
export function BuildingHero({ src, alt, className }) {
    if (!src)
        return null;
    return (_jsxs("div", { className: cn("relative w-full overflow-hidden animate-in fade-in duration-700", className), children: [_jsx("img", { src: src, alt: alt, className: "w-full aspect-[16/9] md:aspect-[21/9] object-cover rounded-sm transition-opacity duration-700 ease-in-out" }), _jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-black/60 /* Photo overlay \u2014 bg-black/60 approved per COMPONENT_SPEC \u00A78 backdrop convention */ via-transparent to-transparent pointer-events-none opacity-50" })] }));
}
