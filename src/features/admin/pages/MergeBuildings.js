import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Merge, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog";
function toAdminBuilding(b) {
    const architects = b.architects
        ?.map((row) => row?.architect)
        .filter((a) => Boolean(a)) ?? [];
    return { ...b, architects };
}
export default function MergeBuildings() {
    // Search State
    const [masterSearch, setMasterSearch] = useState("");
    const [dupSearch, setDupSearch] = useState("");
    const [masterResults, setMasterResults] = useState([]);
    const [dupResults, setDupResults] = useState([]);
    const [loadingMaster, setLoadingMaster] = useState(false);
    const [loadingDup, setLoadingDup] = useState(false);
    // Selection State
    const [selectedMaster, setSelectedMaster] = useState(null);
    const [selectedDup, setSelectedDup] = useState(null);
    // Potential Duplicates State
    const [potentialDuplicates, setPotentialDuplicates] = useState([]);
    const [loadingPotential, setLoadingPotential] = useState(false);
    // Merge State
    const [isMerging, setIsMerging] = useState(false);
    useEffect(() => {
        fetchPotentialDuplicates();
    }, []);
    const fetchPotentialDuplicates = async () => {
        setLoadingPotential(true);
        try {
            const { data, error } = await supabase.rpc('get_potential_duplicates', {
                limit_count: 20,
                similarity_threshold: 0.7
            });
            // RPC might fail if migration not applied, handle gracefully
            if (error) {
                return;
            }
            setPotentialDuplicates(data);
        }
        catch (_error) {
            toast.error("Failed to fetch potential duplicates");
        }
        finally {
            setLoadingPotential(false);
        }
    };
    const searchBuildings = async (query, setResults, setLoading) => {
        if (!query) {
            setResults([]);
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('buildings')
                .select('*, architects:building_architects(architect:architects(name, id))')
                .ilike('name', `%${query}%`)
                .eq('is_deleted', false)
                .limit(10);
            if (error)
                throw error;
            const transformedData = data.map(toAdminBuilding);
            setResults(transformedData);
        }
        catch (_error) {
        }
        finally {
            setLoading(false);
        }
    };
    // Debounced search (simplified)
    useEffect(() => {
        const timer = setTimeout(() => searchBuildings(masterSearch, setMasterResults, setLoadingMaster), 500);
        return () => clearTimeout(timer);
    }, [masterSearch]);
    useEffect(() => {
        const timer = setTimeout(() => searchBuildings(dupSearch, setDupResults, setLoadingDup), 500);
        return () => clearTimeout(timer);
    }, [dupSearch]);
    const handleMerge = async () => {
        if (!selectedMaster || !selectedDup)
            return;
        setIsMerging(true);
        try {
            const { error } = await supabase.rpc('merge_buildings', {
                master_id: selectedMaster.id,
                duplicate_id: selectedDup.id
            });
            if (error)
                throw error;
            // Restore explicit soft delete (redundant with RPC but ensures safety)
            await supabase.from('buildings').update({ is_deleted: true }).eq('id', selectedDup.id);
            toast.success(`Successfully merged "${selectedDup.name}" into "${selectedMaster.name}"`);
            // Reset
            setSelectedDup(null);
            setDupSearch("");
            setDupResults([]);
            fetchPotentialDuplicates(); // Refresh list
        }
        catch (_error) {
            toast.error("Failed to merge buildings. Ensure SQL migration is applied.");
        }
        finally {
            setIsMerging(false);
        }
    };
    const loadPair = async (id1, id2) => {
        // Fetch both buildings full details
        try {
            const { data: rawData, error: loadError } = await supabase
                .from('buildings')
                .select('*, architects:building_architects(architect:architects(name, id))')
                .in('id', [id1, id2]);
            if (loadError)
                throw loadError;
            const transformed = rawData.map(toAdminBuilding);
            const b1 = transformed.find(b => b.id === id1);
            const b2 = transformed.find(b => b.id === id2);
            if (b1)
                setSelectedMaster(b1);
            if (b2)
                setSelectedDup(b2);
            // Scroll up
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        catch (_error) {
            toast.error("Failed to load building pair");
        }
    };
    const BuildingCard = ({ building, type }) => (_jsxs(Card, { className: `border-2 ${type === "master" ? "border-green-100 bg-green-50/20" : "border-red-100 bg-red-50/20"}`, children: [_jsxs(CardHeader, { className: "pb-2", children: [_jsxs("div", { className: "flex justify-between items-start", children: [_jsx(Badge, { variant: type === "master" ? "default" : "destructive", children: type === "master" ? "MASTER (To Keep)" : "DUPLICATE (To Delete)" }), building.is_verified && _jsx(Badge, { variant: "outline", className: "border-green-500 text-green-600", children: "Verified" })] }), _jsx(CardTitle, { className: "mt-2 break-words leading-tight", children: building.name }), _jsxs(CardDescription, { className: "line-clamp-1", title: `${building.year_completed || "Unknown Year"} • ${building.city || "Unknown City"}, ${building.country || "Unknown Country"}`, children: [building.year_completed || "Unknown Year", " \u2022 ", building.city || "Unknown City", ", ", building.country || "Unknown Country"] })] }), _jsxs(CardContent, { className: "text-sm space-y-2", children: [building.address && _jsx("div", { className: "text-text-secondary line-clamp-2", title: building.address, children: building.address }), building.architects && Array.isArray(building.architects) && building.architects.length > 0 && (_jsxs("div", { className: "line-clamp-2", children: ["Architects: ", building.architects.map((a) => a.name).join(", ")] })), _jsxs("div", { className: "text-xs text-text-secondary break-all", children: ["ID: ", building.id] })] })] }));
    return (_jsxs("div", { className: "space-y-8 p-6 max-w-7xl mx-auto", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold tracking-tight", children: "Merge Buildings" }), _jsx("p", { className: "text-text-secondary", children: "Consolidate duplicate records safely." })] }), _jsxs(Button, { variant: "outline", onClick: fetchPotentialDuplicates, disabled: loadingPotential, children: [_jsx(RefreshCw, { className: `mr-2 h-4 w-4 ${loadingPotential ? "animate-spin" : ""}` }), "Refresh Suggestions"] })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-8 items-start", children: [_jsxs("div", { className: "space-y-4", children: [_jsxs("h2", { className: "text-lg font-semibold flex items-center text-green-700", children: [_jsx("div", { className: "w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-2 text-green-700", children: "1" }), "Select Master Record"] }), _jsxs("div", { className: "relative", children: [_jsx(Input, { placeholder: "Search for the correct record...", value: masterSearch, onChange: e => setMasterSearch(e.target.value) }), loadingMaster && _jsx(Loader2, { className: "absolute right-3 top-3 h-4 w-4 animate-spin text-text-secondary" }), masterSearch && !selectedMaster && masterResults.length > 0 && (_jsx("div", { className: "absolute z-10 w-full mt-1 bg-surface-overlay border rounded-md shadow-lg max-h-60 overflow-y-auto", children: masterResults.map(b => (_jsxs("div", { className: "p-2 hover:bg-brand-secondary cursor-pointer flex justify-between items-center gap-2", onClick: () => { setSelectedMaster(b); setMasterSearch(""); }, children: [_jsx("span", { className: "truncate font-medium", children: b.name }), _jsx("span", { className: "text-text-secondary text-xs whitespace-nowrap", children: b.city })] }, b.id))) }))] }), selectedMaster ? (_jsxs("div", { className: "relative group", children: [_jsx(BuildingCard, { building: selectedMaster, type: "master" }), _jsx(Button, { variant: "ghost", size: "sm", className: "absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity", onClick: () => setSelectedMaster(null), children: "Change" })] })) : (_jsx("div", { className: "h-40 border-2 border-dashed rounded-lg flex items-center justify-center text-text-secondary bg-surface-muted/30", children: "No Master Selected" }))] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("h2", { className: "text-lg font-semibold flex items-center text-red-700", children: [_jsx("div", { className: "w-8 h-8 rounded-full bg-red-100 flex items-center justify-center mr-2 text-red-700", children: "2" }), "Select Duplicate Record"] }), _jsxs("div", { className: "relative", children: [_jsx(Input, { placeholder: "Search for the duplicate record...", value: dupSearch, onChange: e => setDupSearch(e.target.value) }), loadingDup && _jsx(Loader2, { className: "absolute right-3 top-3 h-4 w-4 animate-spin text-text-secondary" }), dupSearch && !selectedDup && dupResults.length > 0 && (_jsx("div", { className: "absolute z-10 w-full mt-1 bg-surface-overlay border rounded-md shadow-lg max-h-60 overflow-y-auto", children: dupResults.map(b => (_jsxs("div", { className: "p-2 hover:bg-brand-secondary cursor-pointer flex justify-between items-center gap-2", onClick: () => { setSelectedDup(b); setDupSearch(""); }, children: [_jsx("span", { className: "truncate font-medium", children: b.name }), _jsx("span", { className: "text-text-secondary text-xs whitespace-nowrap", children: b.city })] }, b.id))) }))] }), selectedDup ? (_jsxs("div", { className: "relative group", children: [_jsx(BuildingCard, { building: selectedDup, type: "duplicate" }), _jsx(Button, { variant: "ghost", size: "sm", className: "absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity", onClick: () => setSelectedDup(null), children: "Change" })] })) : (_jsx("div", { className: "h-40 border-2 border-dashed rounded-lg flex items-center justify-center text-text-secondary bg-surface-muted/30", children: "No Duplicate Selected" }))] })] }), _jsx("div", { className: "flex justify-center py-6", children: _jsxs(AlertDialog, { children: [_jsx(AlertDialogTrigger, { asChild: true, children: _jsxs(Button, { size: "lg", disabled: !selectedMaster || !selectedDup || isMerging || selectedMaster.id === selectedDup.id, className: "bg-purple-600 hover:bg-purple-700 text-white gap-2", children: [isMerging ? _jsx(Loader2, { className: "h-5 w-5 animate-spin" }) : _jsx(Merge, { className: "h-5 w-5" }), "Merge Records"] }) }), _jsxs(AlertDialogContent, { children: [_jsxs(AlertDialogHeader, { children: [_jsx(AlertDialogTitle, { children: "Are you absolutely sure?" }), _jsxs(AlertDialogDescription, { children: ["This will migrate all reviews, photos, and associations from ", _jsx("strong", { children: selectedDup?.name }), " to ", _jsx("strong", { children: selectedMaster?.name }), ".", _jsx("br", {}), _jsx("br", {}), "The duplicate record will be soft-deleted. This action cannot be easily undone via UI."] })] }), _jsxs(AlertDialogFooter, { children: [_jsx(AlertDialogCancel, { children: "Cancel" }), _jsx(AlertDialogAction, { onClick: handleMerge, className: "bg-purple-600 hover:bg-purple-700", children: "Confirm Merge" })] })] })] }) }), _jsxs("div", { className: "space-y-4 pt-8 border-t", children: [_jsx("h3", { className: "text-xl font-semibold", children: "Potential Duplicates" }), _jsx(ScrollArea, { className: "h-96 rounded-md border p-4", children: potentialDuplicates.length === 0 ? (_jsx("div", { className: "text-center text-text-secondary py-8", children: loadingPotential ? "Scanning for duplicates..." : "No potential duplicates found." })) : (_jsx("div", { className: "space-y-2", children: potentialDuplicates.map((pair, idx) => (_jsxs("div", { className: "flex items-center justify-between p-3 bg-surface-card border rounded-md hover:bg-brand-secondary/50 transition-colors", children: [_jsxs("div", { className: "flex items-center gap-4 flex-1", children: [_jsxs("div", { className: "flex-1 text-right", children: [_jsx("div", { className: "font-medium", children: pair.name1 }), _jsxs("div", { className: "text-xs text-text-secondary", children: [pair.id1.slice(0, 8), "..."] })] }), _jsxs("div", { className: "text-text-secondary font-mono text-xs bg-surface-muted px-2 py-1 rounded", children: [Math.round(pair.score * 100), "% Match"] }), _jsxs("div", { className: "flex-1 text-left", children: [_jsx("div", { className: "font-medium", children: pair.name2 }), _jsxs("div", { className: "text-xs text-text-secondary", children: [pair.id2.slice(0, 8), "..."] })] })] }), _jsx("div", { className: "flex gap-2 ml-4", children: _jsx(Button, { size: "sm", variant: "outline", onClick: () => loadPair(pair.id1, pair.id2), children: "Compare" }) })] }, idx))) })) })] })] }));
}
