import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
export default function ImageWall() {
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedKeys, setSelectedKeys] = useState(new Set());
    useEffect(() => {
        fetchImages();
    }, []);
    const fetchImages = async () => {
        setLoading(true);
        try {
            // Fetch recent profiles
            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, username, avatar_url, created_at")
                .not("avatar_url", "is", null)
                .order("created_at", { ascending: false })
                .limit(50);
            const combined = [];
            if (profiles) {
                profiles.forEach((p) => {
                    if (!p.avatar_url)
                        return;
                    combined.push({
                        id: p.id,
                        url: p.avatar_url,
                        type: 'profile',
                        name: p.username || 'User',
                        date: p.created_at,
                        uniqueKey: `profile:${p.id}`
                    });
                });
            }
            // Sort combined by date desc
            combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setImages(combined);
        }
        catch (_error) {
            toast.error("Failed to load images");
        }
        finally {
            setLoading(false);
        }
    };
    const toggleSelect = (key) => {
        const newSelected = new Set(selectedKeys);
        if (newSelected.has(key)) {
            newSelected.delete(key);
        }
        else {
            newSelected.add(key);
        }
        setSelectedKeys(newSelected);
    };
    const handleDeleteSelected = async () => {
        if (selectedKeys.size === 0)
            return;
        if (!window.confirm(`Delete ${selectedKeys.size} images? This cannot be undone.`))
            return;
        try {
            const itemsToDelete = images.filter(img => selectedKeys.has(img.uniqueKey));
            // Group by type
            const profileIds = itemsToDelete.filter(i => i.type === 'profile').map(i => i.id);
            if (profileIds.length > 0) {
                const { error } = await supabase
                    .from('profiles')
                    .update({ avatar_url: null })
                    .in('id', profileIds);
                if (error)
                    throw error;
            }
            toast.success("Images deleted successfully");
            // Remove from local state
            setImages(prev => prev.filter(img => !selectedKeys.has(img.uniqueKey)));
            setSelectedKeys(new Set());
        }
        catch (_error) {
            toast.error("Failed to delete images");
        }
    };
    return (_jsxs("div", { className: "space-y-6 p-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Image Wall" }), _jsxs("div", { className: "flex gap-2", children: [_jsxs(Button, { variant: "outline", onClick: fetchImages, children: [_jsx(RefreshCw, { className: "h-4 w-4 mr-2" }), " Refresh"] }), selectedKeys.size > 0 && (_jsxs(Button, { variant: "destructive", onClick: handleDeleteSelected, children: [_jsx(Trash2, { className: "h-4 w-4 mr-2" }), " Delete (", selectedKeys.size, ")"] }))] })] }), loading ? (_jsx("div", { className: "flex justify-center py-12", children: _jsx(Loader2, { className: "h-8 w-8 animate-spin" }) })) : images.length === 0 ? (_jsx("div", { className: "text-center text-text-secondary py-12", children: "No images found." })) : (_jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4", children: images.map(img => (_jsxs("div", { className: cn("relative group aspect-square rounded-md overflow-hidden border cursor-pointer transition-all", selectedKeys.has(img.uniqueKey) ? "ring-2 ring-brand-primary border-brand-primary" : "hover:border-brand-primary/50"), onClick: () => toggleSelect(img.uniqueKey), children: [_jsx("img", { src: img.url, alt: img.name, className: "w-full h-full object-cover", loading: "lazy" }), _jsxs("div", { className: "absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2", children: [_jsx("div", { className: "text-white text-xs font-medium truncate", children: img.name }), _jsx("div", { className: "text-white/70 text-[10px] capitalize", children: img.type })] }), _jsx("div", { className: "absolute top-2 right-2", children: _jsx(Checkbox, { checked: selectedKeys.has(img.uniqueKey), onCheckedChange: () => toggleSelect(img.uniqueKey), className: "bg-white/90 border-transparent data-[state=checked]:bg-brand-primary data-[state=checked]:text-brand-primary-foreground" }) })] }, img.uniqueKey))) }))] }));
}
