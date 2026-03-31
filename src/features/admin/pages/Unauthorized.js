import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";
import { ShieldAlert } from "lucide-react";
export default function Unauthorized() {
    return (_jsxs("div", { className: "flex h-screen w-full flex-col items-center justify-center gap-4 bg-surface-default p-4 text-center", children: [_jsx("div", { className: "rounded-full bg-feedback-destructive/10 p-4", children: _jsx(ShieldAlert, { className: "h-12 w-12 text-feedback-destructive" }) }), _jsx("h1", { className: "text-3xl font-bold tracking-tight", children: "Permission Denied" }), _jsx("p", { className: "text-text-secondary max-w-md", children: "You do not have permission to access the Admin Console. If you believe this is an error, please contact the system administrator." }), _jsx("div", { className: "flex gap-4", children: _jsx(Link, { to: "/", children: _jsx(Button, { variant: "outline", children: "Return Home" }) }) })] }));
}
