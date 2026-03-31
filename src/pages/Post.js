import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { X, Circle, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { fetchBuildingDetails as fetchBuildingDetailsRpc, fetchUserBuildingStatus, upsertUserBuilding, deleteUserBuilding } from "@/utils/supabaseFallback";
import { UserPicker } from "@/components/common/UserPicker";
export default function Post() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const buildingId = searchParams.get("id");
    const paramTitle = searchParams.get("title") || "";
    const paramImage = searchParams.get("image") || "";
    const typeParam = searchParams.get("type");
    const [postType, setPostType] = useState((typeParam === "bucket_list" || typeParam === "review") ? typeParam : "review");
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0); // Added for hover effect
    const [content, setContent] = useState("");
    const [visibility, setVisibility] = useState("public");
    const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);
    const [loading, setLoading] = useState(false);
    const [checkingExisting, setCheckingExisting] = useState(true);
    const [buildingDetails, setBuildingDetails] = useState(null);
    const [existingEntryId, setExistingEntryId] = useState(null);
    // Recommendation state
    const [recommendTo, setRecommendTo] = useState([]);
    useEffect(() => {
        if (!authLoading && !user) {
            navigate("/auth");
        }
    }, [user, authLoading, navigate]);
    useEffect(() => {
        if (!buildingId) {
            navigate("/search");
            return;
        }
        if (user) {
            checkExistingReview();
            fetchBuildingDetails();
        }
    }, [buildingId, user, navigate]);
    const fetchBuildingDetails = async () => {
        if (!buildingId)
            return;
        try {
            const data = await fetchBuildingDetailsRpc(buildingId);
            if (data) {
                setBuildingDetails({
                    ...data,
                    name: data.name,
                    year_completed: data.year_completed
                });
            }
        }
        catch (_error) {
        }
    };
    const checkExistingReview = async () => {
        if (!buildingId || !user)
            return;
        setCheckingExisting(true);
        try {
            const entry = await fetchUserBuildingStatus(user.id, buildingId);
            if (entry) {
                setExistingEntryId(entry.id);
                const mappedStatus = entry.status === 'pending' ? 'bucket_list' : 'review';
                setPostType(mappedStatus === "bucket_list" ? "bucket_list" : "review");
                if (entry.rating)
                    setRating(entry.rating);
                if (entry.content)
                    setContent(entry.content);
                if (entry.visibility)
                    setVisibility(entry.visibility);
            }
        }
        catch (_error) {
        }
        finally {
            setCheckingExisting(false);
        }
    };
    const handleSubmit = async () => {
        setLoading(true);
        try {
            if (!buildingId)
                throw new Error("No building ID");
            const isReview = postType === "review";
            const dbStatus = isReview ? 'visited' : 'pending';
            await upsertUserBuilding({
                user_id: user.id,
                building_id: buildingId,
                status: dbStatus,
                rating: (isReview && rating > 0) ? rating : null,
                content: content.trim() || null,
                tags: null,
                visibility,
                edited_at: new Date().toISOString()
            });
            // Handle Recommendations
            // (Simplified: remove recommendations logic if table is gone or update it later)
            /*
            if (recommendTo.length > 0) {
                // ...
            }
            */
            toast({ title: isReview ? "Review posted!" : "Added to bucket list!" });
            navigate("/", { state: isReview ? { reviewPosted: true } : undefined });
        }
        catch (error) {
            toast({ variant: "destructive", title: "Error", description: error instanceof Error ? error.message : "Something went wrong" });
        }
        finally {
            setLoading(false);
        }
    };
    const handleDelete = async () => {
        if (!existingEntryId)
            return;
        setLoading(true);
        try {
            await deleteUserBuilding(existingEntryId);
            toast({ title: "Removed from your list" });
            navigate("/");
        }
        catch (error) {
            toast({ variant: "destructive", title: "Error", description: error instanceof Error ? error.message : "Something went wrong" });
            setLoading(false);
        }
    };
    // Determine Titles
    const mainTitle = buildingDetails?.name || decodeURIComponent(paramTitle);
    const subTitle = buildingDetails?.address || "";
    if (!buildingId)
        return null;
    return (_jsxs("div", { className: "min-h-screen bg-surface-default", children: [_jsx("header", { className: "fixed top-0 left-0 right-0 z-50 glass safe-area-pt", children: _jsxs("div", { className: "flex items-center justify-between h-14 px-4 max-w-lg mx-auto", children: [_jsx("button", { onClick: () => navigate(-1), className: "p-2 -ml-2", children: _jsx(X, { className: "h-5 w-5" }) }), _jsx("span", { className: "text-sm font-medium", children: postType === "review" ? "Rate & Review" : "Add to Bucket List" }), _jsx("div", { className: "w-5" })] }) }), _jsx("main", { className: "pt-14 pb-8 px-4 max-w-lg mx-auto", children: checkingExisting ? _jsx("div", { className: "flex justify-center py-8", children: _jsx(Loader2, { className: "h-8 w-8 animate-spin text-brand-primary" }) }) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex gap-5 py-6 hairline", children: [paramImage ? (_jsx("img", { src: paramImage, alt: mainTitle, className: "w-32 h-auto aspect-[2/3] object-cover rounded-md shadow-none flex-shrink-0" })) : (_jsx("div", { className: "w-32 h-auto aspect-[2/3] bg-surface-muted rounded-md flex-shrink-0" })), _jsxs("div", { className: "flex flex-col justify-center", children: [_jsx("h2", { className: "text-xl font-bold leading-tight", children: mainTitle }), subTitle && _jsx("p", { className: "text-sm text-text-secondary mt-0.5", children: subTitle }), _jsxs("div", { className: "text-sm text-text-secondary mt-1 space-y-0.5", children: [buildingDetails?.architects && buildingDetails.architects.length > 0 && (_jsxs("p", { children: ["Architect: ", buildingDetails.architects.map((a) => a.name).join(", ")] })), buildingDetails?.year_completed && _jsxs("p", { children: ["Year: ", buildingDetails.year_completed] })] })] })] }), _jsx("div", { className: "flex gap-2 py-4", children: ["review", "bucket_list"].map((type) => (_jsx("button", { onClick: () => setPostType(type), className: cn("flex-1 py-2 rounded-md text-sm font-medium capitalize", postType === type ? "bg-brand-primary text-brand-primary-foreground" : "bg-surface-muted text-text-secondary"), children: type === "bucket_list" ? "Bucket List" : "Review" }, type))) }), postType === "review" && (_jsxs("div", { className: "py-4 hairline", children: [_jsx("p", { className: "text-sm text-text-secondary mb-3", children: "Your Rating (Optional)" }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("div", { className: "flex items-center gap-0.5 md:gap-1", onMouseLeave: () => setHoverRating(0), children: Array.from({ length: 3 }).map((_, i) => {
                                                const starValue = i + 1;
                                                // Highlight stars if they are <= the selected rating OR <= the current hover index
                                                const isHighlighted = starValue <= (hoverRating || rating);
                                                return (_jsx("button", { onClick: () => setRating(starValue), onMouseEnter: () => setHoverRating(starValue), className: "p-0.5", children: _jsx(Circle, { className: cn("h-6 w-6 md:h-7 md:w-7 transition-colors", isHighlighted
                                                            ? "fill-[#595959] text-[#595959]" // Active: Signature gray
                                                            : "text-text-secondary/20" // Inactive: Transparent fill, lighter outline
                                                        ) }) }, i));
                                            }) }), (hoverRating > 0 || rating > 0) && (_jsx("span", { className: "text-4xl font-bold text-brand-primary ml-2", children: hoverRating || rating }))] })] })), _jsx("div", { className: "py-4 hairline", children: _jsx(Textarea, { placeholder: postType === "review" ? "Write your thoughts..." : "Why do you want to visit this?", value: content, onChange: (e) => setContent(e.target.value), className: "min-h-[120px] bg-surface-muted/20 border border-border-default rounded-md p-3 resize-none focus-visible:ring-1 focus-visible:ring-brand-primary text-base" }) }), _jsxs("div", { className: "py-4 hairline space-y-3", children: [_jsx("p", { className: "text-sm text-text-secondary", children: postType === "review"
                                        ? "Anyone in particular that shouldn't miss this?"
                                        : "I'd like to visit this with... (optional)" }), _jsx(UserPicker, { selectedIds: recommendTo, onSelect: (id) => setRecommendTo([...recommendTo, id]), onRemove: (id) => setRecommendTo(recommendTo.filter(uid => uid !== id)) })] }), _jsxs("div", { className: "py-6 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "text-xs text-text-secondary", children: ["Visibility: ", _jsx("span", { className: "text-text-primary font-medium capitalize", children: visibility })] }), _jsx("button", { onClick: () => setShowVisibilityMenu(!showVisibilityMenu), className: "p-1 hover:bg-surface-muted rounded-full transition-colors", children: _jsx(Pencil, { className: "h-3 w-3 text-text-secondary/50" }) })] }), showVisibilityMenu && (_jsx("div", { className: "absolute bottom-16 left-4 right-4 bg-surface-overlay border rounded-md shadow-xl z-50 overflow-hidden", children: ["public", "contacts", "private"].map((v) => (_jsx("button", { onClick: () => { setVisibility(v); setShowVisibilityMenu(false); }, className: cn("w-full px-4 py-3 text-left text-sm hover:bg-surface-muted", visibility === v ? "text-brand-primary font-bold" : ""), children: v.charAt(0).toUpperCase() + v.slice(1) }, v))) }))] }), _jsxs("div", { className: "pt-4 pb-8 flex flex-col items-center gap-4", children: [_jsx(Button, { size: "lg", className: "w-full", onClick: handleSubmit, disabled: loading || checkingExisting, children: loading ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : "Save" }), existingEntryId ? (_jsxs(AlertDialog, { children: [_jsx(AlertDialogTrigger, { asChild: true, children: _jsx("button", { className: "text-sm text-red-500 hover:text-red-600 hover:underline", children: "Delete" }) }), _jsxs(AlertDialogContent, { children: [_jsxs(AlertDialogHeader, { children: [_jsx(AlertDialogTitle, { children: "Are you sure?" }), _jsx(AlertDialogDescription, { children: "This action cannot be undone. This will permanently delete this entry from your history." })] }), _jsxs(AlertDialogFooter, { children: [_jsx(AlertDialogCancel, { children: "Cancel" }), _jsx(AlertDialogAction, { onClick: handleDelete, className: "bg-feedback-destructive text-feedback-destructive-foreground hover:bg-feedback-destructive/90", children: "Delete" })] })] })] })) : (_jsx("button", { onClick: () => navigate(-1), className: "text-sm text-text-secondary hover:text-text-primary hover:underline", children: "Cancel" }))] })] })) })] }));
}
