import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
export function CommonFollowersFacepile({ users, count }) {
    if (!users || users.length === 0)
        return null;
    let textContent;
    // Helper to wrap name
    const Name = ({ user }) => (_jsx("span", { className: "font-semibold text-text-primary", children: user.username }));
    if (count === 1) {
        textContent = _jsxs(_Fragment, { children: ["Followed by ", _jsx(Name, { user: users[0] })] });
    }
    else if (count === 2) {
        // Ensure we have 2 users
        if (users.length >= 2) {
            textContent = _jsxs(_Fragment, { children: ["Followed by ", _jsx(Name, { user: users[0] }), " and ", _jsx(Name, { user: users[1] })] });
        }
        else {
            // Fallback if data is missing
            textContent = _jsxs(_Fragment, { children: ["Followed by ", _jsx(Name, { user: users[0] }), " +1"] });
        }
    }
    else {
        // 3 or more
        if (users.length >= 2) {
            const remaining = count - 2;
            textContent = (_jsxs(_Fragment, { children: ["Followed by ", _jsx(Name, { user: users[0] }), ", ", _jsx(Name, { user: users[1] }), remaining > 0 && _jsxs("span", { className: "font-semibold text-text-primary", children: [" +", remaining] })] }));
        }
        else {
            textContent = _jsxs(_Fragment, { children: ["Followed by ", count, " connections"] });
        }
    }
    return (_jsxs("div", { className: "flex items-center gap-3 px-4 py-3 border-b border-border-default/40 bg-surface-card/30", children: [_jsx("div", { className: "flex -space-x-2 overflow-hidden", children: users.slice(0, 3).map((user) => (_jsx(Link, { to: `/profile/${user.username || user.id}`, children: _jsxs(Avatar, { className: "inline-block h-8 w-8 rounded-full ring-2 ring-surface-default", children: [_jsx(AvatarImage, { src: user.avatar_url || undefined, alt: user.username || "User" }), _jsx(AvatarFallback, { className: "text-[10px]", children: user.username?.charAt(0).toUpperCase() })] }) }, user.id))) }), _jsx("div", { className: "text-sm text-text-secondary", children: textContent })] }));
}
