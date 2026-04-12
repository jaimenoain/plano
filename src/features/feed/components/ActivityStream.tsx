import { useState } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bookmark } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ActivityLead } from "@/features/feed/components/card-parts/ActivityLead";
import { useUserBuildingStatuses } from "@/features/profile/hooks/useUserBuildingStatuses";
import { cn } from "@/lib/utils";
import type { FeedReview } from "@/types/feed";
import { getBuildingImageUrl } from "@/utils/image";
import { getBuildingUrl } from "@/utils/url";

export interface ActivityStreamRowProps {
  entry: FeedReview;
}

function buildingThumbSrc(entry: FeedReview): string | undefined {
  const b = entry.building;
  if (!b) return undefined;
  return (
    getBuildingImageUrl(b.main_image_url) ?? getBuildingImageUrl(b.community_preview_url)
  );
}

/**
 * Single activity line: thumbnail, @user verb, building name, bookmark.
 */
export function ActivityStreamRow({ entry }: ActivityStreamRowProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { statuses } = useUserBuildingStatuses();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);

  if (!entry.building) return null;

  const username = entry.user?.username?.trim() || "Unknown User";
  const verb = entry.status === "pending" ? "wants to visit" : "visited";
  const isSavedToList = statuses[entry.building.id] === "pending";
  const thumbUrl = buildingThumbSrc(entry);
  const showPlaceholder = !thumbUrl || thumbFailed;

  const handleSave = async () => {
    if (!user || !entry.building?.id) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from("user_buildings").upsert(
        {
          user_id: user.id,
          building_id: entry.building.id,
          status: "pending",
          edited_at: new Date().toISOString(),
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

  const goBuilding = () => {
    navigate(getBuildingUrl(entry.building!.id, entry.building!.slug, entry.building!.short_id));
  };

  const handleRowClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    goBuilding();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goBuilding();
        }
      }}
      className={cn("group/activity-row flex cursor-pointer items-center gap-3 py-3 md:gap-4")}
    >
      <div className="h-10 w-10 shrink-0 overflow-hidden bg-surface-muted md:h-12 md:w-12">
        {showPlaceholder ? null : (
          <img
            src={thumbUrl}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setThumbFailed(true)}
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <ActivityLead username={username} verb={verb} className="mb-1" />
        <p className="truncate font-sans text-lg font-black leading-none tracking-tight text-text-primary md:text-[1.3125rem]">
          {entry.building.name}
        </p>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          void handleSave();
        }}
        disabled={isSaving}
        aria-label={isSavedToList ? "Saved to your list" : "Save building to your list"}
        title={isSavedToList ? "Saved to your list" : "Save to your list"}
        className={cn(
          "ml-auto shrink-0 rounded-sm p-1 text-text-secondary transition-colors hover:text-text-primary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1",
          "opacity-100 md:opacity-0 md:transition-opacity md:group-hover/activity-row:opacity-100 md:focus-visible:opacity-100",
          isSaving && "pointer-events-none opacity-50",
        )}
      >
        <Bookmark
          className={cn("h-4 w-4", isSavedToList && "fill-text-primary text-text-primary")}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>
    </div>
  );
}

export interface ActivityStreamGroupProps {
  entries: FeedReview[];
}

/**
 * Consecutive activity entries: optional "Activity" label + hairline-separated rows.
 */
export function ActivityStreamGroup({ entries }: ActivityStreamGroupProps) {
  if (entries.length === 0) return null;

  const showLabel = entries.length > 1;

  return (
    <div className="w-full min-w-0">
      {showLabel && (
        <p className="mb-2 font-mono text-[0.5625rem] font-normal uppercase tracking-[0.12em] text-text-secondary">
          Activity
        </p>
      )}
      <div className="divide-y divide-border-default">
        {entries.map((entry) => (
          <ActivityStreamRow key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}
