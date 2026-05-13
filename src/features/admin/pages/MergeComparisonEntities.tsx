import { lazy, Suspense, useState, useEffect } from "react";
import { useParams, useNavigate, type MetaFunction } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  ArrowLeftRight, 
  Check, 
  Trash2, 
  ArrowLeft, 
  AlertTriangle, 
  ImageIcon, 
  ChevronRight,
  Building2,
  User,
  Briefcase,
  MapPin,
  Merge
} from "lucide-react";
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
import { EntityType } from "../types/merge";
import { motion, AnimatePresence } from "framer-motion";

const BuildingMap = lazy(() =>
  import("@/features/admin/components/BuildingMap").then((m) => ({ default: m.BuildingMap })),
);

export const meta: MetaFunction = () => [
  { title: "Entity Merge Comparison | Plano Admin" },
  { name: "robots", content: "noindex, nofollow" },
];

export default function MergeComparisonEntities() {
    const { entityType, targetId, sourceId } = useParams<{ entityType: EntityType, targetId: string, sourceId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [merging, setMerging] = useState(false);
    const [entities, setEntities] = useState<any[]>([]);
    
    // Pointers to IDs
    const [targetPointer, setTargetPointer] = useState<string | null>(targetId || null);
    const [sourcePointer, setSourcePointer] = useState<string | null>(sourceId || null);

    // Impact Stats
    const [impact, setImpact] = useState<Record<string, number>>({});
    const [impactLoading, setImpactLoading] = useState(false);

    // Building Specifics
    const [reviewImages, setReviewImages] = useState<any[]>([]);

    useEffect(() => {
        if (targetPointer && sourcePointer && entityType) {
            fetchEntities();
            fetchImpact();
            if (entityType === "building") {
              fetchReviewImages();
            }
        }
    }, [targetPointer, sourcePointer, entityType]);

    const fetchEntities = async () => {
        setLoading(true);
        try {
            let table = "";
            if (entityType === "building") table = "buildings";
            else if (entityType === "person") table = "people";
            else if (entityType === "company") table = "companies";
            else if (entityType === "locality") table = "localities";

            const { data, error } = await supabase
                .from(table)
                .select("*")
                .in("id", [targetPointer, sourcePointer]);

            if (error) throw error;
            if (!data || data.length < 2) {
              // If IDs are the same, data might have length 1
              if (targetPointer === sourcePointer) {
                 setEntities([data[0], data[0]]);
              } else {
                toast.error("Could not find both records");
              }
              return;
            }

            setEntities(data);
        } catch (error) {
            toast.error("Failed to load records");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchImpact = async () => {
        if (!sourcePointer || !entityType) return;
        setImpactLoading(true);
        try {
            const stats: Record<string, number> = {};
            
            if (entityType === "building") {
              const { count: reviews } = await supabase.from("user_buildings").select("*", { count: "exact", head: true }).eq("building_id", sourcePointer);
              stats.reviews = reviews || 0;
              const { count: credits } = await supabase.from("building_credits").select("*", { count: "exact", head: true }).eq("building_id", sourcePointer);
              stats.credits = credits || 0;
            } else if (entityType === "person" || entityType === "company") {
              const col = entityType === "person" ? "person_id" : "company_id";
              const { count: credits } = await supabase.from("building_credits").select("*", { count: "exact", head: true }).eq(col, sourcePointer);
              stats.credits = credits || 0;
              const { count: awards } = await supabase.from("award_recipients").select("*", { count: "exact", head: true }).eq(`recipient_${entityType}_id`, sourcePointer);
              stats.awards = awards || 0;
            } else if (entityType === "locality") {
              const { count: buildings } = await supabase.from("buildings").select("*", { count: "exact", head: true }).eq("locality_id", sourcePointer);
              stats.buildings = buildings || 0;
              const { count: events } = await supabase.from("events").select("*", { count: "exact", head: true }).eq("locality_id", sourcePointer);
              stats.events = events || 0;
            }

            setImpact(stats);
        } catch (e) {
            console.error("Impact fetch failed", e);
        } finally {
            setImpactLoading(false);
        }
    };

    const fetchReviewImages = async () => {
      if (!sourcePointer) return;
      try {
        const { data } = await supabase
          .from("review_images")
          .select("*, user_buildings!inner(building_id)")
          .eq("user_buildings.building_id", sourcePointer)
          .limit(20);
        setReviewImages(data || []);
      } catch (e) {
        console.error(e);
      }
    };

    const handleSwap = () => {
        const temp = targetPointer;
        setTargetPointer(sourcePointer);
        setSourcePointer(temp);
    };

    const handleMerge = async () => {
        if (!targetPointer || !sourcePointer || !user || !entityType) return;

        setMerging(true);
        try {
            let rpcName = "";
            if (entityType === "building") rpcName = "merge_buildings";
            else if (entityType === "person") rpcName = "admin_merge_people";
            else if (entityType === "company") rpcName = "admin_merge_companies";
            else if (entityType === "locality") rpcName = "admin_merge_localities";

            // Map params based on function signature (some use p_ prefix, some don't)
            let params: any = {};
            if (entityType === "building") {
              params = { target_id: targetPointer, source_id: sourcePointer };
            } else {
              const sourceKey = `p_source_${entityType}_id`;
              const targetKey = `p_target_${entityType}_id`;
              params = { [sourceKey]: sourcePointer, [targetKey]: targetPointer };
            }

            const { data, error } = await (supabase as any).rpc(rpcName, params);

            if (error) throw error;
            
            // Handle JSONB return from admin_merge_* functions
            if (data && typeof data === 'object' && data.ok === false) {
              throw new Error(data.error || "Merge failed");
            }

            toast.success("Merge completed successfully");
            navigate("/admin/merge");

        } catch (error: any) {
            toast.error(`Merge failed: ${error.message || "Unknown error"}`);
            console.error(error);
        } finally {
            setMerging(false);
        }
    };

    if (loading) {
        return (
          <div className="flex flex-col items-center justify-center h-screen space-y-4">
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-brand-primary" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Merge className="h-4 w-4 text-brand-primary" />
              </div>
            </div>
            <p className="text-text-secondary animate-pulse font-medium">Preparing comparison...</p>
          </div>
        );
    }

    const targetEntity = entities.find(e => e.id === targetPointer);
    const sourceEntity = entities.find(e => e.id === sourcePointer);

    if (!targetEntity || !sourceEntity) {
      return (
        <div className="mx-auto flex min-h-[50vh] max-w-7xl flex-col items-center justify-center space-y-4 p-8">
          <AlertTriangle className="h-16 w-16 text-red-500 opacity-20" />
          <h2 className="text-2xl font-bold text-text-primary">Records not found</h2>
          <p className="text-text-secondary">The records you are trying to compare might have been deleted or moved.</p>
          <Button onClick={() => navigate("/admin/merge")} className="rounded-full px-8">Return to Merge Tool</Button>
        </div>
      );
    }

    const renderEntityValue = (label: string, value: any, isTarget = false) => (
      <div className={`space-y-1 p-3 rounded-lg border transition-colors ${
        isTarget ? "bg-white/50 border-green-500/10" : "bg-red-50/50 border-red-500/10"
      }`}>
        <div className="text-[10px] text-text-secondary font-black uppercase tracking-widest opacity-60">{label}</div>
        <div className={`text-sm font-medium ${!isTarget ? "line-through opacity-40" : "text-text-primary"}`}>
          {value || <span className="opacity-30">—</span>}
        </div>
      </div>
    );

    const mapItems = entityType === 'building' ? [
      { id: targetEntity.id, lat: targetEntity.latitude, lng: targetEntity.longitude, name: targetEntity.name, is_cluster: false },
      { id: sourceEntity.id, lat: sourceEntity.latitude, lng: sourceEntity.longitude, name: sourceEntity.name, is_cluster: false }
    ] : [];

    return (
        <div className="container mx-auto py-12 px-4 max-w-7xl pb-32">
            <div className="mb-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" onClick={() => navigate('/admin/merge')} className="rounded-full h-12 w-12 p-0 hover:bg-surface-muted transition-transform hover:-translate-x-1">
                      <ArrowLeft className="h-6 w-6" />
                  </Button>
                  <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-brand-primary text-white capitalize">{entityType}</Badge>
                        <ChevronRight className="w-4 h-4 text-text-secondary" />
                        <span className="text-xs font-mono text-text-secondary">Consolidation Engine</span>
                      </div>
                      <h1 className="text-3xl font-black tracking-tight">Review & Unify</h1>
                  </div>
                </div>

                <div className="hidden md:flex items-center gap-8 bg-surface-muted/50 px-6 py-3 rounded-2xl border border-border-default/50">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Master</span>
                    <span className="text-sm font-bold text-green-600 truncate max-w-[150px]">{targetEntity.name || targetEntity.city}</span>
                  </div>
                  <ArrowLeftRight className="w-4 h-4 text-text-secondary opacity-30" />
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Duplicate</span>
                    <span className="text-sm font-bold text-red-600 truncate max-w-[150px]">{sourceEntity.name || sourceEntity.city}</span>
                  </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr,80px,1fr] gap-8 items-start">

                {/* TARGET COLUMN (KEEP) */}
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                  <Card className="border-2 border-green-500/20 bg-green-50/10 overflow-hidden shadow-2xl shadow-green-500/5 rounded-3xl">
                      <div className="bg-green-500/10 p-4 text-green-800 font-black flex justify-between items-center border-b border-green-500/10">
                          <span className="flex items-center gap-2 uppercase tracking-tighter"><Check className="h-5 w-5" /> Surviving Record</span>
                          <Badge className="bg-green-600 text-white border-none shadow-lg shadow-green-600/20">Target</Badge>
                      </div>
                      
                      <CardContent className="p-8 space-y-6">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center text-green-600 border border-green-500/20">
                              {entityType === 'building' && <Building2 className="w-8 h-8" />}
                              {entityType === 'person' && <User className="w-8 h-8" />}
                              {entityType === 'company' && <Briefcase className="w-8 h-8" />}
                              {entityType === 'locality' && <MapPin className="w-8 h-8" />}
                            </div>
                            <div>
                              <h2 className="text-2xl font-black text-green-900 leading-tight">{targetEntity.name || targetEntity.city}</h2>
                              <p className="text-sm text-green-700/60 font-medium">Master ID: {targetEntity.id.slice(0, 8)}...</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-3">
                              {entityType === 'building' && (
                                <>
                                  {renderEntityValue("Display Name", targetEntity.name, true)}
                                  {renderEntityValue("City", targetEntity.city, true)}
                                  {renderEntityValue("Year Completed", targetEntity.year_completed, true)}
                                  {renderEntityValue("Address", targetEntity.address, true)}
                                  
                                  {/* Building Visuals */}
                                  <div className="mt-4 space-y-4">
                                    <div className="aspect-video w-full rounded-2xl overflow-hidden bg-surface-muted border border-green-500/10">
                                      {targetEntity.hero_image_url || targetEntity.community_preview_url ? (
                                        <img 
                                          src={getBuildingImageUrl(targetEntity.hero_image_url || targetEntity.community_preview_url)} 
                                          className="w-full h-full object-cover"
                                          alt="Target Building"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-text-secondary opacity-30">
                                          <ImageIcon className="w-8 h-8" />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </>
                              )}
                              {entityType === 'person' && (
                                <>
                                  {renderEntityValue("Full Name", targetEntity.name, true)}
                                  {renderEntityValue("Nationality", targetEntity.nationality, true)}
                                  {renderEntityValue("Birth/Death", `${targetEntity.birth_year || '?'} - ${targetEntity.death_year || '?'}`, true)}
                                  {renderEntityValue("Slug", targetEntity.slug, true)}
                                </>
                              )}
                              {entityType === 'company' && (
                                <>
                                  {renderEntityValue("Company Name", targetEntity.name, true)}
                                  {renderEntityValue("Country", targetEntity.country, true)}
                                  {renderEntityValue("Founded", targetEntity.founded_year, true)}
                                  {renderEntityValue("Website", targetEntity.website, true)}
                                </>
                              )}
                              {entityType === 'locality' && (
                                <>
                                  {renderEntityValue("City Name", targetEntity.city, true)}
                                  {renderEntityValue("Country", targetEntity.country, true)}
                                  {renderEntityValue("ISO Code", targetEntity.country_code, true)}
                                  {renderEntityValue("Slug", targetEntity.slug, true)}
                                </>
                              )}
                          </div>

                          <div className="pt-6 border-t border-green-500/10">
                            <div className="flex items-center justify-between text-[10px] font-bold text-green-800/40 uppercase tracking-widest">
                              <span>Created: {new Date(targetEntity.created_at).toLocaleDateString()}</span>
                              <span>Updated: {new Date(targetEntity.updated_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                      </CardContent>
                  </Card>
                </motion.div>

                {/* SWAP CONTROLS */}
                <div className="flex flex-col items-center justify-center h-full py-12 lg:py-0 sticky top-20 z-10">
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <Button
                          size="icon"
                          variant="outline"
                          className="rounded-3xl h-16 w-16 border-2 border-brand-primary/20 bg-white hover:bg-brand-primary hover:text-white shadow-2xl shadow-brand-primary/10 transition-all duration-300 group"
                          onClick={handleSwap}
                      >
                          <ArrowLeftRight className="h-8 w-8 transition-transform group-hover:rotate-180 duration-500" />
                      </Button>
                    </motion.div>
                    <div className="mt-4 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] opacity-40">Swap Direction</div>
                </div>

                {/* SOURCE COLUMN (REMOVE) */}
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                  <Card className="border-2 border-red-500/20 bg-red-50/10 overflow-hidden shadow-2xl shadow-red-500/5 rounded-3xl opacity-80 hover:opacity-100 transition-opacity">
                      <div className="bg-red-500/10 p-4 text-red-800 font-black flex justify-between items-center border-b border-red-500/10">
                          <span className="flex items-center gap-2 uppercase tracking-tighter"><Trash2 className="h-5 w-5" /> Records to Purge</span>
                          <Badge variant="destructive" className="border-none shadow-lg shadow-red-600/20">Source</Badge>
                      </div>
                      
                      <CardContent className="p-8 space-y-6">
                          <div className="flex items-center gap-4 mb-4 grayscale opacity-60">
                            <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-600 border border-red-500/20">
                              {entityType === 'building' && <Building2 className="w-8 h-8" />}
                              {entityType === 'person' && <User className="w-8 h-8" />}
                              {entityType === 'company' && <Briefcase className="w-8 h-8" />}
                              {entityType === 'locality' && <MapPin className="w-8 h-8" />}
                            </div>
                            <div>
                              <h2 className="text-2xl font-black text-red-900 leading-tight line-through decoration-red-500/30">{sourceEntity.name || sourceEntity.city}</h2>
                              <p className="text-sm text-red-700/60 font-medium">Source ID: {sourceEntity.id.slice(0, 8)}...</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-3">
                              {entityType === 'building' && (
                                <>
                                  {renderEntityValue("Display Name", sourceEntity.name)}
                                  {renderEntityValue("City", sourceEntity.city)}
                                  {renderEntityValue("Year Completed", sourceEntity.year_completed)}
                                  {renderEntityValue("Address", sourceEntity.address)}

                                  {/* Building Visuals */}
                                  <div className="mt-4 space-y-4">
                                    <div className="aspect-video w-full rounded-2xl overflow-hidden bg-surface-muted border border-red-500/10 grayscale">
                                      {sourceEntity.hero_image_url || sourceEntity.community_preview_url ? (
                                        <img 
                                          src={getBuildingImageUrl(sourceEntity.hero_image_url || sourceEntity.community_preview_url)} 
                                          className="w-full h-full object-cover"
                                          alt="Source Building"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-text-secondary opacity-30">
                                          <ImageIcon className="w-8 h-8" />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </>
                              )}
                              {entityType === 'person' && (
                                <>
                                  {renderEntityValue("Full Name", sourceEntity.name)}
                                  {renderEntityValue("Nationality", sourceEntity.nationality)}
                                  {renderEntityValue("Birth/Death", `${sourceEntity.birth_year || '?'} - ${sourceEntity.death_year || '?'}`)}
                                  {renderEntityValue("Slug", sourceEntity.slug)}
                                </>
                              )}
                              {entityType === 'company' && (
                                <>
                                  {renderEntityValue("Company Name", sourceEntity.name)}
                                  {renderEntityValue("Country", sourceEntity.country)}
                                  {renderEntityValue("Founded", sourceEntity.founded_year)}
                                  {renderEntityValue("Website", sourceEntity.website)}
                                </>
                              )}
                              {entityType === 'locality' && (
                                <>
                                  {renderEntityValue("City Name", sourceEntity.city)}
                                  {renderEntityValue("Country", sourceEntity.country)}
                                  {renderEntityValue("ISO Code", sourceEntity.country_code)}
                                  {renderEntityValue("Slug", sourceEntity.slug)}
                                </>
                              )}
                          </div>

                          <div className="pt-6 border-t border-red-500/10 opacity-40">
                            <div className="flex items-center justify-between text-[10px] font-bold text-red-800 uppercase tracking-widest">
                              <span>Created: {new Date(sourceEntity.created_at).toLocaleDateString()}</span>
                              <span>Updated: {new Date(sourceEntity.updated_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                      </CardContent>
                  </Card>
                </motion.div>
            </div>

            {/* IMPACT & ACTIONS */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }} 
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-12"
            >
                <Card className="border-none bg-surface-card shadow-2xl rounded-[2.5rem] overflow-hidden border border-border-default/50">
                    <CardContent className="p-10">
                        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
                            <div className="space-y-6 flex-1 text-center lg:text-left">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 text-amber-600 rounded-full text-xs font-black uppercase tracking-widest border border-amber-500/20">
                                    <AlertTriangle className="h-4 w-4" />
                                    Consolidation Impact
                                </div>
                                
                                <div className="space-y-2">
                                  <h3 className="text-3xl font-black text-text-primary">Ready to unify?</h3>
                                  <p className="text-text-secondary text-lg max-w-xl">
                                      Merging will permanently reassign the following dependencies from the source to the target record.
                                  </p>
                                </div>

                                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mt-4">
                                    {Object.entries(impact).map(([key, count]) => (
                                      <Badge key={key} variant="secondary" className="text-sm px-5 py-2 rounded-2xl bg-surface-muted text-text-primary font-bold border border-border-default transition-all hover:border-brand-primary/30">
                                          {impactLoading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : count} {key.charAt(0).toUpperCase() + key.slice(1)}
                                      </Badge>
                                    ))}
                                    {Object.keys(impact).length === 0 && !impactLoading && (
                                      <span className="text-xs text-text-secondary font-medium opacity-50">No external dependencies detected.</span>
                                    )}
                                </div>
                                
                                {entityType === 'building' && reviewImages.length > 0 && (
                                  <div className="pt-6">
                                    <h4 className="text-xs font-black text-text-secondary uppercase tracking-widest mb-3">Review Images to Move ({reviewImages.length})</h4>
                                    <div className="flex flex-wrap gap-2">
                                      {reviewImages.slice(0, 8).map((img, i) => (
                                        <div key={i} className="w-12 h-12 rounded-lg bg-surface-muted overflow-hidden border border-border-default">
                                          <img src={getBuildingImageUrl(img.image_path)} className="w-full h-full object-cover grayscale opacity-50" />
                                        </div>
                                      ))}
                                      {reviewImages.length > 8 && (
                                        <div className="w-12 h-12 rounded-lg bg-surface-muted flex items-center justify-center text-[10px] font-bold text-text-secondary">
                                          +{reviewImages.length - 8}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>

                            {entityType === 'building' && (targetEntity.latitude || sourceEntity.latitude) && (
                              <div className="w-full lg:w-[400px] aspect-square rounded-3xl overflow-hidden border border-border-default bg-surface-muted shadow-inner relative group">
                                <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
                                  <BuildingMap 
                                    lat={targetEntity.latitude || sourceEntity.latitude}
                                    lng={targetEntity.longitude || sourceEntity.longitude}
                                    items={mapItems as any}
                                    className="w-full h-full"
                                  />
                                </Suspense>
                                <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none">
                                  <Badge className="bg-green-500/90 text-white border-none shadow-lg">Target</Badge>
                                  <Badge className="bg-red-500/90 text-white border-none shadow-lg">Source</Badge>
                                </div>
                              </div>
                            )}

                            <div className="flex flex-col items-center gap-4 min-w-[300px]">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            size="lg"
                                            className="px-12 h-20 text-xl font-black rounded-3xl shadow-2xl shadow-brand-primary/20 bg-brand-primary hover:bg-brand-primary/90 text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale"
                                            disabled={merging || impactLoading}
                                        >
                                            {merging ? (
                                              <>
                                                <Loader2 className="animate-spin mr-3 h-6 w-6" /> 
                                                Processing...
                                              </>
                                            ) : (
                                              <>
                                                Unify Records
                                                <ChevronRight className="ml-2 w-6 h-6" />
                                              </>
                                            )}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="rounded-[2rem] p-8">
                                        <AlertDialogHeader>
                                            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-600 mb-4">
                                              <AlertTriangle className="w-8 h-8" />
                                            </div>
                                            <AlertDialogTitle className="text-2xl font-black">Confirm Irreversible Merge</AlertDialogTitle>
                                            <AlertDialogDescription className="text-base pt-2">
                                                You are merging <strong className="text-text-primary">"{sourceEntity.name || sourceEntity.city}"</strong> into <strong className="text-text-primary">"{targetEntity.name || targetEntity.city}"</strong>.
                                                <br/><br/>
                                                The source record will be {entityType === 'building' ? 'soft-deleted' : 'permanently deleted'}. This action cannot be undone through the admin interface.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter className="pt-8 gap-3">
                                            <AlertDialogCancel className="rounded-2xl h-12 px-6 font-bold">Cancel</AlertDialogCancel>
                                            <AlertDialogAction 
                                              onClick={handleMerge} 
                                              className="bg-red-600 hover:bg-red-700 text-white rounded-2xl h-12 px-8 font-bold shadow-lg shadow-red-600/20"
                                            >
                                                Confirm & Merge
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                <p className="text-[10px] text-text-secondary font-black uppercase tracking-[0.2em] opacity-40">System-level Operation</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
