import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { CalendarPlus, Trash2, Edit2, Check, X, Repeat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScheduleDialog } from "./ScheduleDialog";
import { getBuildingImageUrl } from "@/utils/image";

interface BacklogItemCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cycles: any[];
  onUpdate: () => void;
}

export function BacklogItemCard({ item, cycles, onUpdate }: BacklogItemCardProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [note, setNote] = useState(item.admin_note || "");
  const [priority, setPriority] = useState(item.priority);
  const [cycleId, setCycleId] = useState(item.cycle_id || "none");

  // Determine data source (legacy vs new)
  // item.building is populated by the join in PipelineTab query
  const building = item.building;
  const mainTitle = building?.name || "Unknown Building";
  const imageUrl = getBuildingImageUrl(building?.hero_image_url) || null;
  const year = building?.year_completed;

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from("group_backlog_items")
        .update({
          admin_note: note,
          priority: priority,
          cycle_id: cycleId === "none" ? null : cycleId
        })
        .eq("id", item.id);

      if (error) throw error;

      setIsEditing(false);
      onUpdate();
      toast({ title: "Updated successfully" });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Update failed" });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Remove this from the backlog?")) return;
    try {
      const { error } = await supabase
        .from("group_backlog_items")
        .delete()
        .eq("id", item.id);

      if (error) throw error;
      onUpdate();
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Delete failed" });
    }
  };

  const priorityConfig = {
    Low: { border: "border-l-slate-400", text: "text-slate-500", label: "Low Priority" },
    Medium: { border: "border-l-amber-500", text: "text-amber-600", label: "Medium Priority" },
    High: { border: "border-l-rose-500", text: "text-rose-600", label: "High Priority" }
  }[priority as "Low" | "Medium" | "High"] || { border: "border-l-slate-400", text: "text-slate-500", label: "Priority" };

  return (
    <Card className={`overflow-hidden transition-all border-l-4 ${priorityConfig.border}`}>
      <CardContent className="p-0 flex flex-col sm:flex-row gap-4">
        {/* Image */}
        <div className="shrink-0 w-full sm:w-24 h-36 bg-muted relative">
            {imageUrl ? (
                 <img src={imageUrl} className="w-full h-full object-cover" alt={mainTitle} />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <span className="text-xs">No Image</span>
                </div>
            )}
        </div>

        {/* Content */}
        <div className="flex-1 py-4 pr-4 pl-4 sm:pl-0 min-w-0 space-y-3">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-lg leading-tight truncate">
                         {mainTitle}
                    </h3>
                    {year && (
                        <p className="text-sm text-muted-foreground truncate">{year}</p>
                    )}
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                        <span className={`font-medium ${priorityConfig.text}`}>
                            {priorityConfig.label}
                        </span>
                        <span>•</span>
                        <span>Added by {item.user?.username}</span>
                        {item.cycle && (
                            <Badge variant="outline" className="text-[10px] h-5 gap-1 font-normal ml-1">
                                <Repeat className="w-3 h-3" /> {item.cycle.title}
                            </Badge>
                        )}
                    </div>
                </div>

                {!isEditing && (
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditing(true)}>
                            <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/80 hover:text-destructive" onClick={handleDelete}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>

            {isEditing ? (
                <div className="space-y-3 bg-muted/20 p-3 rounded-md border">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                             <label className="text-xs font-medium mb-1 block">Priority</label>
                             <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Low">Low</SelectItem>
                                    <SelectItem value="Medium">Medium</SelectItem>
                                    <SelectItem value="High">High</SelectItem>
                                </SelectContent>
                             </Select>
                        </div>
                        <div>
                             <label className="text-xs font-medium mb-1 block">Cycle</label>
                             <Select value={cycleId} onValueChange={setCycleId}>
                                <SelectTrigger className="h-8"><SelectValue placeholder="Cycle" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {cycles.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                                </SelectContent>
                             </Select>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-medium mb-1 block">Note</label>
                        <Textarea
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            className="min-h-[60px] text-sm"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}><X className="w-4 h-4 mr-1" /> Cancel</Button>
                        <Button size="sm" onClick={handleSave}><Check className="w-4 h-4 mr-1" /> Save</Button>
                    </div>
                </div>
            ) : (
                <>
                    {item.admin_note && (
                        <div className="text-sm bg-muted/30 p-2 rounded border-l-2 border-primary/20 text-muted-foreground italic">
                            "{item.admin_note}"
                        </div>
                    )}
                    <div className="pt-2">
                         <Button size="sm" onClick={() => setIsScheduleDialogOpen(true)} className="w-full sm:w-auto">
                            <CalendarPlus className="mr-2 h-4 w-4" /> Schedule This
                         </Button>
                    </div>
                </>
            )}
        </div>
      </CardContent>

      <ScheduleDialog
        item={item}
        groupId={item.group_id}
        open={isScheduleDialogOpen}
        onOpenChange={setIsScheduleDialogOpen}
      />
    </Card>
  );
}
