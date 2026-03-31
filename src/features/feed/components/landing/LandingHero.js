import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router";
import { DiscoverySearchInput } from "@/features/search/components/DiscoverySearchInput";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star } from "lucide-react";
import { motion } from "framer-motion";
const FloatingCard = ({ name, rating, className, delay = 0 }) => {
    return (_jsx(motion.div, { className: `absolute hidden md:flex items-center gap-3 p-3 bg-surface-card border-2 border-text-primary shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg z-10 ${className}`, initial: { opacity: 0, y: 20 }, animate: {
            opacity: 1,
            y: 0,
        }, transition: {
            duration: 0.8,
            delay,
            ease: "easeOut"
        }, children: _jsxs(motion.div, { className: "flex items-center gap-2", animate: { y: [0, -10, 0] }, transition: {
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: delay + 0.5
            }, children: [_jsx("span", { className: "font-semibold text-sm", children: name }), _jsxs("div", { className: "flex items-center gap-1 bg-surface-muted/50 px-1.5 py-0.5 rounded-sm", children: [_jsx(Star, { className: "w-3 h-3 fill-feedback-warning text-feedback-warning" }), _jsx("span", { className: "text-xs font-medium", children: rating })] })] }) }));
};
export const LandingHero = () => {
    const [searchValue, setSearchValue] = useState("");
    const navigate = useNavigate();
    const handleLocationSelect = (location) => {
        navigate(`/search?lat=${location.lat}&lng=${location.lng}`);
    };
    const handleSearchSubmit = () => {
        if (searchValue.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchValue)}`);
        }
    };
    return (_jsx("div", { className: "w-full min-h-[80vh] py-24 md:py-32 flex flex-col items-center justify-center space-y-8 bg-surface-default bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] overflow-hidden", children: _jsxs("div", { className: "w-full max-w-4xl px-4 flex flex-col items-center text-center space-y-8 relative", children: [_jsx(FloatingCard, { name: "The Shard", rating: "4.9", className: "top-[-2rem] left-[-2rem] lg:left-[-6rem] -rotate-6", delay: 0.5 }), _jsx(FloatingCard, { name: "Fallingwater", rating: "5.0", className: "bottom-[10%] right-[-2rem] lg:right-[-6rem] rotate-6", delay: 0.7 }), _jsx(FloatingCard, { name: "Guggenheim", rating: "4.8", className: "top-[40%] left-[-3rem] lg:left-[-8rem] rotate-3 hidden lg:flex", delay: 0.9 }), _jsxs(motion.div, { className: "space-y-4", initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, ease: "easeOut" }, children: [_jsxs("h1", { className: "text-4xl md:text-6xl font-bold tracking-tight text-text-primary", children: ["The world's architecture, ", _jsx("br", { className: "hidden md:block" }), "cataloged."] }), _jsx("p", { className: "text-xl md:text-2xl text-text-secondary max-w-2xl mx-auto", children: "Track visits, rate buildings, and follow friends." })] }), _jsx(motion.div, { className: "w-full max-w-lg", initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.6, delay: 0.2 }, whileHover: { scale: 1.01 }, children: _jsx("div", { className: "relative rounded-sm bg-surface-card border border-border-default shadow-sm p-2", children: _jsx(DiscoverySearchInput, { value: searchValue, onSearchChange: setSearchValue, onLocationSelect: handleLocationSelect, placeholder: "Search for a city, building, or architect...", className: "w-full [&_input]:bg-transparent [&_input]:border-none [&_input]:focus-visible:ring-0 [&_input]:text-base [&_input]:h-12 [&_input]:placeholder:text-text-secondary/70", onKeyDown: (e) => {
                                if (e.key === 'Enter') {
                                    handleSearchSubmit();
                                }
                            } }) }) }), _jsx(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay: 0.4 }, children: _jsxs(Badge, { variant: "secondary", className: "px-4 py-2 h-auto text-sm md:text-base cursor-pointer gap-2", onClick: () => navigate('/search'), children: [_jsx(MapPin, { className: "w-4 h-4" }), _jsx("span", { children: "Trending near you" })] }) })] }) }));
};
