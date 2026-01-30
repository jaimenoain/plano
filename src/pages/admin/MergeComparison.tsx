import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminBuilding } from "@/types/admin_building";
import { useAuth } from "@/hooks/useAuth";
import { getBuildingUrl } from "@/utils/url";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeftRight, Check, Trash2, ArrowLeft, AlertTriangle, Image as ImageIcon, Pencil, Save, X } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArchitectSelect, Architect as SelectArchitect } from "@/components/ui/architect-select";
import { SessionMap } from "@/components/groups/SessionMap";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface ComparisonBuilding extends Omit<AdminBuilding, 'architects'> {
    architects: { id: string; name: string; type?: 'individual' | 'studio' }[];
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

    // Review Images
    const [reviewImages, setReviewImages] = useState<Record<string, string[]>>({});

    // Impact Stats
    const [impact, setImpact] = useState({ reviews: 0, photos: 0 });
    const [impactLoading, setImpactLoading] = useState(false);

    // Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<ComparisonBuilding | null>(null);

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
                .select('*, architects:building_architects(architect:architects(name, id, type))')
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

            // Fetch review images
            const { data: images } = await supabase
                .from('review_images')
                .select('building_id, storage_path')
                .in('building_id', [id1, id2]);

            if (images) {
                const imgMap: Record<string, string[]> = {};
                images.forEach((img) => {
                    if (img.storage_path) {
                        if (!imgMap[img.building_id]) imgMap[img.building_id] = [];
                        const fullUrl = getBuildingImageUrl(img.storage_path);
                        if (fullUrl) imgMap[img.building_id].push(fullUrl);
                    }
                });
                setReviewImages(imgMap);
            }
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
        setIsEditing(false); // Reset edit mode
        const temp = targetPointer;
        setTargetPointer(sourcePointer);
        setSourcePointer(temp);
    };

    const handleEditStart = () => {
        const target = buildings.find(b => b.id === targetPointer);
        if (target) {
            // Deep copy to avoid mutating state directly
            setEditForm(JSON.parse(JSON.stringify(target)));
            setIsEditing(true);
        }
    };

    const handleEditSave = async () => {
        if (!editForm || !targetPointer) return;

        try {
            // 1. Update scalar fields
            const { error: buildError } = await supabase
                .from('buildings')
                .update({
                    name: editForm.name,
                    city: editForm.city,
                    address: editForm.address,
                    year_completed: editForm.year_completed
                })
                .eq('id', targetPointer);

            if (buildError) throw buildError;

            // 2. Update Architects
            // First delete existing
            const { error: delError } = await supabase
                .from('building_architects')
                .delete()
                .eq('building_id', targetPointer);

            if (delError) throw delError;

            // Then insert new
            if (editForm.architects && editForm.architects.length > 0) {
                const { error: insError } = await supabase
                    .from('building_architects')
                    .insert(
                        editForm.architects.map(a => ({
                            building_id: targetPointer,
                            architect_id: a.id
                        }))
                    );

                if (insError) throw insError;
            }

            // 3. Update local state
            setBuildings(prev => prev.map(b => b.id === targetPointer ? editForm : b));
            setIsEditing(false);
            toast.success("Target building updated successfully");

        } catch (error) {
            console.error("Error updating building:", error);
            // @ts-ignore
            toast.error("Failed to update building: " + error.message);
        }
    };

    const handleMerge = async () => {
        if (!targetPointer || !sourcePointer || !user) return;

        setMerging(true);
        try {
            const { error } = await supabase.rpc('merge_buildings', {
                target_id: targetPointer,
                source_id: sourcePointer
            });

            if (error) throw error;

            // Ensure soft delete is marked (redundant safety)
            await supabase.from('buildings').update({ is_deleted: true }).eq('id', sourcePointer);

            // Audit Log
            try {
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
            } catch (auditError) {
                console.warn("Failed to create audit log entry:", auditError);
            }

            // Notify other admins (via Recommendation proxy to appear in notifications)
            const { data: admins } = await supabase
                .from('profiles')
                .select('id')
                .eq('role', 'admin')
                .neq('id', user.id);

            if (admins && admins.length > 0) {
                // Create recommendations
                const recommendations = admins.map(admin => ({
                    recommender_id: user.id,
                    recipient_id: admin.id,
                    building_id: targetPointer,
                    status: 'pending' as const
                }));

                const { data: insertedRecs, error: recError } = await supabase
                    .from('recommendations')
                    .insert(recommendations)
                    .select();

                if (!recError && insertedRecs) {
                    // Create notifications
                    const notifications = insertedRecs.map(rec => ({
                        type: 'recommendation' as const,
                        actor_id: user.id,
                        user_id: rec.recipient_id,
                        recommendation_id: rec.id
                    }));

                    await supabase.from('notifications').insert(notifications);
                }
            }

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

    if (!targetBuilding || !sourceBuilding) {
        return (
            <div className="container mx-auto py-8 px-4 max-w-7xl flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <AlertTriangle className="h-16 w-16 text-muted-foreground opacity-20" />
                <h2 className="text-xl font-semibold text-muted-foreground">Buildings not found</h2>
                <Button onClick={() => navigate('/admin/merge')}>Return to Merge Tool</Button>
            </div>
        );
    }

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
                        <div className="flex items-center gap-2">
                             {!isEditing ? (
                                <Button size="sm" variant="ghost" onClick={handleEditStart} className="h-7 px-2 text-green-800 hover:text-green-900 hover:bg-green-200/50">
                                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                                </Button>
                             ) : (
                                 <div className="flex gap-1">
                                     <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-100/50">
                                         <X className="h-3.5 w-3.5 mr-1" /> Cancel
                                     </Button>
                                     <Button size="sm" variant="default" onClick={handleEditSave} className="h-7 px-2 bg-green-600 hover:bg-green-700">
                                         <Save className="h-3.5 w-3.5 mr-1" /> Save
                                     </Button>
                                 </div>
                             )}
                            <Badge className="bg-green-600 hover:bg-green-700 hidden sm:inline-flex">Surviving</Badge>
                        </div>
                    </div>
                    <div className="aspect-video w-full bg-muted relative overflow-hidden group">
                        {targetBuilding.hero_image ? (
                            <img
                                src={getBuildingImageUrl(targetBuilding.hero_image)}
                                alt={targetBuilding.name}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50 bg-muted/50">
                                <ImageIcon className="h-12 w-12 mb-2" />
                                <span className="text-sm font-medium">No Image</span>
                            </div>
                        )}
                    </div>
                    <CardContent className="p-6 space-y-4">
                        {isEditing && editForm ? (
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground font-semibold uppercase">Name</div>
                                    <Input
                                        value={editForm.name}
                                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                        className="bg-white"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground font-semibold uppercase">Architect</div>
                                    <ArchitectSelect
                                        selectedArchitects={editForm.architects as SelectArchitect[]}
                                        setSelectedArchitects={(a) => setEditForm({ ...editForm, architects: a })}
                                        placeholder="Select architects..."
                                        className="bg-white"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <div className="text-xs text-muted-foreground font-semibold uppercase">Year</div>
                                        <Input
                                            type="number"
                                            value={editForm.year_completed || ''}
                                            onChange={e => setEditForm({ ...editForm, year_completed: e.target.value ? parseInt(e.target.value) : null })}
                                            className="bg-white"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-xs text-muted-foreground font-semibold uppercase">City</div>
                                        <Input
                                            value={editForm.city || ''}
                                            onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                                            className="bg-white"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground font-semibold uppercase">Address</div>
                                    <Textarea
                                        value={editForm.address || ''}
                                        onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                                        className="bg-white min-h-[60px]"
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Name</div>
                                    <div className="text-xl font-bold truncate" title={targetBuilding.name}>{targetBuilding.name}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Architect</div>
                                    <div className="text-lg truncate">
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
                                        <div className="truncate" title={targetBuilding.city || ""}>{targetBuilding.city || "N/A"}</div>
                                    </div>
                                </div>
                                <div>
                                     <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Address</div>
                                     <div className="text-sm break-words line-clamp-2" title={targetBuilding.address || ""}>{targetBuilding.address || "N/A"}</div>
                                </div>
                            </>
                        )}

                        {targetBuilding.location && (
                            <div className="space-y-1 pt-2">
                                <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Location</div>
                                <SessionMap
                                    buildings={[{ ...targetBuilding, main_image_url: targetBuilding.hero_image }]}
                                    interactive={false}
                                    className="w-full h-48 rounded-md border border-border"
                                />
                            </div>
                        )}

                        {reviewImages[targetBuilding.id]?.length > 0 && (
                            <div className="space-y-2 pt-2">
                                <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Review Images</div>
                                <Carousel className="w-full max-w-full relative group/carousel">
                                    <CarouselContent className="-ml-2">
                                        {reviewImages[targetBuilding.id].map((url, idx) => (
                                            <CarouselItem key={idx} className="pl-2 basis-1/3 md:basis-1/4">
                                                <div className="aspect-square relative overflow-hidden rounded-md border bg-muted">
                                                    <img src={url} alt={`Review ${idx}`} className="object-cover w-full h-full" />
                                                </div>
                                            </CarouselItem>
                                        ))}
                                    </CarouselContent>
                                    <CarouselPrevious className="left-1 h-6 w-6 opacity-0 group-hover/carousel:opacity-100 transition-opacity" />
                                    <CarouselNext className="right-1 h-6 w-6 opacity-0 group-hover/carousel:opacity-100 transition-opacity" />
                                </Carousel>
                            </div>
                        )}

                        <div className="pt-4 border-t border-green-200">
                             <div className="text-xs font-mono text-green-700/70 truncate" title={targetBuilding.id}>{targetBuilding.id}</div>
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
                    <div className="aspect-video w-full bg-muted relative overflow-hidden group">
                        {sourceBuilding.hero_image ? (
                            <img
                                src={getBuildingImageUrl(sourceBuilding.hero_image)}
                                alt={sourceBuilding.name}
                                className="w-full h-full object-cover grayscale opacity-90 transition-transform group-hover:scale-105 duration-500"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50 bg-muted/50">
                                <ImageIcon className="h-12 w-12 mb-2" />
                                <span className="text-sm font-medium">No Image</span>
                            </div>
                        )}
                         <div className="absolute inset-0 bg-red-500/10 mix-blend-multiply" />
                    </div>
                    <CardContent className="p-6 space-y-4">
                        <div>
                            <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Name</div>
                            <div className="text-xl font-bold text-red-900/80 line-through decoration-red-500/50 truncate" title={sourceBuilding.name}>{sourceBuilding.name}</div>
                        </div>
                        <div>
                            <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Architect</div>
                            <div className="text-lg text-red-900/80 truncate">
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
                                <div className="text-red-900/80 truncate" title={sourceBuilding.city || ""}>{sourceBuilding.city || "N/A"}</div>
                            </div>
                        </div>
                        <div>
                             <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Address</div>
                             <div className="text-sm text-red-900/80 break-words line-clamp-2" title={sourceBuilding.address || ""}>{sourceBuilding.address || "N/A"}</div>
                        </div>

                        {sourceBuilding.location && (
                            <div className="space-y-1 pt-2">
                                <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Location</div>
                                <SessionMap
                                    buildings={[{ ...sourceBuilding, main_image_url: sourceBuilding.hero_image }]}
                                    interactive={false}
                                    className="w-full h-48 rounded-md border border-red-200"
                                />
                            </div>
                        )}

                        {reviewImages[sourceBuilding.id]?.length > 0 && (
                            <div className="space-y-2 pt-2">
                                <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Review Images</div>
                                <Carousel className="w-full max-w-full relative group/carousel">
                                    <CarouselContent className="-ml-2">
                                        {reviewImages[sourceBuilding.id].map((url, idx) => (
                                            <CarouselItem key={idx} className="pl-2 basis-1/3 md:basis-1/4">
                                                <div className="aspect-square relative overflow-hidden rounded-md border bg-muted">
                                                    <img src={url} alt={`Review ${idx}`} className="object-cover w-full h-full" />
                                                </div>
                                            </CarouselItem>
                                        ))}
                                    </CarouselContent>
                                    <CarouselPrevious className="left-1 h-6 w-6 opacity-0 group-hover/carousel:opacity-100 transition-opacity" />
                                    <CarouselNext className="right-1 h-6 w-6 opacity-0 group-hover/carousel:opacity-100 transition-opacity" />
                                </Carousel>
                            </div>
                        )}

                         <div className="pt-4 border-t border-red-200">
                             <div className="text-xs font-mono text-red-700/70 truncate" title={sourceBuilding.id}>{sourceBuilding.id}</div>
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
                                        <Button
                                            size="lg"
                                            variant="destructive"
                                            className="px-8 h-14 text-lg shadow-lg hover:shadow-xl transition-all"
                                            disabled={merging || impactLoading}
                                        >
                                            {merging ? <Loader2 className="animate-spin mr-2" /> : "Confirm and Unify"}
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
