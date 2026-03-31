import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
const MOCK_ACTIVITIES = [
    {
        id: 1,
        user: "Alice",
        avatar: "https://i.pravatar.cc/150?u=alice",
        action: "rated",
        target: "The Shard",
        details: "5★",
    },
    {
        id: 2,
        user: "Bob",
        avatar: "https://i.pravatar.cc/150?u=bob",
        action: "liked",
        target: "Villa Savoye",
        details: "",
    },
    {
        id: 3,
        user: "Charlie",
        avatar: "https://i.pravatar.cc/150?u=charlie",
        action: "added",
        target: "Fallingwater",
        details: "to 'Brutalist Gems'",
    },
    {
        id: 4,
        user: "Dana",
        avatar: "https://i.pravatar.cc/150?u=dana",
        action: "visited",
        target: "Guggenheim Museum",
        details: "",
    },
    {
        id: 5,
        user: "Eve",
        avatar: "https://i.pravatar.cc/150?u=eve",
        action: "rated",
        target: "Sydney Opera House",
        details: "4.5★",
    },
];
export const LandingMarquee = () => {
    return (_jsx("div", { className: "w-0 min-w-full overflow-hidden border-y border-border-default bg-surface-muted py-6", children: _jsx("div", { className: "relative flex w-full items-center", children: _jsx(motion.div, { className: "flex flex-nowrap gap-0", animate: { x: "-50%" }, transition: {
                    repeat: Infinity,
                    ease: "linear",
                    duration: 30, // Adjust speed here
                }, style: { width: "max-content" }, children: [...MOCK_ACTIVITIES, ...MOCK_ACTIVITIES].map((activity, index) => (_jsxs("div", { className: "flex items-center gap-3 whitespace-nowrap", children: [_jsxs(Avatar, { className: "h-6 w-6 border border-border-default", children: [_jsx(AvatarImage, { src: activity.avatar, alt: activity.user }), _jsx(AvatarFallback, { children: activity.user[0] })] }), _jsxs("span", { className: "text-sm", children: [_jsx("span", { className: "font-medium", children: activity.user }), " ", activity.action, " ", _jsx("span", { className: "font-medium", children: activity.target }), " ", activity.details] }), _jsx("span", { className: "mx-8 text-brand-primary", children: "+" })] }, `${activity.id}-${index}`))) }) }) }));
};
