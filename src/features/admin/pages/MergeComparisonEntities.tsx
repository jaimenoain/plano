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
import { getBuildingUrl } from "@/utils/url";
import { EntityType } from "../types/merge";
import { motion } from "framer-motion";

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [entities, setEntities] = useState<any[]>([]);

    // Editable fields for the surviving (target) record. Seeded from the target
    // row on load and re-seeded on swap; persisted to the target before merging.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [edits, setEdits] = useState<Record<string, any>>({});

    // Pointers to IDs
    const [targetPointer, setTargetPointer] = useState<string | null>(targetId || null);
    const [sourcePointer, setSourcePointer] = useState<string | null>(sourceId || null);

    // Impact Stats
    const [impact, setImpact] = useState<Record<string, number>>({});
    const [impactLoading, setImpactLoading] = useState(false);

    // Building Specifics
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buildEditsFromEntity = (e: any) => ({
        name: e?.name ?? "",
        city: e?.city ?? "",
        year_completed: e?.year_completed ?? "",
        address: e?.address ?? "",
        nationality: e?.nationality ?? "",
        birth_year: e?.birth_year ?? "",
        death_year: e?.death_year ?? "",
        slug: e?.slug ?? "",
        country: e?.country ?? "",
        country_code: e?.country_code ?? "",
        founded_year: e?.founded_year ?? "",
        website: e?.website ?? "",
    });

    const fetchEntities = async () => {
        setLoading(true);
        try {
            let table = "";
            if (entityType === "building") table = "buildings";
            else if (entityType === "person") table = "people";
            else if (entityType === "company") table = "companies";
            else if (entityType === "locality") table = "localities";

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase as any)
                .from(table)
                .select("*")
                .in("id", [targetPointer, sourcePointer]);

            if (error) throw error;
            if (!data || data.length < 2) {
              // If IDs are the same, data might have length 1
              if (targetPointer === sourcePointer) {
                 setEntities([data[0], data[0]]);
                 setEdits(buildEditsFromEntity(data[0]));
              } else {
                toast.error("Could not find both records");
              }
              return;
            }

            setEntities(data);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const targetRow = data.find((e: any) => e.id === targetPointer) ?? data[0];
            setEdits(buildEditsFromEntity(targetRow));
        } catch (error) {
            toast.error("Failed to load records");
            void error;
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
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { count: awards } = await (supabase as any).from("award_recipients").select("*", { count: "exact", head: true }).eq(`recipient_${entityType}_id`, sourcePointer);
              stats.awards = awards || 0;
            } else if (entityType === "locality") {
              const { count: buildings } = await supabase.from("buildings").select("*", { count: "exact", head: true }).eq("locality_id", sourcePointer);
              stats.buildings = buildings || 0;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { count: events } = await (supabase as any).from("events").select("*", { count: "exact", head: true }).eq("locality_id", sourcePointer);
              stats.events = events || 0;
            }

            setImpact(stats);
        } catch {
            // impact fetch failed silently
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
      } catch {
        // image fetch failed silently
      }
    };

    const handleSwap = () => {
        const temp = targetPointer;
        setTargetPointer(sourcePointer);
        setSourcePointer(temp);
        // The promoted record becomes the new surviving record; reset the form to its values.
        const newTarget = entities.find((e) => e.id === sourcePointer);
        if (newTarget) setEdits(buildEditsFromEntity(newTarget));
    };

    const handleMerge = async () => {
        if (!targetPointer || !sourcePointer || !user || !entityType) return;

        setMerging(true);
        try {
            // 1. Persist any edits to the surviving (target) record so the merged
            //    result keeps the corrected data. Runs before the merge so a failed
            //    write aborts the whole operation.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const toNum = (v: any) => {
              if (v === "" || v === null || v === undefined) return null;
              const n = Number(v);
              return Number.isFinite(n) ? n : null;
            };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const toStr = (v: any) => {
              const s = (v ?? "").toString().trim();
              return s === "" ? null : s;
            };

            let table = "";
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let updatePayload: Record<string, any> = {};
            if (entityType === "building") {
              table = "buildings";
              updatePayload = { name: toStr(edits.name), city: toStr(edits.city), year_completed: toNum(edits.year_completed), address: toStr(edits.address) };
            } else if (entityType === "person") {
              table = "people";
              updatePayload = { name: toStr(edits.name), nationality: toStr(edits.nationality), birth_year: toNum(edits.birth_year), death_year: toNum(edits.death_year), slug: toStr(edits.slug) };
            } else if (entityType === "company") {
              table = "companies";
              updatePayload = { name: toStr(edits.name), country: toStr(edits.country), founded_year: toNum(edits.founded_year), website: toStr(edits.website) };
            } else if (entityType === "locality") {
              table = "localities";
              updatePayload = { city: toStr(edits.city), country: toStr(edits.country), country_code: toStr(edits.country_code), slug: toStr(edits.slug) };
            }

            if (table) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { error: updateError } = await (supabase as any).from(table).update(updatePayload).eq("id", targetPointer);
              if (updateError) throw updateError;
            }

            // 2. Run the consolidation RPC (reassigns dependencies, removes the source).
            let rpcName = "";
            if (entityType === "building") rpcName = "merge_buildings";
            else if (entityType === "person") rpcName = "admin_merge_people";
            else if (entityType === "company") rpcName = "admin_merge_companies";
            else if (entityType === "locality") rpcName = "admin_merge_localities";

            // Map params based on function signature (some use p_ prefix, some don't)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let params: any = {};
            if (entityType === "building") {
              params = { target_id: targetPointer, source_id: sourcePointer };
            } else {
              const sourceKey = `p_source_${entityType}_id`;
              const targetKey = `p_target_${entityType}_id`;
              params = { [sourceKey]: sourcePointer, [targetKey]: targetPointer };
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase as any).rpc(rpcName, params);

            if (error) throw error;
            
            // Handle JSONB return from admin_merge_* functions
            if (data && typeof data === 'object' && data.ok === false) {
              throw new Error(data.error || "Merge failed");
            }

            toast.success("Merge completed successfully");

            if (entityType === "building" && targetPointer) {
              const target = entities.find(e => e.id === targetPointer);
              navigate(getBuildingUrl(targetPointer, target?.slug, target?.short_id));
            } else {
              navigate("/admin/merge");
            }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            toast.error(`Merge failed: ${error.message || "Unknown error"}`);
        } finally {
            setMerging(false);
        }
    };

    if (loading) {
        return (
          <div className="flex flex-col items-center justify-center h-screen space-y-4">
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-text-primary" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Merge className="h-4 w-4 text-text-primary" />
              </div>
            </div>
            <p className="text-text-secondary animate-pulse font-medium">Preparing comparison...</p>
          </div>
        );
    }

    const targetEntity = entities.find(e => e.id === targetPointer);
    const sourceEntity = entities.find(e => e.id === sourcePointer);

    // Surviving-record name, reflecting any live edits (falls back to stored values).
    const targetDisplayName = edits.name || edits.city || targetEntity?.name || targetEntity?.city;

    if (!targetEntity || !sourceEntity) {
      return (
        <div className="mx-auto flex min-h-[50vh] max-w-7xl flex-col items-center justify-center space-y-4 p-8">
          <AlertTriangle className="h-16 w-16 text-feedback-destructive opacity-20" />
          <h2 className="text-2xl font-bold text-text-primary">Records not found</h2>
          <p className="text-text-secondary">The records you are trying to compare might have been deleted or moved.</p>
          <Button onClick={() => navigate("/admin/merge")} className="rounded-full px-8">Return to Merge Tool</Button>
        </div>
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderEntityValue = (label: string, value: any, isTarget = false) => (
      <div className={`space-y-1 p-3 rounded border transition-colors ${
        isTarget ? "bg-surface-card border-feedback-success/20" : "bg-feedback-destructive/5 border-feedback-destructive/10"
      }`}>
        <div className="text-[10px] text-text-secondary font-black uppercase tracking-widest opacity-60">{label}</div>
        <div className={`text-sm font-medium ${!isTarget ? "line-through opacity-40" : "text-text-primary"}`}>
          {value || <span className="opacity-30">—</span>}
        </div>
      </div>
    );

    // Editable field for the surviving (target) record. Bound to `edits[field]`.
    const renderEditableValue = (label: string, field: string, type: "text" | "number" = "text") => (
      <div className="space-y-1 p-3 rounded border bg-surface-card border-feedback-success/20 transition-colors focus-within:border-feedback-success/50">
        <label htmlFor={`edit-${field}`} className="block text-[10px] text-text-secondary font-black uppercase tracking-widest opacity-60">{label}</label>
        <input
          id={`edit-${field}`}
          type={type}
          value={edits[field] ?? ""}
          onChange={(e) => setEdits((prev) => ({ ...prev, [field]: e.target.value }))}
          placeholder="—"
          className="w-full border-0 bg-transparent p-0 text-sm font-medium text-text-primary placeholder:text-text-secondary/30 focus:outline-none focus:ring-0"
        />
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
                        <Badge variant="outline" className="capitalize border-border-default text-text-secondary">
                          {entityType}
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-text-secondary" />
                        <span className="text-xs font-mono text-text-secondary">Consolidation Engine</span>
                      </div>
                      <h1 className="text-3xl font-bold tracking-tight text-text-primary">Review & unify</h1>
                  </div>
                </div>

                <div className="hidden md:flex items-center gap-8 rounded-sm border border-border-default bg-surface-muted/50 px-6 py-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Master</span>
                    <span className="text-sm font-bold text-feedback-success truncate max-w-[150px]">{targetDisplayName}</span>
                  </div>
                  <ArrowLeftRight className="w-4 h-4 text-text-secondary opacity-30" />
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Duplicate</span>
                    <span className="text-sm font-bold text-feedback-destructive truncate max-w-[150px]">{sourceEntity.name || sourceEntity.city}</span>
                  </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr,80px,1fr] gap-8 items-start">

                {/* TARGET COLUMN (KEEP) */}
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                  <Card className="overflow-hidden rounded-sm border-2 border-feedback-success/20 bg-surface-card shadow-none">
                      <div className="bg-feedback-success/10 p-4 text-text-primary font-semibold flex justify-between items-center border-b border-feedback-success/10">
                          <span className="flex items-center gap-2 uppercase tracking-wide text-sm"><Check className="h-5 w-5 text-feedback-success" /> Surviving Record</span>
                          <Badge className="bg-feedback-success text-white border-none">Target</Badge>
                      </div>
                      
                      <CardContent className="p-8 space-y-6">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 rounded bg-feedback-success/10 flex items-center justify-center text-feedback-success border border-feedback-success/20">
                              {entityType === 'building' && <Building2 className="w-8 h-8" />}
                              {entityType === 'person' && <User className="w-8 h-8" />}
                              {entityType === 'company' && <Briefcase className="w-8 h-8" />}
                              {entityType === 'locality' && <MapPin className="w-8 h-8" />}
                            </div>
                            <div>
                              <h2 className="text-2xl font-bold text-text-primary leading-tight">{targetDisplayName}</h2>
                              <p className="text-sm text-text-secondary font-medium">Master ID: {targetEntity.id.slice(0, 8)}...</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-3">
                              {entityType === 'building' && (
                                <>
                                  {renderEditableValue("Display Name", "name")}
                                  {renderEditableValue("City", "city")}
                                  {renderEditableValue("Year Completed", "year_completed", "number")}
                                  {renderEditableValue("Address", "address")}

                                  {/* Building Visuals */}
                                  <div className="mt-4 space-y-4">
                                    <div className="aspect-video w-full overflow-hidden bg-surface-muted border border-feedback-success/10">
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
                                  {renderEditableValue("Full Name", "name")}
                                  {renderEditableValue("Nationality", "nationality")}
                                  {renderEditableValue("Birth Year", "birth_year", "number")}
                                  {renderEditableValue("Death Year", "death_year", "number")}
                                  {renderEditableValue("Slug", "slug")}
                                </>
                              )}
                              {entityType === 'company' && (
                                <>
                                  {renderEditableValue("Company Name", "name")}
                                  {renderEditableValue("Country", "country")}
                                  {renderEditableValue("Founded", "founded_year", "number")}
                                  {renderEditableValue("Website", "website")}
                                </>
                              )}
                              {entityType === 'locality' && (
                                <>
                                  {renderEditableValue("City Name", "city")}
                                  {renderEditableValue("Country", "country")}
                                  {renderEditableValue("ISO Code", "country_code")}
                                  {renderEditableValue("Slug", "slug")}
                                </>
                              )}
                          </div>

                          <div className="pt-6 border-t border-border-default">
                            <div className="flex items-center justify-between text-[10px] font-medium text-text-disabled uppercase tracking-widest">
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
                          className="group h-16 w-16 rounded-sm border-2 border-border-default bg-surface-card transition-colors hover:border-text-primary"
                          onClick={handleSwap}
                      >
                          <ArrowLeftRight className="h-8 w-8 transition-transform group-hover:rotate-180 duration-500" />
                      </Button>
                    </motion.div>
                    <div className="mt-4 text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] opacity-40">Swap Direction</div>
                </div>

                {/* SOURCE COLUMN (REMOVE) */}
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                  <Card className="overflow-hidden rounded-sm border-2 border-feedback-destructive/20 bg-surface-card opacity-80 shadow-none transition-opacity hover:opacity-100">
                      <div className="bg-feedback-destructive/10 p-4 text-text-primary font-semibold flex justify-between items-center border-b border-feedback-destructive/10">
                          <span className="flex items-center gap-2 uppercase tracking-wide text-sm"><Trash2 className="h-5 w-5 text-feedback-destructive" /> Records to Purge</span>
                          <Badge variant="destructive" className="border-none">Source</Badge>
                      </div>
                      
                      <CardContent className="p-8 space-y-6">
                          <div className="flex items-center gap-4 mb-4 grayscale opacity-60">
                            <div className="w-16 h-16 rounded bg-feedback-destructive/10 flex items-center justify-center text-feedback-destructive border border-feedback-destructive/20">
                              {entityType === 'building' && <Building2 className="w-8 h-8" />}
                              {entityType === 'person' && <User className="w-8 h-8" />}
                              {entityType === 'company' && <Briefcase className="w-8 h-8" />}
                              {entityType === 'locality' && <MapPin className="w-8 h-8" />}
                            </div>
                            <div>
                              <h2 className="text-2xl font-bold text-text-primary leading-tight line-through decoration-feedback-destructive/30">{sourceEntity.name || sourceEntity.city}</h2>
                              <p className="text-sm text-text-secondary font-medium">Source ID: {sourceEntity.id.slice(0, 8)}...</p>
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
                                    <div className="aspect-video w-full overflow-hidden bg-surface-muted border border-feedback-destructive/10 grayscale">
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

                          <div className="pt-6 border-t border-border-default opacity-40">
                            <div className="flex items-center justify-between text-[10px] font-medium text-text-secondary uppercase tracking-widest">
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
                <Card className="overflow-hidden rounded-sm border border-border-default bg-surface-card shadow-none">
                    <CardContent className="p-10">
                        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
                            <div className="space-y-6 flex-1 text-center lg:text-left">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-feedback-warning/10 text-feedback-warning rounded text-xs font-semibold uppercase tracking-widest border border-feedback-warning/20">
                                    <AlertTriangle className="h-4 w-4" />
                                    Consolidation Impact
                                </div>
                                
                                <div className="space-y-2">
                                  <h3 className="text-3xl font-bold tracking-tight text-text-primary">Ready to unify?</h3>
                                  <p className="text-text-secondary text-lg max-w-xl">
                                      Merging will permanently reassign the following dependencies from the source to the target record.
                                  </p>
                                </div>

                                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mt-4">
                                    {Object.entries(impact).map(([key, count]) => (
                                      <Badge key={key} variant="secondary" className="text-sm px-4 py-1.5 rounded bg-surface-muted text-text-primary font-semibold border border-border-default transition-all hover:border-border-strong">
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
                              <div className="relative aspect-square w-full overflow-hidden rounded-sm border border-border-default bg-surface-muted lg:w-[400px] group">
                                <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
                                  <BuildingMap 
                                    lat={targetEntity.latitude || sourceEntity.latitude}
                                    lng={targetEntity.longitude || sourceEntity.longitude}
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    items={mapItems as any}
                                    className="w-full h-full"
                                  />
                                </Suspense>
                                <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none">
                                  <Badge className="bg-feedback-success text-white border-none shadow-md">Target</Badge>
                                  <Badge className="bg-feedback-destructive text-white border-none shadow-md">Source</Badge>
                                </div>
                              </div>
                            )}

                            <div className="flex flex-col items-center gap-4 min-w-[300px]">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            size="lg"
                                            variant="destructive"
                                            className="h-16 rounded-sm px-12 text-base font-semibold disabled:opacity-50"
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
                                    <AlertDialogContent className="rounded-sm p-8">
                                        <AlertDialogHeader>
                                            <div className="w-16 h-16 rounded bg-feedback-destructive/10 flex items-center justify-center text-feedback-destructive mb-4">
                                              <AlertTriangle className="w-8 h-8" />
                                            </div>
                                            <AlertDialogTitle className="text-2xl font-bold tracking-tight">Confirm irreversible merge</AlertDialogTitle>
                                            <AlertDialogDescription className="text-base pt-2">
                                                You are merging <strong className="text-text-primary">"{sourceEntity.name || sourceEntity.city}"</strong> into <strong className="text-text-primary">"{targetDisplayName}"</strong>.
                                                <br/><br/>
                                                The source record will be {entityType === 'building' ? 'soft-deleted' : 'permanently deleted'}. This action cannot be undone through the admin interface.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter className="pt-8 gap-3">
                                            <AlertDialogCancel className="rounded-md h-12 px-6 font-medium">Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={handleMerge}
                                              className="bg-feedback-destructive hover:bg-feedback-destructive/90 text-white rounded-md h-12 px-8 font-medium shadow-md"
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
