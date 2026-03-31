import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { cn } from "@/lib/utils";
export function AppLayout({ children, title, variant, searchBar, leftAction, rightAction, showLogo = true, showNav = true, showBack = false, headerAction, isFullScreen = false, showHeader = true, fullWidth = false }) {
    void fullWidth;
    return (_jsxs(_Fragment, { children: [showHeader && (_jsx("div", { className: "md:hidden", children: _jsx(Header, { title: title, variant: variant, searchBar: searchBar, leftAction: leftAction, rightAction: rightAction, showLogo: showLogo, showBack: showBack, action: headerAction }) })), _jsx("div", { className: cn(showHeader && "pt-16 md:pt-0", "w-full min-w-0", isFullScreen && "h-full flex flex-col flex-1", showNav && "pb-20 md:pb-0"), children: children }), showNav && (_jsx("div", { className: "md:hidden", children: _jsx(BottomNav, {}) }))] }));
}
