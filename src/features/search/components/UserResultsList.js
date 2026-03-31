import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { UserRow } from "@/features/connect/components/UserRow";
import { Skeleton } from "@/components/ui/skeleton";
export function UserResultsList({ users, isLoading }) {
    if (isLoading) {
        return (_jsx("div", { className: "flex flex-col gap-2 p-4", children: [...Array(5)].map((_, i) => (_jsxs("div", { className: "flex items-center gap-3 p-4 border-b border-border-default", children: [_jsx(Skeleton, { className: "h-10 w-10 rounded-full" }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Skeleton, { className: "h-4 w-32" }), _jsx(Skeleton, { className: "h-3 w-20" })] })] }, i))) }));
    }
    if (users.length === 0) {
        return (_jsx("div", { className: "flex flex-col items-center justify-center p-8 text-center text-text-secondary", children: _jsx("p", { children: "No users found matching your search." }) }));
    }
    return (_jsx("div", { className: "flex flex-col p-4", children: users.map((user) => (_jsx("div", { className: "border-b border-border-default hover:bg-brand-secondary transition-colors cursor-pointer", children: _jsx(UserRow, { user: user }, user.id) }))) }));
}
