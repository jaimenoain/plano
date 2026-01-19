import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Loader2 } from "lucide-react";

interface TmdbSearchInputProps {
    value?: string | number | null; // Can be title or ID? Usually we want to store object or ID
    onChange: (value: any) => void; // Pass back full TMDB object
    type?: "movie" | "tv" | "person";
    placeholder?: string;
}

export function TmdbSearchInput({ value, onChange, type = "movie", placeholder = "Search..." }: TmdbSearchInputProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);

    // If value is provided (as ID or object), we might want to display it.
    // For now, let's assume parent manages "selected state" visualization if needed,
    // or we just use this input to find and select.
    // If we want to show the selected item, we need the object.

    useEffect(() => {
        if (!query) {
            setResults([]);
            return;
        }

        const timeout = setTimeout(async () => {
            setLoading(true);
            try {
                const { data } = await supabase.functions.invoke("tmdb-search", {
                    body: { query, type }
                });
                if (data && data.results) {
                    setResults(data.results.slice(0, 5)); // Limit to 5
                    setOpen(true);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }, 500);

        return () => clearTimeout(timeout);
    }, [query, type]);

    const getImageUrl = (item: any) => {
        if (type === 'person' && item.profile_path) {
            return `https://image.tmdb.org/t/p/w92${item.profile_path}`;
        }
        if (item.poster_path) {
            return `https://image.tmdb.org/t/p/w92${item.poster_path}`;
        }
        return null;
    };

    const getMainText = (item: any) => {
        return item.original_title || item.original_name || item.title || item.name;
    };

    const getSecondaryText = (item: any) => {
        if (type === 'person') {
            // For person, maybe show known_for or known_for_department
            if (item.known_for_department) return item.known_for_department;
            return null;
        }
        // For movies/tv
        if ((item.title || item.name) && (item.title || item.name) !== (item.original_title || item.original_name)) {
            return item.title || item.name;
        }
        return null;
    };

    const getTertiaryText = (item: any) => {
         if (type === 'person') {
             // Maybe show top known for work?
             if (item.known_for && item.known_for.length > 0) {
                 const works = item.known_for.map((w: any) => w.title || w.name).join(", ");
                 return works;
             }
             return null;
         }
         return (item.release_date || item.first_air_date || "").split("-")[0];
    };

    return (
        <div className="relative w-full">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pl-9 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (!open) setOpen(true);
                    }}
                    onFocus={() => {
                        if (results.length > 0) setOpen(true);
                    }}
                    onBlur={() => {
                        // Delay hide to allow click
                        setTimeout(() => setOpen(false), 200);
                    }}
                />
                {loading && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>

            {open && results.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-md overflow-hidden animate-in fade-in-0 zoom-in-95">
                    {results.map((item) => {
                        const imageUrl = getImageUrl(item);
                        return (
                        <div
                            key={item.id}
                            className="flex items-center gap-2 p-2 hover:bg-muted cursor-pointer transition-colors"
                            onClick={() => {
                                onChange(item);
                                setQuery(""); // Clear search or set to title?
                                setResults([]);
                                setOpen(false);
                            }}
                        >
                            <div className="h-10 w-7 bg-muted shrink-0 rounded overflow-hidden">
                                {imageUrl && (
                                    <img src={imageUrl} className="w-full h-full object-cover" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">
                                    {getMainText(item)}
                                </div>
                                {getSecondaryText(item) && (
                                    <div className="text-xs text-muted-foreground truncate opacity-80">
                                        {getSecondaryText(item)}
                                    </div>
                                )}
                                <div className="text-xs text-muted-foreground truncate">
                                    {getTertiaryText(item)}
                                </div>
                            </div>
                        </div>
                    )})}
                </div>
            )}
        </div>
    );
}
