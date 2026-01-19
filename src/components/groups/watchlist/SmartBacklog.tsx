import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MemberSelector } from "./MemberSelector";
import { SmartBacklogFilters, FilterState } from "./SmartBacklogFilters";
import { SmartFilmGrid } from "./SmartFilmGrid";
import { useSmartBacklog } from "@/hooks/useSmartBacklog";
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
    maxRuntime: null,
    providers: [],
  });
  const [isStartingSession, setIsStartingSession] = useState(false);

  // Use the custom hook
  const { data: films, isLoading } = useSmartBacklog(group, selectedMemberIds, filters);

  const { data: userWatchlistCount = 0 } = useQuery({
    queryKey: ["user-watchlist-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from("log")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "watchlist");
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });

  const handleStartSession = async () => {
    if (!films || films.length === 0) {
      toast.error("No films available to vote on");
      return;
    }
    if (!user) {
        toast.error("You must be logged in");
        return;
    }

    setIsStartingSession(true);
    try {
      const topFilms = films.slice(0, 15); // Top 15 films
      const title = `Voting Session - ${new Date().toISOString().split('T')[0]}`;

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
          type: "film_selection",
          status: "open",
          created_by: user.id,
          slug: finalSlug
        })
        .select()
        .single();

      if (pollError) throw pollError;

      // 2. Prepare Questions with Trailer Fetching (Parallel)
      const questionPromises = topFilms.map(async (film, index) => {
          let mediaUrl = film.poster_path ? `https://image.tmdb.org/t/p/w500${film.poster_path}` : null;
          let mediaType = "image";

          // 1. Try to use cached trailer
          if (film.trailer) {
              mediaUrl = film.trailer;
              mediaType = "video";
          }
          // 2. Fallback: Try to fetch trailer if TMDB ID exists
          else if (film.tmdb_id) {
             try {
                 const { data: tmdbData } = await supabase.functions.invoke("tmdb-movie", {
                    body: { movieId: film.tmdb_id, type: "movie" }
                 });

                 // Look for trailer in results
                 // Assuming tmdb-movie returns standard TMDB details which includes videos
                 if (tmdbData?.videos?.results) {
                     const trailer = tmdbData.videos.results.find((v: any) => v.type === "Trailer" && v.site === "YouTube");
                     if (trailer) {
                         mediaUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
                         mediaType = "video";
                     }
                 }
             } catch (err) {
                 console.warn(`Failed to fetch trailer for ${film.title}`, err);
                 // Fallback to poster is already set
             }
          }

          return {
            poll_id: poll.id,
            question_text: film.title,
            order_index: index,
            response_type: "boolean", // Yes/No
            is_live_active: index === 0, // First one active
            is_revealed: false,
            media_type: mediaType,
            media_url: mediaUrl,
            media_data: {
              tmdb_id: film.tmdb_id,
              overview: film.overview,
              release_date: film.release_date,
              runtime: film.runtime,
              poster_path: film.poster_path
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

      toast.success("Session started!");
      navigate(`/groups/${group.slug}/live/${poll.slug}/tinder`);

    } catch (error) {
      console.error("Failed to start session:", error);
      toast.error("Failed to start session");
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
            Add films you want to watch into your watchlist to keep track of them and to contribute to the group watchlist.
          </AlertDescription>
        </Alert>
      )}
      <SmartFilmGrid films={films || []} isLoading={isLoading} />

      {/* Floating Action Button */}
      <div className="fixed bottom-24 right-4 md:right-8 z-[60]">
        <Button
          onClick={handleStartSession}
          disabled={isStartingSession || !films || films.length === 0}
          size="lg"
          className="rounded-full shadow-xl bg-indigo-600 hover:bg-indigo-700 text-white gap-2 px-6 h-14 transition-all hover:scale-105 hover:shadow-2xl border-2 border-indigo-400/20"
        >
          <Play className="h-5 w-5 fill-current" />
          <span className="font-semibold text-base">
            {isStartingSession ? "Creating Session..." : "Start Voting Session"}
          </span>
        </Button>
      </div>
    </div>
  );
}
