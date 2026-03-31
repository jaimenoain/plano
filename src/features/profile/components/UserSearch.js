import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Loader2 } from "lucide-react";
export function UserSearch({ onSelect, excludeIds = [] }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        const searchUsers = async () => {
            if (query.length < 2) {
                setResults([]);
                return;
            }
            setLoading(true);
            const { data, error } = await supabase
                .from("profiles")
                .select("id, username, avatar_url")
                .ilike("username", `%${query}%`)
                .not("id", "in", `(${excludeIds.join(",") || "00000000-0000-0000-0000-000000000000"})`)
                .limit(5);
            if (!error && data) {
                setResults(data);
            }
            setLoading(false);
        };
        const timer = setTimeout(searchUsers, 300);
        return () => clearTimeout(timer);
    }, [query, excludeIds]);
    return (_jsxs("div", { className: "relative w-full", children: [_jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-2.5 h-4 w-4 text-text-secondary" }), _jsx(Input, { placeholder: "Type a username...", value: query, onChange: (e) => setQuery(e.target.value), className: "pl-9" }), loading && _jsx(Loader2, { className: "absolute right-3 top-2.5 h-4 w-4 animate-spin text-text-secondary" })] }), results.length > 0 && (_jsx("div", { className: "absolute z-50 w-full mt-1 bg-surface-overlay border rounded-md shadow-lg overflow-hidden", children: results.map((u) => (_jsxs("div", { className: "flex items-center gap-3 p-3 hover:bg-brand-secondary cursor-pointer transition-colors", onClick: () => {
                        onSelect(u.id, u.username);
                        setQuery("");
                        setResults([]);
                    }, children: [_jsxs(Avatar, { className: "h-8 w-8", children: [_jsx(AvatarImage, { src: u.avatar_url ?? undefined }), _jsx(AvatarFallback, { children: u.username?.[0]?.toUpperCase() })] }), _jsx("span", { className: "font-medium text-sm", children: u.username })] }, u.id))) }))] }));
}
