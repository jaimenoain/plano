import { useState, useEffect, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useDiscoveryFeed } from "@/hooks/useDiscoveryFeed";
import { DiscoveryCard } from "@/components/feed/DiscoveryCard";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExploreTutorial } from "@/features/search/components/ExploreTutorial";
import { AppLayout } from "@/components/layout/AppLayout";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export default function Explore() {
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { state } = useSidebar();
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem("explore-tutorial-seen");
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }
  }, []);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status
  } = useDiscoveryFeed({});

  const { containerRef, isVisible } = useIntersectionObserver();

  useEffect(() => {
    if (isVisible && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
    }
  }, [isVisible, hasNextPage, isFetchingNextPage]);

  // Extract flattened list
  const allBuildings = data?.pages.flat() || [];

  // Manage hidden buildings (swiped away)
  const [hiddenBuildingIds, setHiddenBuildingIds] = useState<Set<string>>(new Set());

  const buildings = useMemo(() =>
    allBuildings.filter(b => !hiddenBuildingIds.has(b.id)),
  [allBuildings, hiddenBuildingIds]);

  const handleSkip = async (buildingId: string) => {
      try {
          if (!user) return;
          const { error } = await supabase.from("user_buildings").upsert({
              user_id: user.id,
              building_id: buildingId,
              status: 'ignored',
              edited_at: new Date().toISOString()
          }, { onConflict: 'user_id, building_id' });

          if (error) throw error;
      } catch (error) {
          console.error("Skip failed", error);
      }
  };

  const handleSwipeSave = async (buildingId: string) => {
      setHiddenBuildingIds(prev => {
          const next = new Set(prev);
          next.add(buildingId);
          return next;
      });
      toast.success("Saved to your list");

      try {
          if (!user) return;
          const { error } = await supabase.from("user_buildings").upsert({
              user_id: user.id,
              building_id: buildingId,
              status: 'pending',
              edited_at: new Date().toISOString()
          }, { onConflict: 'user_id, building_id' });

          if (error) throw error;

          queryClient.invalidateQueries({ queryKey: ['discovery_feed'] });
      } catch (error) {
          console.error("Save failed", error);
          toast.error("Failed to save");
      }
  };

  const handleSwipeHide = async (buildingId: string) => {
      setHiddenBuildingIds(prev => {
          const next = new Set(prev);
          next.add(buildingId);
          return next;
      });

      try {
          if (!user) return;
          const { error } = await supabase.from("user_buildings").upsert({
              user_id: user.id,
              building_id: buildingId,
              status: 'ignored',
              edited_at: new Date().toISOString()
          }, { onConflict: 'user_id, building_id' });

          if (error) throw error;

          queryClient.invalidateQueries({ queryKey: ['discovery_feed'] });
      } catch (error) {
          console.error("Hide failed", error);
          toast.error("Failed to skip building");
      }
  };

  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  return (
      <div
        className={cn(
          "transition-[margin-left] duration-200 ease-linear w-auto",
          state === "expanded" ? "md:ml-[calc(var(--sidebar-width)-var(--sidebar-width-icon))]" : "md:ml-0"
        )}
      >
        <AppLayout
          isFullScreen
          showHeader={false}
        >
          {showTutorial && <ExploreTutorial onComplete={() => setShowTutorial(false)} />}

          {/* Vertical Snap Container */}
          <div className="relative h-[calc(100vh-80px)] md:h-screen w-full bg-black text-white overflow-hidden">
            <div className="h-full w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar">
              {status === "pending" ? (
                <div className="h-full w-full flex items-center justify-center snap-center">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
            ) : status === 'error' ? (
                <div className="h-full w-full flex items-center justify-center snap-center text-red-400">
                    Failed to load feed
                </div>
            ) : buildings.length === 0 ? (
                <div className="h-full w-full flex flex-col items-center justify-center snap-center text-gray-400 gap-4">
                    <p>No buildings found</p>
                </div>
            ) : (
                buildings.map((building) => (
                    <div key={building.id} className="h-full w-full snap-start snap-always">
                        <DiscoveryCard
                            building={building}
                            onSwipeSave={() => handleSwipeSave(building.id)}
                            onSwipeHide={() => handleSwipeHide(building.id)}
                            onSkip={() => handleSkip(building.id)}
                        />
                    </div>
                ))
            )}

              {/* Infinite Scroll Trigger */}
              {(hasNextPage || isFetchingNextPage) && (
                <div ref={containerRef as any} className="h-20 w-full flex justify-center items-center p-4 snap-end">
                  {isFetchingNextPage && <Loader2 className="h-6 w-6 animate-spin text-white/50" />}
                </div>
              )}
            </div>
          </div>
        </AppLayout>
      </div>
  );
}
