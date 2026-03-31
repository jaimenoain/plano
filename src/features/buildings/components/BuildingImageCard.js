import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Heart, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
export function BuildingImageCard({ image, initialIsLiked, onOpen }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLiked, setIsLiked] = useState(initialIsLiked);
    const [likesCount, setLikesCount] = useState(image.likes_count);
    const [isProcessing, setIsProcessing] = useState(false);
    const isVideo = image.type === 'video';
    const isVideoPlaceholder = isVideo && !image.poster;
    // Sync state if initialIsLiked changes (e.g. parent refetch)
    useEffect(() => {
        setIsLiked(initialIsLiked);
    }, [initialIsLiked]);
    const handleLike = async (e) => {
        e.stopPropagation();
        if (!user) {
            toast({ title: "Please sign in to like photos" });
            return;
        }
        if (isVideo)
            return; // Videos don't support per-image likes yet
        if (isProcessing)
            return;
        setIsProcessing(true);
        const previousIsLiked = isLiked;
        const previousLikesCount = likesCount;
        // Optimistic update
        setIsLiked(!isLiked);
        setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
        try {
            if (previousIsLiked) {
                const { error } = await supabase
                    .from("image_likes")
                    .delete()
                    .eq("image_id", image.id)
                    .eq("user_id", user.id);
                if (error)
                    throw error;
            }
            else {
                const { error } = await supabase
                    .from("image_likes")
                    .insert({
                    image_id: image.id,
                    user_id: user.id
                });
                if (error)
                    throw error;
            }
        }
        catch (_error) {
            setIsLiked(previousIsLiked);
            setLikesCount(previousLikesCount);
            toast({ variant: "destructive", title: "Failed to update like" });
        }
        finally {
            setIsProcessing(false);
        }
    };
    return (_jsxs("button", { type: "button", onClick: onOpen, className: "relative aspect-square rounded-sm overflow-hidden group cursor-pointer", children: [_jsx("img", { src: isVideo && image.poster ? image.poster : image.url, className: `w-full h-full object-cover transition-transform duration-200 group-hover:scale-105 ${isVideoPlaceholder ? "opacity-50" : ""}`, alt: "Building visual" }), isVideo && (_jsx("div", { className: "absolute inset-0 flex items-center justify-center pointer-events-none", children: _jsx("div", { className: "bg-black/40 /* Photo overlay \u2014 bg-black/40 approved per COMPONENT_SPEC \u00A78 backdrop convention */ rounded-sm p-2 backdrop-blur-sm", children: _jsx(Play, { className: "w-5 h-5 text-text-inverse fill-text-inverse" }) }) })), image.is_generated && (_jsx("div", { className: "absolute top-1.5 left-1.5 pointer-events-none", children: _jsx("span", { className: "bg-black/60 text-text-inverse text-[10px] font-bold px-1.5 py-0.5 rounded-sm backdrop-blur-sm border border-white/10 uppercase tracking-wider", children: "Render" }) })), !isVideo && (_jsxs("div", { className: "absolute bottom-2 right-2 bg-surface-card/80 backdrop-blur-sm rounded-sm px-2 py-0.5 text-xs font-medium flex items-center gap-1", children: [_jsx(Heart, { className: `w-3.5 h-3.5 ${isLiked ? "fill-feedback-destructive text-feedback-destructive" : "text-text-secondary"}`, onClick: handleLike }), _jsx("span", { className: "text-text-secondary", children: likesCount })] }))] }));
}
