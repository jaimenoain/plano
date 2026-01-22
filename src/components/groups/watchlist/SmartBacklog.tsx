import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MemberSelector } from "./MemberSelector";
import { SmartBacklogFilters, FilterState } from "./SmartBacklogFilters";
import { SmartBuildingGrid } from "./SmartBuildingGrid";
import { useSmartBacklog } from "@/hooks/useSmartBuildingBacklog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Play, Info } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { slugify } from "@/lib/utils";

interface SmartBacklogProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  group: any;
}

export function SmartBacklog({ group }: SmartBacklogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Default to all active members selected
  const initialMemberIds = useMemo(() => {
    return group?.members
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ?.filter((m: any) => m.status !== 'pending')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((m: any) => m.user.id) || [];
  }, [group]);

  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(initialMemberIds);
  const [filters, setFilters] = useState<FilterState>({
    excludeSeen: true,
  });
  const [isStartingSession, setIsStartingSession] = useState(false);

  // Use the custom hook
  const { data: buildings, isLoading } = useSmartBacklog(group, selectedMemberIds, filters);

  const { data: userWatchlistCount = 0 } = useQuery({
    queryKey: ["user-watchlist-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from("user_buildings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "pending");
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  const handleStartSession = async () => {
    if (!buildings || buildings.length === 0) {
      toast.error("No buildings available to vote on");
      return;
    }
    if (!user) {
        toast.error("You must be logged in");
        return;
    }

    setIsStartingSession(true);
    try {
      const topBuildings = buildings.slice(0, 15); // Top 15 buildings
      const title = `Rapid Review - ${new Date().toISOString().split('T')[0]}`;

      // Generate unique slug
      const baseSlug = slugify(title);
      const { count } = await supabase
        .from("polls")
        .select("id", { count: 'exact', head: true })
        .eq("group_id", group.id)
        .eq("slug", baseSlug);

      let finalSlug = baseSlug;
      if (count && count > 0) {
        finalSlug = `${baseSlug}-${Math.floor(Math.random() * 1000)}`;
      }

      // 1. Create Poll
      const { data: poll, error: pollError } = await supabase
        .from("polls")
        .insert({
          group_id: group.id,
          title: title,
          type: "building_selection",
          status: "open",
          created_by: user.id,
          slug: finalSlug
        })
        .select()
        .single();

      if (pollError) throw pollError;

      // 2. Prepare Questions
      const questionPromises = topBuildings.map(async (building, index) => {
          const mediaUrl = building.main_image_url; // Use internal image url
          const mediaType = "image";

          return {
            poll_id: poll.id,
            question_text: building.name,
            order_index: index,
            response_type: "boolean", // Yes/No
            is_live_active: index === 0, // First one active
            is_revealed: false,
            media_type: mediaType,
            media_url: mediaUrl,
            media_data: {
              building_id: building.id,
              year_completed: building.year_completed,
              architects: building.architects,
              main_image_url: building.main_image_url
            }
          };
      });

      const questionsData = await Promise.all(questionPromises);

      const { data: questions, error: questionsError } = await supabase
        .from("poll_questions")
        .insert(questionsData)
        .select();

      if (questionsError) throw questionsError;

      // 3. Create Options (Yes/No) for each question
      const optionsData = [];
      for (const question of questions) {
        optionsData.push({
          question_id: question.id,
          option_text: "Yes",
          order_index: 0,
          is_correct: true
        });
        optionsData.push({
          question_id: question.id,
          option_text: "No",
          order_index: 1,
          is_correct: false
        });
      }

      const { error: optionsError } = await supabase
        .from("poll_options")
        .insert(optionsData);

      if (optionsError) throw optionsError;

      toast.success("Review started!");
      navigate(`/groups/${group.slug}/live/${poll.slug}/tinder`);

    } catch (error) {
      console.error("Failed to start review:", error);
      toast.error("Failed to start review");
    } finally {
      setIsStartingSession(false);
    }
  };

  // Extract simple member objects for selector
  const members = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return group?.members?.map((m: any) => ({
      id: m.user.id,
      username: m.user.username,
      avatar_url: m.user.avatar_url,
    })) || [];
  }, [group]);

  return (
    <div className="space-y-6 pb-24 relative">
      {/* Header Controls */}
      <div className="bg-background/80 backdrop-blur-md p-4 rounded-xl border shadow-sm sticky top-0 z-20 transition-all duration-200">
         <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="w-full md:w-auto">
               <MemberSelector
                 members={members}
                 selectedMemberIds={selectedMemberIds}
                 onSelectionChange={setSelectedMemberIds}
               />
            </div>
            <div className="w-full md:flex-1 overflow-x-auto">
               <SmartBacklogFilters
                 filters={filters}
                 onFilterChange={setFilters}
               />
            </div>
         </div>
      </div>

      {/* Grid */}
      {userWatchlistCount === 0 && (
        <Alert className="mb-4 bg-muted/50 border-primary/20">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Add buildings you want to visit into your bucket list to keep track of them and to contribute to the group backlog.
          </AlertDescription>
        </Alert>
      )}
      <SmartBuildingGrid buildings={buildings || []} isLoading={isLoading} />

      {/* Floating Action Button */}
      <div className="fixed bottom-24 right-4 md:right-8 z-[60]">
        <Button
          onClick={handleStartSession}
          disabled={isStartingSession || !buildings || buildings.length === 0}
          size="lg"
          className="rounded-full shadow-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-2 px-6 h-14 transition-all hover:scale-105 hover:shadow-2xl border-2 border-indigo-400/20"
        >
          <Play className="h-5 w-5 fill-current" />
          <span className="font-semibold text-base">
            {isStartingSession ? "Creating Review..." : "Start Rapid Review"}
          </span>
        </Button>
      </div>
    </div>
  );
}
