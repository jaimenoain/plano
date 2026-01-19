import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { addDays, format } from "date-fns";

interface ScheduleDialogProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item: any; // Backlog item
  groupId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScheduleDialog({ item, groupId, open, onOpenChange }: ScheduleDialogProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useState<string>("new");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch upcoming sessions
  const { data: upcomingSessions, isLoading } = useQuery({
    queryKey: ["upcoming-sessions-for-scheduling", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_sessions")
        .select("id, title, session_date")
        .eq("group_id", groupId)
        .gte("session_date", new Date().toISOString())
        .order("session_date", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handleConfirm = async () => {
    if (selectedSessionId === "new") {
      // Navigate to create session page
      navigate(
        `/groups/${groupId}/session/create?backlogId=${item.id}&tmdbId=${item.tmdb_id}`
      );
      onOpenChange(false);
    } else {
      // Add to existing session
      setIsSubmitting(true);
      try {
        // 0. Ensure film exists in DB (it might be enriched from TMDB in the UI but not fully in DB if created via other means, though backlog items usually have TMDB ID)
        // Actually, item.film comes from `tmdb-movie` edge function which returns TMDB data.
        // We need to make sure the film is in our `films` table before linking it.
        // The `tmdb-movie` return likely matches the `films` schema or is close.
        // If `item.film.id` is a UUID, it's local. If it's a number, it's TMDB ID and we might need to upsert.
        // However, `item` has `tmdb_id`. The `tmdb-movie` function likely returns the enriched object.
        // Let's assume we need to upsert the film first to be safe, similar to how CreateSession does it.

        const filmData = {
           tmdb_id: item.film.id, // TMDB ID from the enriched object
           title: item.film.title,
           original_title: item.film.original_title,
           poster_path: item.film.poster_path,
           overview: item.film.overview,
           release_date: item.film.release_date || item.film.first_air_date,
           media_type: item.film.media_type || 'movie',
           vote_average: item.film.vote_average,
           // other fields as needed
        };

        // We can't easily upsert without a dedicated function if we don't have the UUID.
        // But `session_films` requires a UUID `film_id`.
        // If `item.film` has a UUID `id`, use it.
        // If not, we need to find or create the film.

        // Let's use the edge function or direct upsert if possible.
        // But `item.film` from `tmdb-movie` function *usually* returns the TMDB structure, where `id` is the TMDB ID (int).
        // Check `PipelineTab.tsx`: `const { data: filmData } = await supabase.functions.invoke("tmdb-movie", ...)`

        // So `item.film.id` is likely an Integer. `session_films.film_id` expects a UUID.
        // We MUST upsert the film into the `films` table to get a UUID.

        // Upsert film based on TMDB ID
        const { data: upsertedFilm, error: upsertError } = await supabase
            .from("films")
            .upsert({
                tmdb_id: filmData.tmdb_id,
                title: filmData.title,
                original_title: filmData.original_title,
                poster_path: filmData.poster_path,
                overview: filmData.overview,
                release_date: filmData.release_date,
                media_type: filmData.media_type,
                vote_average: filmData.vote_average
            }, { onConflict: 'tmdb_id' })
            .select()
            .single();

        if (upsertError) throw upsertError;
        if (!upsertedFilm) throw new Error("Failed to upsert film");

        // 1. Add film to session
        const { error: sessionError } = await supabase
          .from("session_films")
          .insert({
            session_id: selectedSessionId,
            film_id: upsertedFilm.id,
            is_main: false, // Default to secondary film
          });

        if (sessionError) throw sessionError;

        // 2. Update backlog item status
        const { error: backlogError } = await supabase
          .from("group_backlog_items")
          .update({ status: "Scheduled" })
          .eq("id", item.id);

        if (backlogError) throw backlogError;

        toast({
          title: "Added to session",
          description: `"${item.film.title}" has been added to the session.`,
        });

        queryClient.invalidateQueries({ queryKey: ["group-backlog", groupId] });
        onOpenChange(false);
      } catch (error: any) {
        console.error(error);
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to add to session",
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Schedule "{item.film?.title || "Film"}"</DialogTitle>
          <DialogDescription>
            Choose to create a new session or add this film to an existing upcoming session.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Session</label>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading sessions...
              </div>
            ) : (
              <Select
                value={selectedSessionId}
                onValueChange={setSelectedSessionId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">
                    <div className="flex items-center gap-2 font-medium">
                      <Plus className="h-4 w-4" /> Schedule New Session
                    </div>
                  </SelectItem>
                  {upcomingSessions?.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.title || "Untitled Session"} (
                      {format(new Date(session.session_date), "MMM d")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting || isLoading}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {selectedSessionId === "new" ? "Continue" : "Add to Session"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
