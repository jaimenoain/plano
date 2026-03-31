import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AppLayout } from "@/components/layout/AppLayout";
import { PeopleYouMayKnow } from "@/features/connect/components/PeopleYouMayKnow";
import { YourContacts } from "@/features/connect/components/YourContacts";
import { cn } from "@/lib/utils";
export default function Connect() {
    return (_jsx("div", { className: cn("w-full transition-[padding] duration-200 ease-linear", "md:pl-52"), children: _jsx(AppLayout, { title: "Connect", showLogo: false, children: _jsx("div", { className: "w-full pb-20", children: _jsxs("div", { className: "px-4 py-6 max-w-6xl mx-auto", children: [_jsx("h1", { className: "text-3xl md:text-4xl font-bold tracking-tight leading-tight text-text-primary", children: "Connect" }), _jsx("section", { className: "mt-12 pt-8 border-t border-border-default", children: _jsx(PeopleYouMayKnow, {}) }), _jsx("section", { className: "mt-12 pt-8 border-t border-border-default", children: _jsx(YourContacts, {}) })] }) }) }) }));
}
