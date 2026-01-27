import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminBuilding } from "@/types/admin_building";
import { useAuth } from "@/hooks/useAuth";
import { getBuildingUrl } from "@/utils/url";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeftRight, Check, Trash2, ArrowLeft, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getBuildingImageUrl } from "@/utils/image";

interface ComparisonBuilding extends AdminBuilding {
    // Add any specific extra fields if needed
}

export default function MergeComparison() {
    const { targetId, sourceId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [merging, setMerging] = useState(false);

    // We store the raw buildings and then decide which is target/source based on state
    const [buildings, setBuildings] = useState<ComparisonBuilding[]>([]);

    // Pointers to IDs
    const [targetPointer, setTargetPointer] = useState<string | null>(targetId || null);
    const [sourcePointer, setSourcePointer] = useState<string | null>(sourceId || null);

    // Impact Stats
    const [impact, setImpact] = useState({ reviews: 0, photos: 0 });
    const [impactLoading, setImpactLoading] = useState(false);

    useEffect(() => {
        if (targetId && sourceId) {
            fetchBuildings(targetId, sourceId);
        }
    }, [targetId, sourceId]);

    // Re-fetch impact when source changes
    useEffect(() => {
        if (sourcePointer) {
            fetchImpact(sourcePointer);
        }
    }, [sourcePointer]);

    const fetchBuildings = async (id1: string, id2: string) => {
        setLoading(true);
        try {
            // @ts-ignore
            const { data, error } = await supabase
                .from('buildings')
                .select('*, architects:building_architects(architect:architects(name, id))')
                .in('id', [id1, id2]);

            if (error) throw error;

            const transformed = data.map((b: any) => ({
                ...b,
                architects: b.architects?.map((a: any) => a.architect).filter(Boolean) || []
            })) as ComparisonBuilding[];

            if (transformed.length !== 2) {
                toast.error("Could not find both buildings");
                // navigate('/admin/merge'); // Optional: redirect back
                return;
            }

            setBuildings(transformed);
        } catch (error) {
            console.error("Error fetching buildings:", error);
            toast.error("Failed to load buildings");
        } finally {
            setLoading(false);
        }
    };

    const fetchImpact = async (sourceId: string) => {
        setImpactLoading(true);
        try {
            const [reviews, photos] = await Promise.all([
                supabase.from('user_buildings').select('*', { count: 'exact', head: true }).eq('building_id', sourceId),
                supabase.from('review_images').select('*', { count: 'exact', head: true }).eq('building_id', sourceId)
            ]);

            setImpact({
                reviews: reviews.count || 0,
                photos: photos.count || 0
            });
        } catch (e) {
            console.error(e);
        } finally {
            setImpactLoading(false);
        }
    };

    const handleSwap = () => {
        const temp = targetPointer;
        setTargetPointer(sourcePointer);
        setSourcePointer(temp);
    };

    const handleMerge = async () => {
        if (!targetPointer || !sourcePointer || !user) return;

        setMerging(true);
        try {
            const { error } = await supabase.rpc('merge_buildings', {
                master_id: targetPointer,
                duplicate_id: sourcePointer
            });

            if (error) throw error;

            // Ensure soft delete is marked (redundant safety)
            await supabase.from('buildings').update({ is_deleted: true }).eq('id', sourcePointer);

            // Audit Log
            await supabase.from('admin_audit_logs').insert({
                admin_id: user.id,
                action_type: 'merge_buildings',
                target_type: 'buildings',
                target_id: targetPointer,
                details: {
                    merged_source_id: sourcePointer,
                    source_name: buildings.find(b => b.id === sourcePointer)?.name
                }
            });

            toast.success("Buildings merged successfully. Redirecting...");

            // Redirect to survivor
            const target = buildings.find(b => b.id === targetPointer);
            // @ts-ignore
            navigate(getBuildingUrl(targetPointer, target?.slug, target?.short_id));

        } catch (error) {
            console.error("Merge failed:", error);
            // @ts-ignore
            toast.error("Merge failed: " + error.message);
        } finally {
            setMerging(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const targetBuilding = buildings.find(b => b.id === targetPointer);
    const sourceBuilding = buildings.find(b => b.id === sourcePointer);

    if (!targetBuilding || !sourceBuilding) return <div>Error: Buildings not found</div>;

    return (
        <div className="container mx-auto py-8 px-4 max-w-7xl">
            <div className="mb-6 flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate('/admin/merge')}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Compare & Merge</h1>
                    <p className="text-muted-foreground">Review details and confirm merge direction.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto,1fr] gap-6 items-start">

                {/* TARGET COLUMN (KEEP) */}
                <Card className="border-2 border-green-200 bg-green-50/30 overflow-hidden shadow-sm">
                    <div className="bg-green-100/80 p-3 text-green-800 font-bold flex justify-between items-center border-b border-green-200">
                        <span className="flex items-center gap-2"><Check className="h-5 w-5" /> TARGET (KEEP)</span>
                        <Badge className="bg-green-600 hover:bg-green-700">Surviving Record</Badge>
                    </div>
                    <div className="aspect-video w-full bg-muted relative overflow-hidden">
                        {targetBuilding.hero_image ? (
                            <img
                                src={getBuildingImageUrl(targetBuilding.hero_image)}
                                alt={targetBuilding.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">No Image</div>
                        )}
                    </div>
                    <CardContent className="p-6 space-y-4">
                        <div>
                            <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Name</div>
                            <div className="text-xl font-bold">{targetBuilding.name}</div>
                        </div>
                        <div>
                            <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Architect</div>
                            <div className="text-lg">
                                {targetBuilding.architects?.map(a => a.name).join(", ") || "Unknown Architect"}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Year</div>
                                <div>{targetBuilding.year_completed || "N/A"}</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">City</div>
                                <div>{targetBuilding.city || "N/A"}</div>
                            </div>
                        </div>
                        <div>
                             <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Address</div>
                             <div className="text-sm">{targetBuilding.address || "N/A"}</div>
                        </div>
                        <div className="pt-4 border-t border-green-200">
                             <div className="text-xs font-mono text-green-700/70">{targetBuilding.id}</div>
                        </div>
                    </CardContent>
                </Card>

                {/* SWAP CONTROLS */}
                <div className="flex flex-col items-center justify-center h-full py-12 lg:py-0 sticky top-20">
                    <Button
                        size="icon"
                        variant="outline"
                        className="rounded-full h-12 w-12 border-2 border-purple-200 bg-white hover:bg-purple-50 shadow-md transition-transform hover:scale-110 active:scale-95"
                        onClick={handleSwap}
                        title="Swap Direction"
                    >
                        <ArrowLeftRight className="h-6 w-6 text-purple-600" />
                    </Button>
                    <div className="mt-2 text-xs font-medium text-muted-foreground uppercase tracking-widest">Swap</div>
                </div>

                {/* SOURCE COLUMN (REMOVE) */}
                <Card className="border-2 border-red-200 bg-red-50/30 overflow-hidden shadow-sm">
                    <div className="bg-red-100/80 p-3 text-red-800 font-bold flex justify-between items-center border-b border-red-200">
                        <span className="flex items-center gap-2"><Trash2 className="h-5 w-5" /> SOURCE (REMOVE)</span>
                        <Badge variant="destructive">Will be Deleted</Badge>
                    </div>
                     <div className="aspect-video w-full bg-muted relative overflow-hidden">
                        {sourceBuilding.hero_image ? (
                            <img
                                src={getBuildingImageUrl(sourceBuilding.hero_image)}
                                alt={sourceBuilding.name}
                                className="w-full h-full object-cover grayscale opacity-90"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">No Image</div>
                        )}
                         <div className="absolute inset-0 bg-red-500/10 mix-blend-multiply" />
                    </div>
                    <CardContent className="p-6 space-y-4">
                        <div>
                            <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Name</div>
                            <div className="text-xl font-bold text-red-900/80 line-through decoration-red-500/50">{sourceBuilding.name}</div>
                        </div>
                        <div>
                            <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Architect</div>
                            <div className="text-lg text-red-900/80">
                                {sourceBuilding.architects?.map(a => a.name).join(", ") || "Unknown Architect"}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Year</div>
                                <div className="text-red-900/80">{sourceBuilding.year_completed || "N/A"}</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">City</div>
                                <div className="text-red-900/80">{sourceBuilding.city || "N/A"}</div>
                            </div>
                        </div>
                        <div>
                             <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Address</div>
                             <div className="text-sm text-red-900/80">{sourceBuilding.address || "N/A"}</div>
                        </div>
                         <div className="pt-4 border-t border-red-200">
                             <div className="text-xs font-mono text-red-700/70">{sourceBuilding.id}</div>
                        </div>
                    </CardContent>
                </Card>

            </div>

            {/* IMPACT & ACTIONS */}
            <div className="mt-8">
                <Card className="border-t-4 border-t-purple-500 shadow-md">
                    <CardContent className="p-8">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                            <div className="space-y-2 flex-1">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                                    Merge Impact Summary
                                </h3>
                                <p className="text-muted-foreground text-lg">
                                    You are about to merge <strong>{sourceBuilding.name}</strong> into <strong>{targetBuilding.name}</strong>.
                                </p>
                                <div className="flex items-center gap-4 mt-2">
                                    <Badge variant="secondary" className="text-sm px-3 py-1">
                                        Moving {impactLoading ? "..." : impact.photos} Photos
                                    </Badge>
                                    <Badge variant="secondary" className="text-sm px-3 py-1">
                                        Moving {impactLoading ? "..." : impact.reviews} Reviews/Visits
                                    </Badge>
                                </div>
                            </div>

                            <div>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button size="lg" variant="destructive" className="px-8 h-14 text-lg shadow-lg hover:shadow-xl transition-all">
                                            Confirm and Unify
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Irreversible Action</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to merge these buildings?
                                                <br/><br/>
                                                <strong>{sourceBuilding.name}</strong> will be marked as deleted.
                                                <br/>
                                                All its content will belong to <strong>{targetBuilding.name}</strong>.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleMerge} className="bg-red-600 hover:bg-red-700">
                                                {merging ? <Loader2 className="animate-spin mr-2" /> : null}
                                                Yes, Merge Buildings
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
