import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { searchBuildingsRpc } from "@/utils/supabaseFallback";
import { Loader2, Search, Circle, X, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useDebounce } from "@/hooks/useDebounce";
import { getBuildingImageUrl } from "@/utils/image";
export function ManageFavoritesDialog({ open, onOpenChange, favorites, onSave }) {
    const { user } = useAuth();
    const [selected, setSelected] = useState(favorites);
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounce(query, 500);
    const [results, setResults] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("suggested");
    // Sync selected with props when dialog opens
    useEffect(() => {
        if (open) {
            setSelected(favorites);
            setQuery("");
            setActiveTab("suggested");
            fetchSuggestions();
        }
    }, [open, favorites]);
    const fetchSuggestions = async () => {
        if (!user)
            return;
        setLoading(true);
        try {
            const { data } = await supabase
                .from("user_buildings")
                .select(`
           rating,
           building:buildings ( id, name, main_image_url, year_completed )
        `)
                .eq("user_id", user.id)
                .eq("rating", 10)
                .order("created_at", { ascending: false })
                .limit(20);
            if (data) {
                const items = data.flatMap((log) => {
                    const b = Array.isArray(log.building) ? log.building[0] : log.building;
                    if (!b)
                        return [];
                    return [{
                            id: b.id,
                            media_type: "building",
                            title: b.name,
                            image_url: getBuildingImageUrl(b.main_image_url),
                            rating: 10,
                            year_completed: b.year_completed ? String(b.year_completed) : undefined
                        }];
                }).filter((item, index, self) => index === self.findIndex((t) => (t.id === item.id)));
                setSuggestions(items);
            }
        }
        catch (_e) {
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        if (debouncedQuery.length < 2) {
            setResults([]);
            return;
        }
        if (activeTab !== "search")
            setActiveTab("search");
        const search = async () => {
            setLoading(true);
            try {
                const data = await searchBuildingsRpc({
                    query_text: debouncedQuery
                });
                let mapped = (data || []).map((b) => ({
                    id: b.id,
                    media_type: "building",
                    title: b.name,
                    image_url: getBuildingImageUrl(b.main_image_url),
                    rating: undefined,
                    year_completed: b.year_completed ? String(b.year_completed) : undefined
                }));
                if (user && mapped.length > 0) {
                    const buildingIds = mapped.map((r) => r.id);
                    const { data: userRatings } = await supabase
                        .from("user_buildings")
                        .select("rating, building_id")
                        .eq("user_id", user.id)
                        .in("building_id", buildingIds)
                        .not("rating", "is", null);
                    if (userRatings) {
                        const ratingMap = new Map();
                        userRatings.forEach((log) => {
                            ratingMap.set(String(log.building_id), log.rating);
                        });
                        mapped = mapped.map((item) => ({
                            ...item,
                            rating: ratingMap.get(String(item.id)),
                        }));
                    }
                }
                setResults(mapped);
            }
            catch (_e) {
                void _e;
            }
            finally {
                setLoading(false);
            }
        };
        search();
    }, [debouncedQuery]);
    const toggleSelection = (item) => {
        if (selected.find(s => s.id === item.id)) {
            setSelected(prev => prev.filter(s => !(s.id === item.id)));
        }
        else {
            if (selected.length >= 6)
                return; // Max 6
            setSelected(prev => [...prev, item]);
        }
    };
    const handleSave = async () => {
        await onSave(selected);
        onOpenChange(false);
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "sm:max-w-xl flex flex-col h-[80vh] p-0 gap-0", children: [_jsx(DialogHeader, { className: "p-4 border-b", children: _jsxs(DialogTitle, { children: ["Manage Favorites (", selected.length, "/6)"] }) }), _jsx("div", { className: "p-4 bg-surface-muted/30", children: _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" }), _jsx("input", { className: "flex h-10 w-full rounded-md border border-border-default bg-surface-default px-3 py-2 pl-9 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50", placeholder: "Search for buildings...", value: query, onChange: (e) => {
                                    setQuery(e.target.value);
                                    if (e.target.value.length >= 2)
                                        setActiveTab("search");
                                } }), query && (_jsx("button", { onClick: () => setQuery(""), className: "absolute right-3 top-1/2 -translate-y-1/2", children: _jsx(X, { className: "h-4 w-4 text-text-secondary" }) }))] }) }), _jsxs(Tabs, { value: activeTab, onValueChange: (v) => setActiveTab(v), className: "flex-1 flex flex-col overflow-hidden", children: [_jsx("div", { className: "px-4 pt-2", children: _jsxs(TabsList, { className: "w-full", children: [_jsx(TabsTrigger, { value: "suggested", className: "flex-1", children: "Your Top Rated" }), _jsx(TabsTrigger, { value: "search", className: "flex-1", children: "Search Database" })] }) }), selected.length > 0 && (_jsxs("div", { className: "px-4 py-2 border-b bg-surface-default/50 backdrop-blur-sm z-10", children: [_jsxs("div", { className: "text-[10px] uppercase font-bold text-text-secondary mb-2 tracking-wider", children: ["Selected (", selected.length, "/6)"] }), _jsx("div", { className: "flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x", children: selected.map(item => (_jsxs("div", { className: "relative shrink-0 w-12 snap-start", children: [_jsx("div", { className: "aspect-[2/3] rounded-md overflow-hidden bg-surface-muted border shadow-sm", children: item.image_url ? (_jsx("img", { src: item.image_url, className: "w-full h-full object-cover" })) : (_jsx("div", { className: "w-full h-full bg-surface-muted" })) }), _jsx("button", { onClick: () => toggleSelection(item), className: "absolute -top-1.5 -right-1.5 bg-feedback-destructive text-white rounded-full p-0.5 shadow-sm hover:scale-110 transition-transform", children: _jsx(X, { className: "h-3 w-3" }) })] }, item.id))) })] })), _jsx(ScrollArea, { className: "flex-1 bg-surface-default", children: _jsxs("div", { className: "p-2 pb-20", children: [loading && activeTab === "search" ? (_jsx("div", { className: "flex justify-center py-12", children: _jsx(Loader2, { className: "h-6 w-6 animate-spin text-text-secondary" }) })) : (_jsxs(TabsContent, { value: "suggested", className: "mt-0 space-y-1", children: [suggestions.length === 0 && !loading && (_jsxs("div", { className: "text-center py-12 px-4 text-text-secondary text-sm", children: [_jsx(Circle, { className: "h-8 w-8 mx-auto mb-3 text-text-secondary/30" }), _jsx("p", { children: "You haven't rated any buildings 10/10 yet." }), _jsx(Button, { variant: "link", onClick: () => setActiveTab("search"), children: "Search instead" })] })), suggestions.map(item => _jsx(ListItem, { item: item, selected: selected, toggle: toggleSelection }, item.id))] })), _jsxs(TabsContent, { value: "search", className: "mt-0 space-y-1", children: [results.length === 0 && !loading && (_jsx("div", { className: "text-center py-12 px-4 text-text-secondary text-sm", children: query.length < 2 ? "Type to search buildings..." : "No results found." })), results.map(item => _jsx(ListItem, { item: item, selected: selected, toggle: toggleSelection }, item.id))] })] }) })] }), _jsx("div", { className: "p-4 border-t bg-surface-default", children: _jsx(Button, { onClick: handleSave, disabled: loading, className: "w-full", children: "Save Favorites" }) })] }) }));
}
function ListItem({ item, selected, toggle }) {
    const isSelected = !!selected.find(s => s.id === item.id);
    const isDisabled = !isSelected && selected.length >= 6;
    return (_jsxs("div", { onClick: () => !isDisabled && toggle(item), className: cn("flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors border border-transparent", isSelected ? "bg-brand-primary/5 border-brand-primary/20" : isDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-surface-muted"), children: [_jsx("div", { className: "h-12 w-8 shrink-0 bg-surface-muted rounded overflow-hidden shadow-sm", children: item.image_url && _jsx("img", { src: item.image_url, className: "w-full h-full object-cover" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-medium truncate text-sm", children: item.title }), item.year_completed && _jsxs("span", { className: "text-xs text-text-secondary shrink-0", children: ["(", item.year_completed, ")"] })] }), _jsx("div", { className: "flex items-center gap-2 text-[10px] text-text-secondary mt-0.5", children: item.rating && (_jsxs("span", { className: "flex items-center text-[#595959] gap-0.5 font-medium", children: [_jsx(Circle, { className: "h-2.5 w-2.5 fill-current" }), " ", item.rating] })) })] }), _jsx("div", { className: cn("h-5 w-5 rounded-full border flex items-center justify-center transition-colors mr-1", isSelected ? "bg-brand-primary border-brand-primary text-brand-primary-foreground" : "border-text-secondary/30"), children: isSelected && _jsx(Check, { className: "h-3 w-3" }) })] }));
}
