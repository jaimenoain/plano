import { jsx as _jsx } from "react/jsx-runtime";
import { FilterDrawer } from './FilterDrawer';
export function MapControls() {
    return (_jsx("div", { className: "pointer-events-auto flex items-center gap-2", children: _jsx(FilterDrawer, {}) }));
}
