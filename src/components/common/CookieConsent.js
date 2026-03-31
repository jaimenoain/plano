import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getConsent, setConsent } from "@/lib/consent";
export function CookieConsent() {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        if (getConsent() !== "pending")
            return undefined;
        const timer = setTimeout(() => setVisible(true), 1000);
        return () => clearTimeout(timer);
    }, []);
    if (!visible)
        return null;
    const handleAccept = () => {
        setConsent("granted");
        setVisible(false);
    };
    const handleDecline = () => {
        setConsent("denied");
        setVisible(false);
    };
    return (_jsx("div", { className: "fixed bottom-0 left-0 right-0 z-50 border-t border-border-default bg-surface-default p-4 shadow-lg", role: "dialog", "aria-label": "Cookie preferences", children: _jsxs("div", { className: "mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("p", { className: "text-sm text-text-secondary", children: ["We use cookies to understand how you use Plano and improve your experience.", " ", _jsx("a", { href: "/terms", className: "underline hover:text-text-primary", children: "Learn more" })] }), _jsxs("div", { className: "flex shrink-0 gap-2", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: handleDecline, children: "Decline" }), _jsx(Button, { size: "sm", onClick: handleAccept, children: "Accept" })] })] }) }));
}
