import React, { useState } from 'react';
import { Bookmark, Check, EyeOff, Trash2, Plus, MapPin, Map, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  onRemoveFromCollection?: (id: string) => void;
  onAddCandidate?: (id: string) => void;
}

export function BuildingPopupContent({
  cluster,
  onMouseEnter,
  onMouseLeave,
  onRemoveFromCollection,
  onAddCandidate
}: BuildingPopupContentProps) {
  const { user } = useAuth();
  const { statuses } = useUserBuildingStatuses();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  // Confirmation State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [pendingDeletion, setPendingDeletion] = useState<(() => void) | null>(null);

  // Convert cluster ID to string for status lookup
  const buildingId = String(cluster.id);
  const viewerStatus = statuses[buildingId];

  const isSaved = viewerStatus === 'pending';
  const isVisited = viewerStatus === 'visited';
  const isIgnored = viewerStatus === 'ignored';

  const performUpdate = async (
    status: 'pending' | 'visited' | 'ignored',
    successMessage: string,
    removeMessage: string
  ) => {
    if (!user) return;

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
      queryClient.invalidateQueries({ queryKey: ["map-clusters"] });
    } catch (error) {
      console.error("Action failed", error);
      toast({ variant: "destructive", title: "Failed to update status" });
    } finally {
      setIsSaving(false);
      setConfirmOpen(false); // Ensure dialog is closed
    }
  };

  const handleAction = async (
    status: 'pending' | 'visited' | 'ignored',
    successMessage: string,
    removeMessage: string
  ) => {
    if (!user) {
      toast({ title: "Please log in first" });
      return;
    }

    // If we are REMOVING the status (toggling off)
    if (viewerStatus === status) {
        // Check for content (reviews, images)
        setIsSaving(true);
        try {
            const { data, error } = await supabase
                .from('user_buildings')
                .select('content, review_images(count)')
                .eq('user_id', user.id)
                .eq('building_id', buildingId)
                .single();

            if (error && error.code !== 'PGRST116') { // Ignore "no rows" error if that happens, though unusual here
                console.error("Error checking content:", error);
            }

            const hasReview = data?.content && data.content.trim().length > 0;
            const imageCount = data?.review_images?.[0]?.count || 0;

            if (hasReview || imageCount > 0) {
                let msg = "You are about to remove this building from your list.";
                if (hasReview && imageCount > 0) {
                    msg += ` This will permanently delete your review and ${imageCount} attached photo${imageCount > 1 ? 's' : ''}.`;
                } else if (hasReview) {
                    msg += " This will permanently delete your written review.";
                } else if (imageCount > 0) {
                    msg += ` This will permanently delete ${imageCount} attached photo${imageCount > 1 ? 's' : ''}.`;
                }

                setConfirmTitle("Delete building data?");
                setConfirmMessage(msg);
            } else {
                setConfirmTitle("Remove from list?");
                setConfirmMessage("Are you sure you want to remove this building from your list?");
            }

            setPendingDeletion(() => () => performUpdate(status, successMessage, removeMessage));
            setConfirmOpen(true);
            setIsSaving(false); // Stop loading so dialog can show
            return;

        } catch (err) {
            console.error("Error in check:", err);
            // Fallback to confirming anyway or just proceeding? Better to confirm safe.
            setConfirmTitle("Remove from list?");
            setConfirmMessage("Are you sure you want to remove this building?");
            setPendingDeletion(() => () => performUpdate(status, successMessage, removeMessage));
            setConfirmOpen(true);
            setIsSaving(false);
            return;
        }
    }

    // Otherwise, just do it (Upsert)
    performUpdate(status, successMessage, removeMessage);
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

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onRemoveFromCollection) {
        onRemoveFromCollection(buildingId);
    }
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onAddCandidate) {
        onAddCandidate(buildingId);
    }
  };

  const buildingUrl = cluster.slug ? `/building/${cluster.slug}` : `/building/${cluster.id}`;

  // Custom Marker Logic
  if (cluster.is_custom_marker) {
      return (
        <div
            className="flex w-[200px] flex-col overflow-hidden rounded-md bg-background shadow-lg relative"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {/* Image or Icon */}
            <div className="relative h-[120px] w-full bg-muted flex items-center justify-center">
                {cluster.image_url ? (
                <>
                    <img
                        src={getBuildingImageUrl(cluster.image_url)}
                        alt={cluster.name || 'Marker'}
                        className="h-full w-full object-cover"
                    />
                </>
                ) : (
                   <MapPin className="h-10 w-10 text-muted-foreground/50" />
                )}
            </div>

            <div className="flex flex-col gap-2 p-3">
                {cluster.name ? (
                <h3 className="text-sm font-semibold line-clamp-2">{cluster.name}</h3>
                ) : (
                <span className="text-xs text-muted-foreground">Unlabeled Marker</span>
                )}

                {cluster.notes && (
                    <p className="text-xs text-muted-foreground line-clamp-3 italic">
                        "{cluster.notes}"
                    </p>
                )}

                <div className="flex flex-col gap-2 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        const url = cluster.google_place_id
                          ? `https://www.google.com/maps/search/?api=1&query=Google&query_place_id=${cluster.google_place_id}`
                          : `https://www.google.com/maps/search/?api=1&query=${cluster.lat},${cluster.lng}`;
                        window.open(url, '_blank');
                      }}
                    >
                      <Map className="h-3 w-3 mr-1" />
                      Google Maps
                    </Button>

                    {cluster.website && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          let url = cluster.website!;
                          if (!url.startsWith('http')) url = `https://${url}`;
                          window.open(url, '_blank');
                        }}
                        title="Visit Website"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  {onRemoveFromCollection && (
                      <div
                          className="flex justify-end"
                          onTouchStart={(e) => e.stopPropagation()}
                      >
                          <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 w-full"
                              onClick={handleRemove}
                          >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Remove Marker
                          </Button>
                      </div>
                  )}
                </div>
            </div>
        </div>
      );
  }

  // Candidate Logic (Simplified Actions)
  if (cluster.is_candidate) {
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
                <div className="absolute top-2 right-2 z-20">
                     <span className="bg-yellow-400 text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        SUGGESTED
                     </span>
                </div>
            </div>
             <div className="flex flex-col gap-2 p-2">
                {cluster.name ? (
                <h3 className="text-sm font-semibold line-clamp-2">{cluster.name}</h3>
                ) : (
                <span className="text-xs text-muted-foreground">Loading...</span>
                )}

                <div
                    className="flex items-center justify-center pt-2 relative z-20"
                    onClick={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                >
                    <Button
                        variant="default"
                        size="sm"
                        className="w-full h-8"
                        onClick={handleAdd}
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        Add to Map
                    </Button>
                </div>
            </div>
        </div>
      );
  }

  // Standard Building Logic
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
        {user && (
          <div
            className="flex items-center justify-between border-t pt-2 relative z-20"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <Button
                variant={isVisited ? "default" : "ghost"}
                size="icon"
                className={`h-8 w-8 ${isVisited ? 'bg-green-600 hover:bg-green-700 text-white' : 'text-muted-foreground hover:bg-primary/10'}`}
                onClick={handleVisit}
                title="Mark as visited"
                disabled={isSaving}
            >
                <Check className={`h-4 w-4 ${isVisited ? 'stroke-[3px]' : ''}`} />
            </Button>

            <Button
                variant={isSaved ? "default" : "ghost"}
                size="icon"
                className={`h-8 w-8 ${isSaved ? '' : 'text-muted-foreground hover:bg-primary/10'}`}
                onClick={handleSave}
                title="Save"
                disabled={isSaving}
            >
                <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
            </Button>

            <Button
                variant={isIgnored ? "destructive" : "ghost"}
                size="icon"
                className={`h-8 w-8 ${isIgnored ? '' : 'text-muted-foreground hover:bg-destructive/10'}`}
                onClick={handleHide}
                title="Hide"
                disabled={isSaving}
            >
                <EyeOff className="h-4 w-4" />
            </Button>

            {onRemoveFromCollection && (
                <div className="ml-1 pl-1 border-l">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={handleRemove}
                        title="Remove from map"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
                <AlertDialogDescription>
                    {confirmMessage}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setConfirmOpen(false)}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                    onClick={() => pendingDeletion && pendingDeletion()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                    Confirm Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
