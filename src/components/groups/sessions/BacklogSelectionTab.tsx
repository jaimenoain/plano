import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getBuildingImageUrl } from "@/utils/image";

interface BacklogSelectionTabProps {
  groupId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSelect: (item: any) => void;
}

export function BacklogSelectionTab({ groupId, onSelect }: BacklogSelectionTabProps) {
  const { data: items, isLoading } = useQuery({
    queryKey: ["group-backlog-pending", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_backlog_items")
        .select(`
            *,
            user:profiles(username),
            cycle:group_cycles(title),
            building:buildings(name, main_image_url)
        `)
        .eq("group_id", groupId)
        .eq("status", "Pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Client-side sorting for priority as it is a text enum in DB often
      // High > Medium > Low
      const pMap: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data || []).sort((a: any, b: any) => {
         return (pMap[b.priority] || 0) - (pMap[a.priority] || 0);
      });
    },
    enabled: !!groupId,
  });

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  }

  if (!items || items.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-lg">
            <AlertCircle className="w-10 h-10 text-muted-foreground mb-2" />
            <h3 className="font-semibold">Pipeline is empty</h3>
            <p className="text-sm text-muted-foreground mb-4">Add ideas to the pipeline tab first.</p>
        </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-3">
            {items.map(item => (
                <div key={item.id} className="flex gap-4 p-3 border rounded-lg hover:bg-accent/50 transition-colors group relative">
                     <div className="shrink-0 w-16 h-24 bg-muted rounded overflow-hidden">
                        {item.building?.main_image_url && (
                            <img src={getBuildingImageUrl(item.building.main_image_url)} className="w-full h-full object-cover" />
                        )}
                     </div>
                     <div className="flex-1 min-w-0 py-1">
                        <div className="flex justify-between">
                             <h4 className="font-semibold truncate pr-2">{item.building?.name || "Unknown"}</h4>
                             <Badge variant="outline" className="h-5 text-[10px] uppercase">{item.priority}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                             Added by {item.user?.username} • {new Date(item.created_at).toLocaleDateString()}
                        </div>
                        {item.admin_note && (
                            <div className="text-xs italic text-muted-foreground mt-2 bg-muted/30 p-1.5 rounded truncate">
                                "{item.admin_note}"
                            </div>
                        )}
                        {item.cycle && (
                            <Badge variant="secondary" className="mt-2 text-[10px] h-5">
                                {item.cycle.title}
                            </Badge>
                        )}
                     </div>
                     <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button size="sm" onClick={() => onSelect(item)}>
                             <Plus className="w-4 h-4 mr-1" /> Select
                         </Button>
                     </div>
                </div>
            ))}
        </div>
    </ScrollArea>
  );
}
