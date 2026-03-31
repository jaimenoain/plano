import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBuildingImageUrl } from "@/utils/image";
import { useAuth } from "@/features/auth/hooks/useAuth";
export function PortfolioBuildingCard({ building, hideBucketListButton }) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isMutating, setIsMutating] = useState(false);
    const { data: isInWatchlist = false } = useQuery({
        queryKey: ["user-building-pending", user?.id, building.id],
        queryFn: async () => {
            if (!user)
                return false;
            const { data, error } = await supabase
                .from("user_buildings")
                .select("id")
                .eq("user_id", user.id)
                .eq("building_id", building.id)
                .eq("status", "pending")
                .maybeSingle();
            if (error)
                throw error;
            return !!data;
        },
        enabled: !!user && !hideBucketListButton,
    });
    const imageUrl = getBuildingImageUrl(building.main_image_url) || "/placeholder.svg";
    const linkUrl = `/building/${building.id}`;
    const handleToggleWatchlist = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
            toast.error("You must be logged in");
            return;
        }
        if (isMutating)
            return;
        setIsMutating(true);
        try {
            if (isInWatchlist) {
                const { error } = await supabase
                    .from("user_buildings")
                    .delete()
                    .eq("user_id", user.id)
                    .eq("building_id", building.id)
                    .eq("status", "pending");
                if (error)
                    throw error;
                toast.success("Removed from bucket list");
            }
            else {
                const { error } = await supabase.from("user_buildings").insert({
                    user_id: user.id,
                    building_id: building.id,
                    status: "pending",
                });
                if (error)
                    throw error;
                toast.success("Added to bucket list");
            }
            queryClient.invalidateQueries({ queryKey: ["user-building-pending", user.id, building.id] });
            queryClient.invalidateQueries({ queryKey: ["user-bucket-list-count"] });
        }
        catch {
            toast.error("Failed to update bucket list");
        }
        finally {
            setIsMutating(false);
        }
    };
    return (_jsx("div", { className: "group relative flex flex-col space-y-2", children: _jsxs(Link, { to: linkUrl, className: "relative aspect-[4/3] overflow-hidden rounded-xl bg-surface-muted transition-all hover:scale-[1.02] hover:ring-2 hover:ring-brand-primary/50 shadow-none", children: [_jsx("img", { src: imageUrl, alt: building.name, className: "h-full w-full object-cover transition-all", loading: "lazy" }), _jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-40" }), !hideBucketListButton && (_jsx("div", { className: "absolute top-2 right-2 z-10", children: _jsxs(Button, { size: "icon", variant: isInWatchlist ? "secondary" : "default", className: `h-8 w-8 rounded-full shadow-lg transition-all ${isInWatchlist
                            ? "bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary/90"
                            : "bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm"}`, onClick: handleToggleWatchlist, disabled: isMutating, children: [isMutating ? (_jsx(Loader2, { className: "h-4 w-4 animate-spin" })) : isInWatchlist ? (_jsx(Clock, { className: "h-4 w-4" })) : (_jsx(Plus, { className: "h-4 w-4" })), _jsx("span", { className: "sr-only", children: isInWatchlist ? "Remove from bucket list" : "Add to bucket list" })] }) })), _jsxs("div", { className: "absolute bottom-0 left-0 right-0 p-3 text-white", children: [_jsx("h3", { className: "font-semibold leading-tight line-clamp-2 text-sm md:text-base drop-shadow-md", children: building.name }), _jsxs("div", { className: "flex items-center gap-2 text-xs text-white/80 mt-1", children: [building.architects && building.architects.length > 0 && _jsx("span", { children: building.architects[0].name }), building.architects && building.architects.length > 0 && building.year_completed && _jsx("span", { children: "\u2022" }), building.year_completed && _jsx("span", { children: building.year_completed })] })] })] }) }));
}
