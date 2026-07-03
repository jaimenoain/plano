import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Bookmark } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserBuildingStatuses } from "@/features/profile/hooks/useUserBuildingStatuses";
import { cn } from "@/lib/utils";

export type CardBookmarkHoverGroup = "card" | "activity-row";

export interface CardBookmarkProps {
  buildingId: string;
  hoverGroup?: CardBookmarkHoverGroup;
  className?: string;
}

/**
 * Save building to list: `user_buildings` upsert + TanStack invalidation for `user-building-statuses`.
 */
export function CardBookmark({
  buildingId,
  hoverGroup = "card",
  className,
}: CardBookmarkProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { statuses } = useUserBuildingStatuses();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const isSaved = statuses[buildingId] === "pending";

  const hoverClasses =
    hoverGroup === "activity-row"
      ? "opacity-100 md:opacity-0 md:transition-opacity md:group-hover/activity-row:opacity-100 md:focus-visible:opacity-100"
      : "opacity-100 md:opacity-0 md:transition-opacity md:group-hover/card:opacity-100 md:focus-visible:opacity-100";

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from("user_buildings").upsert(
        {
          user_id: user.id,
          building_id: buildingId,
          status: "pending",
        },
        { onConflict: "user_id,building_id" },
      );
      if (error) throw error;
      toast({ title: "Saved to your list" });
      queryClient.invalidateQueries({ queryKey: ["user-building-statuses"] });
    } catch {
      toast({ variant: "destructive", title: "Failed to save" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSave}
      disabled={isSaving}
      aria-label={isSaved ? "Saved to your list" : "Save building to your list"}
      title={isSaved ? "Saved to your list" : "Save to your list"}
      className={cn(
        "ml-auto shrink-0 rounded-sm p-1 text-text-secondary transition-colors hover:text-text-primary",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1",
        hoverClasses,
        isSaving && "pointer-events-none opacity-50",
        className,
      )}
    >
      <Bookmark
        className={cn("h-4 w-4", isSaved && "fill-text-primary text-text-primary")}
        strokeWidth={1.75}
        aria-hidden
      />
    </button>
  );
}
