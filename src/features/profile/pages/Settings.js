import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Loader2, Upload, Lock, Mail, Smartphone, Download, Database, LayoutTemplate } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sanitizeUsername } from "@/lib/utils";
import { profileUpdateSchema } from "@/lib/validations/profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { useUserProfile } from "@/features/profile/hooks/useUserProfile";
import { LocationInput } from "@/components/ui/LocationInput";
import { NavigationBlocker } from "@/components/common/NavigationBlocker";
import { ManageFavoritesDialog } from "@/features/profile/components/ManageFavoritesDialog";
import { ManageHighlightsDialog } from "@/features/profile/components/ManageHighlightsDialog";
import { DisconnectArchitectDialog } from "@/features/profile/components/DisconnectArchitectDialog";
import { resizeImage } from "@/lib/image-compression";
export default function Settings() {
    const { user, loading: authLoading } = useAuth();
    const { profile, refetch: refetchProfile } = useUserProfile();
    const navigate = useNavigate();
    const locationHook = useLocation();
    const { toast } = useToast();
    const { isInstallable, isIOS, promptInstall } = usePwaInstall();
    const [loading, setLoading] = useState(false);
    const [username, setUsername] = useState("");
    const [bio, setBio] = useState("");
    const [country, setCountry] = useState("");
    const [location, setLocation] = useState("");
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [email, setEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [uploading, setUploading] = useState(false);
    // Favorites & Highlights
    const [favorites, setFavorites] = useState([]);
    const [showManageFavorites, setShowManageFavorites] = useState(false);
    const [showManageHighlights, setShowManageHighlights] = useState(false);
    const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [justSaved, setJustSaved] = useState(false);
    const [initialState, setInitialState] = useState(null);
    useEffect(() => {
        if (justSaved) {
            navigate("/profile");
        }
    }, [justSaved, navigate]);
    useEffect(() => {
        if (locationHook.hash && initialState) {
            const id = locationHook.hash.replace('#', '');
            const element = document.getElementById(id);
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
        }
    }, [locationHook.hash, initialState]);
    useEffect(() => {
        if (!authLoading && !user) {
            navigate("/auth");
        }
        else if (user && profile) {
            const emailVal = user.email || "";
            const usernameVal = profile.username || "";
            const bioVal = profile.bio || "";
            const avatarUrlVal = profile.avatar_url;
            const countryVal = profile.country || "";
            const locationVal = profile.location || "";
            setEmail(emailVal);
            setUsername(usernameVal);
            setBio(bioVal);
            setAvatarUrl(avatarUrlVal);
            setCountry(countryVal);
            setLocation(locationVal);
            setInitialState({
                username: usernameVal,
                bio: bioVal,
                country: countryVal,
                location: locationVal,
                avatarUrl: avatarUrlVal,
                email: emailVal,
            });
            // Fetch favorites
            const fetchFavorites = async () => {
                const { data } = await supabase
                    .from("profiles")
                    .select("favorites")
                    .eq("id", user.id)
                    .single();
                if (data?.favorites != null && Array.isArray(data.favorites)) {
                    setFavorites(data.favorites);
                }
                else {
                    setFavorites([]);
                }
            };
            fetchFavorites();
        }
    }, [user, authLoading, navigate, profile]);
    const isDirty = (() => {
        if (!initialState)
            return false;
        if (username !== initialState.username)
            return true;
        if (bio !== initialState.bio)
            return true;
        if (country !== initialState.country)
            return true;
        if (location !== initialState.location)
            return true;
        if (avatarUrl !== initialState.avatarUrl)
            return true;
        if (email !== initialState.email)
            return true;
        if (newPassword !== "")
            return true;
        return false;
    })();
    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        if (!user)
            return;
        const parsed = profileUpdateSchema.safeParse({
            username,
            bio: bio || undefined,
            country: country || undefined,
            location: location || undefined,
            avatar_url: avatarUrl === "" ? null : avatarUrl,
        });
        if (!parsed.success) {
            toast({
                variant: "destructive",
                title: "Validation error",
                description: parsed.error.issues[0]?.message ?? "Invalid profile data",
            });
            return;
        }
        setLoading(true);
        try {
            const v = parsed.data;
            // 1. Update Profile Data (Database)
            const { error: profileError } = await supabase
                .from("profiles")
                .update({
                username: v.username,
                bio: v.bio ?? null,
                country: v.country ?? null,
                location: v.location ?? null,
                avatar_url: v.avatar_url ?? null,
                updated_at: new Date().toISOString(),
            })
                .eq("id", user.id);
            if (profileError)
                throw profileError;
            // 2. Update Auth Data (Email/Password)
            const authUpdates = {};
            if (email !== user.email)
                authUpdates.email = email;
            if (newPassword)
                authUpdates.password = newPassword;
            if (Object.keys(authUpdates).length > 0) {
                const { error: authError } = await supabase.auth.updateUser(authUpdates);
                if (authError)
                    throw authError;
                if (authUpdates.email) {
                    toast({
                        title: "Check your email",
                        description: "A confirmation link has been sent to your new email address.",
                    });
                }
            }
            // Refetch profile to update context
            refetchProfile();
            toast({
                title: "Settings updated",
                description: "Your profile has been successfully updated.",
            });
            // Update initial state to prevent navigation blocker
            setInitialState({
                username,
                bio,
                country,
                location,
                avatarUrl,
                email,
            });
            setJustSaved(true);
            // Clear password field after update
            setNewPassword("");
        }
        catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error instanceof Error ? error.message : "Could not update settings. Please try again.",
            });
        }
        finally {
            setLoading(false);
        }
    };
    const handleAvatarUpload = async (event) => {
        try {
            setUploading(true);
            if (!event.target.files || event.target.files.length === 0) {
                throw new Error("You must select an image to upload.");
            }
            const rawFile = event.target.files[0];
            const file = await resizeImage(rawFile, 500, 500, 0.8);
            const fileExt = file.name.split(".").pop();
            const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(filePath, file);
            if (uploadError) {
                throw uploadError;
            }
            const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
            setAvatarUrl(data.publicUrl);
        }
        catch (_error) {
            toast({
                variant: "destructive",
                title: "Upload failed",
                description: "Make sure you have an 'avatars' public bucket in Supabase.",
            });
        }
        finally {
            setUploading(false);
        }
    };
    const handleSaveFavorites = async (newBuildingFavorites) => {
        if (!user)
            return;
        // Merge with non-building favorites
        const nonBuildingFavorites = favorites.filter(f => f.type && f.type !== 'building');
        const combined = [...newBuildingFavorites, ...nonBuildingFavorites];
        setFavorites(combined);
        try {
            const { error } = await supabase
                .from("profiles")
                .update({ favorites: combined })
                .eq("id", user.id);
            if (error)
                throw error;
            toast({ description: "Favorites updated successfully." });
        }
        catch (_error) {
            toast({ variant: "destructive", description: "Failed to save favorites." });
        }
    };
    const handleSaveHighlights = async (newHighlights) => {
        if (!user)
            return;
        // Merge with building favorites
        const buildingFavorites = favorites.filter(f => !f.type || f.type === 'building');
        const combined = [...buildingFavorites, ...newHighlights];
        setFavorites(combined);
        try {
            const { error } = await supabase
                .from("profiles")
                .update({ favorites: combined })
                .eq("id", user.id);
            if (error)
                throw error;
            toast({ description: "Highlights updated successfully." });
        }
        catch (_error) {
            toast({ variant: "destructive", description: "Failed to save highlights." });
        }
    };
    const handleExportData = async () => {
        if (!user)
            return;
        setExporting(true);
        try {
            const { data, error } = await supabase
                .from('user_buildings')
                .select(`
          rating,
          content,
          tags,
          status,
          visited_at,
          created_at,
          buildings (
            name,
            year_completed
          )
        `)
                .eq('user_id', user.id);
            if (error)
                throw error;
            if (!data || data.length === 0) {
                toast({
                    title: "No data found",
                    description: "You haven't rated or visited any buildings yet.",
                });
                return;
            }
            // Helper function to escape CSV fields
            const escapeCsvCell = (cell) => {
                if (cell === null || cell === undefined)
                    return "";
                const str = String(cell);
                if (str.includes(",") || str.includes("\n") || str.includes('"')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };
            // Helper to format date
            const formatDate = (dateStr) => {
                if (!dateStr)
                    return "";
                return new Date(dateStr).toISOString().split('T')[0];
            };
            // Generate CSV
            const headers = ["Name", "Year", "Rating", "Review", "Tags", "Status", "Date"];
            const rows = data.map((item) => {
                const bRaw = item.buildings;
                const b = Array.isArray(bRaw) ? bRaw[0] : bRaw;
                return [
                    escapeCsvCell(b?.name),
                    escapeCsvCell(b?.year_completed),
                    escapeCsvCell(item.rating),
                    escapeCsvCell(item.content),
                    escapeCsvCell(item.tags ? item.tags.join("|") : ""),
                    escapeCsvCell(item.status === "pending" ? "Bucket List" : "Visited"),
                    escapeCsvCell(formatDate(item.visited_at || item.created_at))
                ].join(",");
            });
            const csvContent = [headers.join(","), ...rows].join("\n");
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `archiforum-data-${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast({
                title: "Export complete",
                description: "Your data has been successfully downloaded.",
            });
        }
        catch (_error) {
            toast({
                variant: "destructive",
                title: "Export failed",
                description: "Could not export your data. Please try again.",
            });
        }
        finally {
            setExporting(false);
        }
    };
    if (authLoading)
        return null;
    return (_jsxs(AppLayout, { title: "Settings", showLogo: false, children: [_jsx(NavigationBlocker, { isDirty: isDirty }), _jsx("div", { className: "p-4 sm:p-6 lg:p-8 pb-20", children: _jsxs("div", { className: "max-w-2xl mx-auto", children: [_jsxs(Button, { variant: "ghost", className: "mb-6 pl-0 hover:bg-transparent", onClick: () => navigate("/profile"), children: [_jsx(ArrowLeft, { className: "h-4 w-4 mr-2" }), "Back to Profile"] }), _jsx("h1", { className: "text-4xl font-bold tracking-tight leading-tight text-text-primary mb-8", children: "Settings" }), _jsxs("div", { className: "flex flex-col items-center mb-8", children: [_jsxs(Avatar, { className: "h-24 w-24 mb-4", children: [_jsx(AvatarImage, { src: avatarUrl || undefined }), _jsx(AvatarFallback, { className: "text-2xl", children: username?.[0]?.toUpperCase() })] }), _jsxs("div", { className: "relative", children: [_jsx("input", { type: "file", id: "avatar-upload", accept: "image/*", className: "hidden", onChange: handleAvatarUpload, disabled: uploading }), _jsx(Button, { variant: "outline", size: "sm", asChild: true, children: _jsxs(Label, { htmlFor: "avatar-upload", className: "cursor-pointer inline-flex items-center gap-2", children: [uploading ? (_jsx(Loader2, { className: "h-4 w-4 animate-spin text-text-secondary" })) : (_jsx(Upload, { className: "h-4 w-4" })), "Change Photo"] }) })] })] }), _jsxs("form", { onSubmit: handleUpdateProfile, className: "space-y-6", children: [_jsxs("div", { className: "space-y-6", children: [_jsx("h2", { className: "text-xl font-semibold text-text-primary mb-6", children: "Public Profile" }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "username", children: "Username" }), _jsx(Input, { id: "username", value: username, onChange: (e) => setUsername(sanitizeUsername(e.target.value)), placeholder: "Your username", className: "max-w-sm" })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "bio", children: "Bio" }), _jsx(Textarea, { id: "bio", value: bio, onChange: (e) => setBio(e.target.value), placeholder: "Tell us about yourself...", className: "resize-none min-h-[100px] max-w-xl" })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "location", children: "Where do you live?" }), _jsx(LocationInput, { id: "location-input", value: location, onLocationSelected: (address, code) => {
                                                        setLocation(address);
                                                        if (code) {
                                                            setCountry(code);
                                                        }
                                                    }, placeholder: "e.g. New York, USA" }), _jsx("p", { className: "text-xs text-text-secondary mt-1", children: "This helps us personalize your experience." })] })] }), _jsx("div", { className: "mt-12 border-t border-border-default pt-8" }), _jsxs("div", { className: "space-y-6", children: [_jsxs("h2", { className: "text-xl font-semibold text-text-primary mb-6 flex items-center gap-2", children: [_jsx(LayoutTemplate, { className: "h-4 w-4" }), " Profile Customization"] }), _jsxs("div", { className: "p-4 border border-border-default rounded-sm bg-surface-card text-text-primary shadow-none space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-medium text-text-primary", children: "All-time Favourites" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Select up to 6 buildings to showcase on your profile." })] }), _jsx(Button, { type: "button", variant: "outline", onClick: () => setShowManageFavorites(true), children: "Manage" })] }), _jsx(Separator, {}), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-medium text-text-primary", children: "Highlights" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Add favorite styles, architects, and quotes." })] }), _jsx(Button, { type: "button", variant: "outline", onClick: () => setShowManageHighlights(true), children: "Manage" })] })] })] }), (isInstallable || isIOS) && (_jsxs(_Fragment, { children: [_jsx("div", { className: "mt-12 border-t border-border-default pt-8" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("h2", { className: "text-xl font-semibold text-text-primary mb-6 flex items-center gap-2", children: [_jsx(Smartphone, { className: "h-4 w-4" }), " App Experience"] }), _jsx("div", { className: "p-4 border border-border-default rounded-sm bg-surface-card text-text-primary shadow-none", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-medium text-text-primary", children: "Install App" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Add Plano to your home screen for easier access." })] }), _jsx(Button, { type: "button", variant: "outline", onClick: promptInstall, children: "Install" })] }) })] })] })), _jsx("div", { className: "mt-12 border-t border-border-default pt-8" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("h2", { className: "text-xl font-semibold text-text-primary mb-6 flex items-center gap-2", children: [_jsx(Lock, { className: "h-4 w-4" }), " Account & Security"] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "email", children: "Email Address" }), _jsxs("div", { className: "relative", children: [_jsx(Mail, { className: "absolute left-3 top-3 h-4 w-4 text-text-secondary" }), _jsx(Input, { id: "email", type: "email", value: email, onChange: (e) => setEmail(e.target.value), className: "pl-9 max-w-sm", placeholder: "your@email.com" })] }), _jsx("p", { className: "text-xs text-text-secondary mt-1", children: "Changing this will require verification on the new address." })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "password", children: "New Password" }), _jsx(Input, { id: "password", type: "password", value: newPassword, onChange: (e) => setNewPassword(e.target.value), placeholder: "Leave blank to keep current password" })] }), profile?.verified_architect_id && (_jsx("div", { className: "pt-4 mt-4 border-t border-border-default group", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-medium text-feedback-destructive", children: "Disconnect Architect Profile" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Unlink your account from your verified architect or studio profile." })] }), _jsx(Button, { type: "button", variant: "destructive", className: "opacity-0 group-hover:opacity-100 transition-opacity duration-150", onClick: () => setShowDisconnectDialog(true), children: "Disconnect" })] }) }))] }), _jsx("div", { className: "mt-12 border-t border-border-default pt-8" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("h2", { className: "text-lg font-semibold text-text-primary mb-6 flex items-center gap-2", children: [_jsx(Database, { className: "h-4 w-4" }), " Data & Privacy"] }), _jsx("div", { className: "p-4 border border-border-default rounded-sm bg-surface-card text-text-primary shadow-none", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-medium text-text-primary", children: "Download My Data" }), _jsx("p", { className: "text-sm text-text-secondary", children: "Export your ratings, reviews, and bucket list to a CSV file." })] }), _jsxs(Button, { type: "button", variant: "outline", onClick: handleExportData, disabled: exporting, children: [exporting ? (_jsx(Loader2, { className: "h-4 w-4 animate-spin mr-2" })) : (_jsx(Download, { className: "h-4 w-4 mr-2" })), "Export"] })] }) })] }), _jsx("div", { className: "flex items-center justify-end gap-3 pt-6 border-t border-border-default mt-6", children: _jsxs(Button, { type: "submit", variant: "default", disabled: loading, children: [loading && _jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin text-text-secondary" }), "Save Changes"] }) })] })] }) }), _jsx(ManageFavoritesDialog, { open: showManageFavorites, onOpenChange: setShowManageFavorites, favorites: favorites.filter(f => !f.type || f.type === 'building'), onSave: handleSaveFavorites }), _jsx(ManageHighlightsDialog, { open: showManageHighlights, onOpenChange: setShowManageHighlights, favorites: favorites, onSave: handleSaveHighlights }), profile?.verified_architect_id && (_jsx(DisconnectArchitectDialog, { open: showDisconnectDialog, onOpenChange: setShowDisconnectDialog, architectId: profile.verified_architect_id, onSuccess: () => {
                    refetchProfile();
                } }))] }));
}
