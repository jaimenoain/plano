import { useState } from 'react';
import { Bookmark, Check, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClusterResponse } from '../hooks/useMapData';
import { getBuildingImageUrl } from '@/utils/image';
import { useAuth } from '@/hooks/useAuth';
import { useUserBuildingStatuses } from '@/hooks/useUserBuildingStatuses';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface BuildingPopupContentProps {
  cluster: ClusterResponse;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function BuildingPopupContent({ cluster, onMouseEnter, onMouseLeave }: BuildingPopupContentProps) {
  const { user } = useAuth();
  const { statuses } = useUserBuildingStatuses();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  // Convert cluster ID to string for status lookup
  const buildingId = String(cluster.id);
  const viewerStatus = statuses[buildingId];

  const isSaved = viewerStatus === 'pending';
  const isVisited = viewerStatus === 'visited';
  const isIgnored = viewerStatus === 'ignored';

  const handleAction = async (
    status: 'pending' | 'visited' | 'ignored',
    successMessage: string,
    removeMessage: string
  ) => {
    if (!user) {
      toast({ title: "Please log in first" });
      return;
    }

    setIsSaving(true);
    try {
      if (viewerStatus === status) {
        // Toggle off (delete)
        const { error } = await supabase
          .from("user_buildings")
          .delete()
          .match({ user_id: user.id, building_id: buildingId });

        if (error) throw error;
        toast({ title: removeMessage });
      } else {
        // Set new status
        const { error } = await supabase.from("user_buildings").upsert({
          user_id: user.id,
          building_id: buildingId,
          status: status,
          edited_at: new Date().toISOString()
        }, { onConflict: 'user_id, building_id' });

        if (error) throw error;
        toast({ title: successMessage });
      }

      queryClient.invalidateQueries({ queryKey: ["user-building-statuses"] });
    } catch (error) {
      console.error("Action failed", error);
      toast({ variant: "destructive", title: "Failed to update status" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    handleAction('pending', "Saved to your list", "Removed from your list");
  };

  const handleVisit = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    handleAction('visited', "Marked as visited", "Removed from visited");
  };

  const handleHide = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    handleAction('ignored', "Building hidden", "Building unhidden");
  };

  const buildingUrl = cluster.slug ? `/building/${cluster.slug}` : `/building/${cluster.id}`;

  return (
    <div
      className="flex w-[200px] flex-col overflow-hidden rounded-md bg-background shadow-lg relative"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <a
        href={buildingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute inset-0 z-10"
        aria-label={`View details for ${cluster.name || 'Building'}`}
      />

      {/* Image */}
      <div className="relative h-[200px] w-full bg-muted">
        {cluster.image_url ? (
          <img
            src={getBuildingImageUrl(cluster.image_url)}
            alt={cluster.name || 'Building'}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            No Image
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 p-2">
        {cluster.name ? (
          <h3 className="text-sm font-semibold line-clamp-2">{cluster.name}</h3>
        ) : (
          <span className="text-xs text-muted-foreground">Loading details...</span>
        )}

        {/* Action Bar */}
        <div className="flex items-center justify-between border-t pt-2 relative z-20" onClick={(e) => e.stopPropagation()}>
            <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 hover:bg-primary/10 ${isVisited ? 'text-primary' : 'text-muted-foreground'}`}
                onClick={handleVisit}
                title="Mark as visited"
                disabled={isSaving}
            >
                <Check className={`h-4 w-4 ${isVisited ? 'stroke-[3px]' : ''}`} />
            </Button>

            <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 hover:bg-primary/10 ${isSaved ? 'text-primary' : 'text-muted-foreground'}`}
                onClick={handleSave}
                title="Save"
                disabled={isSaving}
            >
                <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
            </Button>

            <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 hover:bg-destructive/10 ${isIgnored ? 'text-destructive' : 'text-muted-foreground'}`}
                onClick={handleHide}
                title="Hide"
                disabled={isSaving}
            >
                <EyeOff className="h-4 w-4" />
            </Button>
        </div>
      </div>
    </div>
  );
}
