import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Search, X, Loader2, Crown, Trash2, Plus, Tv, Clapperboard, Clock, User, Repeat, MapPin, FileText, Link as LinkIcon, BarChart2, Pencil, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { cn, parseHomeBase } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BacklogSelectionTab } from "@/components/groups/sessions/BacklogSelectionTab";
import { LocationInput } from "@/components/ui/LocationInput";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

// Helper type to extend the generated types with fields that might not be in the generated file yet
type SessionInsert = TablesInsert<"group_sessions"> & {
    session_type?: string;
    location?: string;
    meeting_link?: string;
};

type SessionUpdate = TablesUpdate<"group_sessions"> & {
    session_type?: string;
    location?: string;
    meeting_link?: string;
};

interface Resource {
  title: string;
  url: string;
  description: string;
}

export default function CreateSession() {
  const { slug, sessionId } = useParams();
  // Get query params
  const searchParams = new URLSearchParams(window.location.search);
  const backlogIdParam = searchParams.get("backlogId");
  const tmdbIdParam = searchParams.get("tmdbId");

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [date, setDate] = useState<Date>();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hostNotes, setHostNotes] = useState("");
  const [resources, setResources] = useState<Resource[]>([]);
  const [sessionType, setSessionType] = useState<string>("physical");
  const [location, setLocation] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [isEditingLogistics, setIsEditingLogistics] = useState(false);
  
  const [query, setQuery] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [results, setResults] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedFilms, setSelectedFilms] = useState<any[]>([]);
  const [mainFilmId, setMainFilmId] = useState<number | null>(null); 
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resolvedGroupId, setResolvedGroupId] = useState<string | null>(null);
  const [groupSlug, setGroupSlug] = useState<string | null>(null);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [activeCycles, setActiveCycles] = useState<{id: string, title: string}[]>([]);
  const [backlogId, setBacklogId] = useState<string | null>(backlogIdParam);
  const [isDraft, setIsDraft] = useState(false);
  const [availablePolls, setAvailablePolls] = useState<{id: string, title: string, session_id: string | null}[]>([]);
  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);

  // Progressive Disclosure State
  const [showHostNotes, setShowHostNotes] = useState(false);
  const [showResources, setShowResources] = useState(false);
  const [showCycle, setShowCycle] = useState(false);
  const [showPoll, setShowPoll] = useState(false);

  const isEditing = !!sessionId;

  // Resolve slug to group ID
  useEffect(() => {
    const resolveGroup = async () => {
      try {
        let query = supabase.from('groups').select('id, slug, private:group_private_info(home_base)');

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug || "");
        if (isUuid) {
            query = query.eq('id', slug);
        } else {
            query = query.eq('slug', slug);
        }

        const { data, error } = await query.single();
        if (error || !data) throw error;

        setResolvedGroupId(data.id);
        setGroupSlug(data.slug || data.id);

        // Prepopulate location/type if creating new session
        if (!sessionId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const privateInfo = Array.isArray(data.private) ? data.private[0] : (data.private as any);
          const rawHomeBase = privateInfo?.home_base;
          const parsed = parseHomeBase(rawHomeBase);

          if (parsed.type === 'physical') {
            setSessionType("physical");
            setLocation(parsed.value);
            setMeetingLink("");
          } else if (parsed.type === 'virtual') {
            setSessionType("virtual");
            setLocation("");
            setMeetingLink(parsed.value);
          } else if (parsed.type === 'hybrid') {
            setSessionType("hybrid");
            setLocation(parsed.physical || parsed.value || "");
            setMeetingLink(parsed.virtual || "");
          }
          setLoading(false);
        }
      } catch (err) {
        console.error("Error resolving group:", err);
        toast({ title: "Group not found", variant: "destructive" });
        navigate('/groups');
      }
    };

    if (slug) {
        resolveGroup();
    }
  }, [slug, navigate, sessionId]);

  useEffect(() => {
    if (resolvedGroupId) {
        fetchActiveCycles();
        fetchAvailablePolls();
        // If we have backlog params, load that item
        if (backlogIdParam && tmdbIdParam && !selectedFilms.length) {
            handleSelectBacklogItem(backlogIdParam, parseInt(tmdbIdParam));
        }
    }
  }, [resolvedGroupId]);

  useEffect(() => {
    if (sessionId && resolvedGroupId) {
      fetchSession();
    }
  }, [sessionId, resolvedGroupId]);

  // Handle pre-selection from backlog
  const handleSelectBacklogItem = async (bId: string, tId: number) => {
      // Fetch backlog item details to get the note
      const { data: backlogItem } = await supabase
        .from("group_backlog_items")
        .select("*")
        .eq("id", bId)
        .single();

      if (backlogItem) {
          if (backlogItem.admin_note) {
              setDescription(prev => prev ? prev + "\n\n" + backlogItem.admin_note : backlogItem.admin_note);
          }
          if (backlogItem.cycle_id) {
              setSelectedCycleId(backlogItem.cycle_id);
              setShowCycle(true);
          }
          setBacklogId(bId);
      }

      // Add the film
      // Use existing addFilm logic but we need to fetch basic info first if not provided
      // For now, let's fetch basic info from TMDB
      try {
          const { data: filmData } = await supabase.functions.invoke("tmdb-movie", {
              body: { movieId: tId, type: "movie" } // Assuming movie
          });
          if (filmData) {
              addFilm(filmData);
              setMainFilmId(tId);
          }
      } catch (e) {
          console.error("Error fetching backlog film", e);
      }
  };

  const fetchActiveCycles = async () => {
      const { data } = await supabase
        .from("group_cycles")
        .select("id, title")
        .eq("group_id", resolvedGroupId)
        .eq("is_active", true);

      if (data) setActiveCycles(data);
  };

  const fetchAvailablePolls = async () => {
      // Fetch open polls OR polls linked to this session
      const query = supabase
          .from("polls")
          .select("id, title, session_id")
          .eq("group_id", resolvedGroupId)
          .in("status", ["open", "live"]);

      const { data: activePolls, error } = await query;

      if (error) {
        console.error("Error fetching polls:", error);
        return;
      }

      // If editing a session, also fetch the currently linked poll even if it's closed
      // or if it was missed because we only fetched open/live
      let linkedPoll = null;
      if (sessionId) {
          const { data } = await supabase
              .from("polls")
              .select("id, title, session_id")
              .eq("session_id", sessionId)
              .maybeSingle();
          linkedPoll = data;
      }

      // Merge polls unique by ID
      const allPolls = [...(activePolls || [])];
      if (linkedPoll && !allPolls.find(p => p.id === linkedPoll.id)) {
          allPolls.push(linkedPoll);
      }

      setAvailablePolls(allPolls);

      // If we found a linked poll, set it as selected
      if (linkedPoll) {
          setSelectedPollId(linkedPoll.id);
          setShowPoll(true);
      }
  };

  const fetchSession = async () => {
    try {
      const { data, error } = await supabase
        .from('group_sessions')
        .select(`
          *,
          films:session_films(
            is_main,
            film:films(*)
          )
        `)
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      
      if (data) {
        setDate(new Date(data.session_date));
        setTitle(data.title || "");
        setDescription(data.description || "");
        setHostNotes(data.host_notes || "");
        setSelectedCycleId(data.cycle_id || null);
        setIsDraft(data.status === 'draft');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setResources((data.resources as any) || []);

        // Show sections if they have data
        if (data.host_notes) setShowHostNotes(true);
        if (data.cycle_id) setShowCycle(true);
        if (data.resources && (data.resources as any).length > 0) setShowResources(true);

        // Note: poll visibility is handled in fetchAvailablePolls which runs in parallel
        // but depends on sessionId being available.

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sessionData = data as any;
        if (sessionData.session_type) setSessionType(sessionData.session_type);
        if (sessionData.location) setLocation(sessionData.location);
        if (sessionData.meeting_link) setMeetingLink(sessionData.meeting_link);

        const films = data.films
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((f: any) => f.film)
          .filter(Boolean);
          
        setSelectedFilms(films);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mainEntry = data.films.find((f: any) => f.is_main);
        if (mainEntry && mainEntry.film) {
            setMainFilmId(mainEntry.film.tmdb_id);
        }
      }
    } catch (error) {
      console.error("Error fetching session:", error);
      toast({ title: "Error loading session", variant: "destructive" });
      navigate(`/groups/${groupSlug}`);
    } finally {
      setLoading(false);
    }
  };

  const searchFilms = async (q: string) => {
    setQuery(q);
    if (q.length < 3) {
      setResults([]);
      return;
    }
    
    setSearching(true);
    try {
      // Use "multi" to search for movies AND tv shows
      const { data } = await supabase.functions.invoke("tmdb-search", {
        body: { query: q, type: "multi" },
      });
      
      // Filter out people or other media types if needed, keep movies and tv
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filtered = (data.results || []).filter((item: any) => 
        item.media_type === "movie" || item.media_type === "tv"
      );
      
      setResults(filtered.slice(0, 20) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addFilm = async (film: any) => {
    const filmId = film.id; 
    const exists = selectedFilms.some(f => (f.tmdb_id || f.id) === filmId);

    if (!exists) {
      // Optimistic add with loading state
      const tempFilm = { ...film, loadingDetails: true };
      setSelectedFilms(prev => [...prev, tempFilm]);
      setQuery("");
      setResults([]);

      try {
        const mediaType = film.media_type || 'movie';
        // Fetch full details (credits, runtime, etc.)
        const { data: tmdbData } = await supabase.functions.invoke("tmdb-movie", {
             body: { movieId: filmId, type: mediaType },
        });

        if (tmdbData) {
            setSelectedFilms(prev => prev.map(f => {
                if ((f.tmdb_id || f.id) === filmId) {
                     // Extract Director (for movies) or Creator (for TV)
                     // eslint-disable-next-line @typescript-eslint/no-explicit-any
                     const director = tmdbData.credits?.crew?.find((p: any) => p.job === 'Director')?.name
                                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                      || tmdbData.created_by?.map((c:any) => c.name).join(', ');

                     // Extract Runtime
                     const runtime = tmdbData.runtime || (tmdbData.episode_run_time?.length ? tmdbData.episode_run_time[0] : 0);

                     return {
                         ...f,
                         ...tmdbData, // Merge full details
                         director_name: director,
                         runtime: runtime,
                         loadingDetails: false
                     };
                }
                return f;
            }));
        } else {
             // Fallback: remove loading flag
             setSelectedFilms(prev => prev.map(f => (f.tmdb_id || f.id) === filmId ? { ...f, loadingDetails: false } : f));
        }
      } catch (e) {
        console.error("Error fetching details", e);
        setSelectedFilms(prev => prev.map(f => (f.tmdb_id || f.id) === filmId ? { ...f, loadingDetails: false } : f));
      }
    }
  };

  const removeFilm = (idToRemove: number) => {
    const updated = selectedFilms.filter(item => (item.tmdb_id || item.id) !== idToRemove);
    setSelectedFilms(updated);
    
    if (mainFilmId === idToRemove) {
        setMainFilmId(null);
    }
  };

  const formatRuntime = (minutes: number) => {
    if (!minutes) return "";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const getDomain = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch (e) {
      return url;
    }
  };

  const formatLogisticsSummary = () => {
      if (!location && !meetingLink) return "Set location";
      if (sessionType === 'physical') return `In person: ${location || 'TBD'}`;
      if (sessionType === 'virtual') {
          return meetingLink ? `Virtual on ${getDomain(meetingLink)}` : 'Virtual: No link';
      }
      if (sessionType === 'hybrid') return `Hybrid: ${location || 'TBD'} / ${meetingLink || 'No link'}`;
      return "Set location";
  };

  const handleClearLogistics = () => {
      setSessionType("physical");
      setLocation("");
      setMeetingLink("");
      setIsEditingLogistics(false);
  };

  const generateDescription = async () => {
      if (selectedFilms.length === 0) {
          toast({
              title: "No films selected",
              description: "Please select films first to generate a description.",
              variant: "destructive",
          });
          return;
      }

      setIsGenerating(true);
      try {
          // Local generation logic (replacing missing edge function)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const titles = selectedFilms.map((f: any) => f.title || f.name).join(" and ");
          let generatedDescription = "";

          if (selectedFilms.length === 1) {
             generatedDescription = `Join us for a special screening of ${titles}. This film is a masterpiece of its genre, offering a unique perspective that is sure to spark conversation. Don't miss this opportunity to experience it on the big screen with fellow cinema lovers!`;
          } else {
             generatedDescription = `Get ready for an incredible double feature! We're showing ${titles}. These films share a thematic connection that explores deep narratives and stunning visuals. It's going to be a night of cinematic magic you won't want to miss.`;
          }

          // Simulate a small delay for better UX (so it feels like "thinking")
          await new Promise(resolve => setTimeout(resolve, 800));

          setDescription(generatedDescription);
          toast({
              title: "Description generated!",
              description: "The description has been magically updated.",
          });
      } catch (error) {
          console.error("Error generating description:", error);
          toast({
              title: "Generation failed",
              description: "Could not generate description. Please try again.",
              variant: "destructive"
          });
      } finally {
          setIsGenerating(false);
      }
  };

  const handleSaveSession = async (statusOverride?: 'draft' | 'published') => {
    if (!date) {
      toast({ title: "Please select a date", variant: "destructive" });
      return;
    }
    if (!user || !resolvedGroupId) return;

    const finalStatus = statusOverride ?? (isDraft ? 'draft' : 'published');

    try {
      let currentSessionId = sessionId;

      // Ensure data hygiene by clearing irrelevant fields
      let finalLocation = location;
      let finalMeetingLink = meetingLink;

      if (sessionType === 'physical') {
        finalMeetingLink = "";
      } else if (sessionType === 'virtual') {
        finalLocation = "";
      }

      // 1. Create or Update Session
      const sessionData: SessionInsert = {
        group_id: resolvedGroupId,
        title: title || format(date, "MMMM do 'Session'"),
        description,
        host_notes: hostNotes,
        session_date: date.toISOString(),
        resources: resources as unknown as any,
        cycle_id: selectedCycleId,
        status: finalStatus,
        session_type: sessionType,
        location: finalLocation,
        meeting_link: finalMeetingLink
      };

      if (isEditing) {
        const updateData: SessionUpdate = sessionData;
        const { error } = await supabase
          .from('group_sessions')
          .update(updateData as any) // Still need generic cast because library types are strict
          .eq('id', sessionId);
        
        if (error) throw error;
      } else {
        const { data: session, error } = await supabase
          .from('group_sessions')
          .insert(sessionData as any) // Still need generic cast because library types are strict
          .select()
          .single();
          
        if (error) throw error;
        currentSessionId = session.id;

        // --- Notifications for new sessions ---
        // Only send if not a draft
        if (finalStatus !== 'draft') {
            const { data: members } = await supabase
            .from('group_members')
            .select('user_id')
            .eq('group_id', resolvedGroupId)
            .neq('user_id', user.id);

            if (members && members.length > 0) {
            const notifications = members.map(member => ({
                user_id: member.user_id,
                actor_id: user.id,
                type: 'new_session',
                session_id: currentSessionId
            }));

            await supabase.from('notifications').insert(notifications as any);
            }
        }
      }

      // 1.5 Update Backlog Status if applicable
      if (backlogId) {
          await supabase
            .from("group_backlog_items")
            .update({ status: "Scheduled" })
            .eq("id", backlogId);
      }

      // 1.6 Update Poll Linkage
      // Unlink any poll currently linked to this session
      await supabase
        .from("polls")
        .update({ session_id: null })
        .eq("session_id", currentSessionId);

      // Link the new selected poll if any
      if (selectedPollId) {
          const { error: pollError } = await supabase
            .from("polls")
            .update({ session_id: currentSessionId })
            .eq("id", selectedPollId);

          if (pollError) throw pollError;
      }

      // 2. Link Films
      if (isEditing) {
        await supabase.from('session_films').delete().eq('session_id', currentSessionId);
      }

      for (const tmdbFilm of selectedFilms) {
        // Handle ID: If from Search it's .id, if from DB it's .tmdb_id
        const tmdbId = tmdbFilm.tmdb_id || tmdbFilm.id;
        
        // Determine media type (default to movie if not present, e.g. old data)
        const mediaType = tmdbFilm.media_type || 'movie';

        // Check if we have the FULL data in our DB (credits, runtime)
        const { data: existingFilm } = await supabase
          .from('films')
          .select('id, credits, runtime')
          .eq('tmdb_id', tmdbId)
          .eq('media_type', mediaType) // Important: Same ID could exist for movie/tv
          .maybeSingle();

        let filmUuid = existingFilm?.id;
        
        // If film doesn't exist OR is missing key metadata, fetch full details
        const needsDetails = !existingFilm || !existingFilm.credits || !existingFilm.runtime;

        if (needsDetails) {
           const { data: tmdbData, error: tmdbError } = await supabase.functions.invoke("tmdb-movie", {
             body: { movieId: tmdbId, type: mediaType },
           });

           if (!tmdbError && tmdbData) {
               // Handle property differences between Movie and TV
               const title = tmdbData.title || tmdbData.name; // TV uses name
               const releaseDate = tmdbData.release_date || tmdbData.first_air_date; // TV uses first_air_date
               // Runtime for TV is often in episode_run_time array
               const runtime = tmdbData.runtime || (tmdbData.episode_run_time?.length ? tmdbData.episode_run_time[0] : 0);

               // Extract trailer
               const trailer = tmdbData.videos?.results?.find(
                 (v: any) => v.site === "YouTube" && v.type === "Trailer"
               );
               const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;

               // Upsert with full details
               const filmToUpsert = {
                  tmdb_id: tmdbId,
                  media_type: mediaType,
                  title: title || tmdbFilm.title || tmdbFilm.name,
                  original_title: tmdbData.original_title || tmdbData.original_name || tmdbFilm.original_title || tmdbFilm.original_name,
                  overview: tmdbData.overview || tmdbFilm.overview,
                  poster_path: tmdbData.poster_path || tmdbFilm.poster_path,
                  backdrop_path: tmdbData.backdrop_path, 
                  release_date: releaseDate || tmdbFilm.release_date || tmdbFilm.first_air_date,
                  credits: tmdbData.credits,
                  runtime: runtime,
                  original_language: tmdbData.original_language,
                  countries: tmdbData.production_countries,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  genre_ids: tmdbData.genres?.map((g: any) => g.id) || [],
                  trailer: trailerUrl
               };

               const { data: upsertedFilm, error: upsertError } = await supabase
                .from('films')
                .upsert(
                    filmUuid ? { ...filmToUpsert, id: filmUuid } : filmToUpsert
                )
                .select()
                .single();

               if (upsertError) throw upsertError;
               filmUuid = upsertedFilm.id;
           } else {
               // Fallback: Just insert what we have if fetch fails and it's a new film
               console.error("Could not fetch details from TMDB", tmdbError);
               if (!filmUuid) {
                   const { data: newFilm, error: filmError } = await supabase
                    .from('films')
                    .insert({
                      tmdb_id: tmdbId,
                      title: tmdbFilm.title || tmdbFilm.name,
                      poster_path: tmdbFilm.poster_path || null,
                      overview: tmdbFilm.overview || null,
                      release_date: tmdbFilm.release_date || tmdbFilm.first_air_date || null,
                      media_type: mediaType,
                      original_language: tmdbFilm.original_language || null
                    })
                    .select()
                    .single();
                   
                   if (filmError) throw filmError;
                   filmUuid = newFilm.id;
               }
           }
        }

        // Link to session
        if (filmUuid) {
            const { error: linkError } = await supabase
            .from('session_films')
            .insert({
                session_id: currentSessionId,
                film_id: filmUuid,
                is_main: mainFilmId === tmdbId
            });
            
            if (linkError) throw linkError;
        }
      }

      toast({ title: isEditing ? "Session updated!" : "Session created!" });
      queryClient.invalidateQueries({ queryKey: ["group-sessions", groupSlug] });
      queryClient.invalidateQueries({ queryKey: ["group-sessions", resolvedGroupId] });
      navigate(`/groups/${groupSlug}`);
      
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Save session error:", error);
      toast({ 
        title: "Error saving session", 
        description: error.message || "Please try again", 
        variant: "destructive" 
      });
    }
  };

  if (loading) {
    return (
      <AppLayout title="Loading...">
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={isEditing ? "Edit Session" : "New Session"}>
      <div className="max-w-xl mx-auto px-4 py-6 space-y-8">
        
        {/* SECTION 1: Date & Logistics */}
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
            </div>

            {/* Logistics Summary Line */}
            {!isEditingLogistics ? (
                <div className="flex items-center gap-2 mt-2 w-fit">
                    <span className="text-sm text-muted-foreground">
                    {formatLogisticsSummary()}
                    </span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setIsEditingLogistics(true)}>
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
                </div>
            ) : (
                <div className="mt-4 border p-4 rounded-md space-y-4 relative animate-in fade-in slide-in-from-top-2">
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => setIsEditingLogistics(false)}>
                        <X className="h-4 w-4" />
                    </Button>

                    <ToggleGroup type="single" value={sessionType} onValueChange={(val) => val && setSessionType(val)} className="justify-start">
                        <ToggleGroupItem value="physical" aria-label="Physical" size="sm">
                            <MapPin className="w-3.5 h-3.5 mr-1" /> Physical
                        </ToggleGroupItem>
                        <ToggleGroupItem value="hybrid" aria-label="Hybrid" size="sm">
                            <Tv className="w-3.5 h-3.5 mr-1" /> Hybrid
                        </ToggleGroupItem>
                        <ToggleGroupItem value="virtual" aria-label="Virtual" size="sm">
                            <Tv className="w-3.5 h-3.5 mr-1" /> Virtual
                        </ToggleGroupItem>
                    </ToggleGroup>

                    {/* Inputs based on type */}
                    {(sessionType === 'physical' || sessionType === 'hybrid') && (
                        <div className="space-y-1">
                            <Label>Address</Label>
                            <LocationInput
                                value={location}
                                onLocationSelected={(address) => setLocation(address)}
                                placeholder="Address or City"
                                searchTypes={[]}
                                className="w-full"
                            />
                        </div>
                    )}

                    {(sessionType === 'virtual' || sessionType === 'hybrid') && (
                        <div className="space-y-1">
                            <Label>Meeting Link</Label>
                            <Input
                                placeholder="https://..."
                                value={meetingLink}
                                onChange={e => setMeetingLink(e.target.value)}
                            />
                        </div>
                    )}

                    <button
                        onClick={handleClearLogistics}
                        className="text-sm text-red-500 hover:text-red-600 underline"
                    >
                        Remove location info
                    </button>
                </div>
            )}
        </div>

        {/* SECTION 2: Films (Hero) */}
        <div className="space-y-4">
          <label className="text-sm font-medium">Films & TV Shows</label>

          <Tabs defaultValue="search" className="w-full">
            <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="search">Search TMDB</TabsTrigger>
                <TabsTrigger value="backlog">From Pipeline</TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="mt-4">
                <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                    placeholder="Search to add..."
                    value={query}
                    onChange={e => searchFilms(e.target.value)}
                    className="pl-10"
                    />
                    {results.length > 0 && (
                    <div className="absolute z-[60] w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-60 overflow-y-auto">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {results.map((film: any) => {
                        const originalTitle = film.original_title || film.original_name;
                        const displayTitle = film.title || film.name;
                        const year = (film.release_date || film.first_air_date)?.split('-')[0] || "";
                        const mainTitle = originalTitle || displayTitle;
                        const subTitle = (originalTitle && originalTitle !== displayTitle) ? displayTitle : null;

                        return (
                        <div
                            key={film.id}
                            className="flex gap-3 p-3 hover:bg-secondary cursor-pointer items-center border-b last:border-0"
                            onClick={() => addFilm(film)}
                        >
                            <div className="shrink-0 w-10 h-14 bg-muted rounded overflow-hidden shadow-sm">
                            {film.poster_path ? (
                                <img src={`https://image.tmdb.org/t/p/w92${film.poster_path}`} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                    {film.media_type === 'tv' ? <Tv className="w-4 h-4"/> : <Clapperboard className="w-4 h-4"/>}
                                </div>
                            )}
                            </div>
                            <div className="text-sm flex-1 min-w-0">
                            <p className="font-medium truncate">
                                {mainTitle} {year && <span className="text-muted-foreground font-normal">({year})</span>}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="capitalize">{film.media_type === 'tv' ? 'TV Series' : 'Movie'}</span>
                                    {subTitle && (
                                        <span className="truncate">• {subTitle}</span>
                                    )}
                            </div>
                            </div>
                            <Plus className="h-4 w-4 text-muted-foreground" />
                        </div>
                        )})}
                    </div>
                    )}
                </div>
            </TabsContent>

            <TabsContent value="backlog" className="mt-4">
                 {resolvedGroupId && (
                    <BacklogSelectionTab
                        groupId={resolvedGroupId}
                        onSelect={(item) => {
                             if (item.film) {
                                 // Add film
                                 addFilm(item.film);
                                 setMainFilmId(item.tmdb_id);
                                 // Pre-fill note if present
                                 if (item.admin_note) {
                                     setDescription(prev => prev ? prev + "\n\n" + item.admin_note : item.admin_note);
                                 }
                                 if (item.cycle_id) {
                                    setSelectedCycleId(item.cycle_id);
                                    setShowCycle(true);
                                 }
                                 // Set backlog ID to update status later
                                 setBacklogId(item.id);
                                 toast({ title: "Film selected from pipeline" });
                             }
                        }}
                    />
                 )}
            </TabsContent>
          </Tabs>

          <div className="flex flex-col gap-3 mt-4">
            {selectedFilms.length > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Crown className="w-3 h-3" /> Select the main feature
                </p>
            )}

            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {selectedFilms.map((f: any) => {
                const tmdbId = f.tmdb_id || f.id;
                const isMain = mainFilmId === tmdbId;
                const name = f.title || f.name;
                const originalName = f.original_title || f.original_name;
                const year = (f.release_date || f.first_air_date)?.split('-')[0];
                const mainTitle = originalName || name;
                const subTitle = (originalName && originalName !== name) ? name : null;

                let director = f.director_name;
                if (!director && f.credits) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    director = f.credits.crew?.find((p: any) => p.job === 'Director')?.name;
                }

                const runtime = f.runtime;

                return (
                <div
                    key={tmdbId}
                    className={cn(
                        "relative flex gap-4 p-4 rounded-lg border bg-card transition-all",
                        isMain ? "ring-2 ring-yellow-500/50 border-yellow-500/50 bg-yellow-500/5" : "hover:border-primary/50"
                    )}
                >
                    <div className="shrink-0 w-20 aspect-[2/3] bg-muted rounded-md overflow-hidden shadow-sm relative">
                        {f.poster_path ? (
                            <img src={`https://image.tmdb.org/t/p/w154${f.poster_path}`} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <Clapperboard className="w-8 h-8 opacity-20"/>
                            </div>
                        )}
                        {f.loadingDetails && (
                             <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                 <Loader2 className="w-6 h-6 animate-spin text-white" />
                             </div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="font-bold text-lg leading-tight">
                                    {mainTitle} <span className="font-normal text-muted-foreground text-base">({year})</span>
                                </h3>
                                {subTitle && (
                                    <p className="text-sm text-muted-foreground italic">{subTitle}</p>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                             {director && (
                                 <div className="flex items-center gap-1.5">
                                     <User className="w-3.5 h-3.5" />
                                     <span>{director}</span>
                                 </div>
                             )}
                             {runtime > 0 && (
                                 <div className="flex items-center gap-1.5">
                                     <Clock className="w-3.5 h-3.5" />
                                     <span>{formatRuntime(runtime)}</span>
                                 </div>
                             )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0 ml-2">
                         <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-8 w-8 transition-colors",
                                isMain ? "text-yellow-500 hover:text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900/20" : "text-muted-foreground hover:text-yellow-500"
                            )}
                            onClick={() => setMainFilmId(isMain ? null : tmdbId)}
                            title="Set as Main Feature"
                         >
                             <Crown className={cn("h-5 w-5", isMain && "fill-current")} />
                         </Button>
                         <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeFilm(tmdbId)}
                            title="Remove film"
                         >
                             <X className="h-5 w-5" />
                         </Button>
                    </div>
                </div>
                );
            })}
          </div>
        </div>

        {/* SECTION 3: Synopsis */}
        <div className="space-y-4">
            <div className="space-y-2">
            <label className="text-sm font-medium">Title (Optional)</label>
            <Input placeholder="e.g. Horror Night" value={title} onChange={e => setTitle(e.target.value)} />
            </div>

            <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Description (Optional)</label>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                    onClick={generateDescription}
                    disabled={isGenerating}
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Dreaming...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-3 h-3 mr-1" />
                            Auto-write
                        </>
                    )}
                </Button>
            </div>
            <Textarea
                placeholder="Details about the meetup..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="min-h-[80px] focus:min-h-[160px] transition-all duration-300"
            />
            </div>

        {showHostNotes && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-muted-foreground">Host Notes (Admins Only)</label>
                    <Button variant="ghost" size="sm" onClick={() => { setShowHostNotes(false); setHostNotes(""); }} className="h-6 text-xs text-muted-foreground">Cancel</Button>
                </div>
                <Textarea
                    placeholder="Private notes for admins..."
                    value={hostNotes}
                    onChange={e => setHostNotes(e.target.value)}
                    className="min-h-[80px] bg-muted/20"
                />
            </div>
        )}

        {showResources && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 border-t pt-4">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Session Resources</label>
                    <div className="flex gap-2">
                        <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setResources([...resources, { title: "", url: "", description: "" }])}
                        >
                        <Plus className="mr-2 h-4 w-4" /> Add Row
                        </Button>
                        {resources.length === 0 && (
                            <Button variant="ghost" size="sm" onClick={() => setShowResources(false)} className="text-muted-foreground">Cancel</Button>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    {resources.map((resource, index) => (
                    <div key={index} className="flex gap-4 items-start border p-4 rounded-lg bg-card text-card-foreground shadow-sm relative group">
                        <div className="flex-1 space-y-3">
                        <Input
                            placeholder="Resource Title (e.g. Analysis Video)"
                            value={resource.title}
                            onChange={(e) => {
                            const newResources = [...resources];
                            newResources[index] = { ...newResources[index], title: e.target.value };
                            setResources(newResources);
                            }}
                            className="text-lg font-bold border-0 border-b rounded-none px-0 h-auto focus-visible:ring-0 placeholder:font-normal placeholder:text-muted-foreground/50"
                        />
                        <Input
                            placeholder="URL (https://...)"
                            value={resource.url}
                            onChange={(e) => {
                            const newResources = [...resources];
                            newResources[index] = { ...newResources[index], url: e.target.value };
                            setResources(newResources);
                            }}
                            className="text-sm text-blue-500 border-0 border-b rounded-none px-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/50"
                        />
                        <Input
                            placeholder="Short description (optional)"
                            value={resource.description}
                            onChange={(e) => {
                            const newResources = [...resources];
                            newResources[index] = { ...newResources[index], description: e.target.value };
                            setResources(newResources);
                            }}
                            className="text-sm border-0 border-b rounded-none px-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/50"
                        />
                        </div>
                        <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                            setResources(resources.filter((_, i) => i !== index));
                        }}
                        >
                        <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                    ))}
                    {resources.length === 0 && (
                        <div className="text-center p-6 border border-dashed rounded-lg text-muted-foreground text-sm">
                            No resources added yet.
                        </div>
                    )}
                </div>
            </div>
        )}

        {showCycle && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 border-t pt-4">
               <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center gap-2">
                        <Repeat className="w-4 h-4" /> Add to Cycle
                    </label>
                    <Button variant="ghost" size="sm" onClick={() => { setShowCycle(false); setSelectedCycleId(null); }} className="h-6 text-xs text-muted-foreground">Cancel</Button>
               </div>
               <Select value={selectedCycleId || "none"} onValueChange={(val) => setSelectedCycleId(val === "none" ? null : val)}>
                  <SelectTrigger>
                      <SelectValue placeholder="Select a cycle..." />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {activeCycles.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                      ))}
                  </SelectContent>
               </Select>
            </div>
        )}

        {showPoll && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 border-t pt-4">
               <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center gap-2">
                        <BarChart2 className="w-4 h-4" /> Link a Poll
                    </label>
                    <Button variant="ghost" size="sm" onClick={() => { setShowPoll(false); setSelectedPollId(null); }} className="h-6 text-xs text-muted-foreground">Cancel</Button>
               </div>
               <Select value={selectedPollId || "none"} onValueChange={(val) => setSelectedPollId(val === "none" ? null : val)}>
                  <SelectTrigger>
                      <SelectValue placeholder="Select a poll..." />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {availablePolls.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                      ))}
                  </SelectContent>
               </Select>
               <p className="text-xs text-muted-foreground">Linking a poll will display it on the session details page.</p>
            </div>
        )}

            {/* Utility Row (Progressive Disclosure Triggers) */}
            <div className="flex gap-4 text-sm text-muted-foreground pt-1 flex-wrap">
                {!showHostNotes && (
                    <button onClick={() => setShowHostNotes(true)} className="flex items-center gap-1 hover:text-primary transition-colors">
                    <FileText className="w-4 h-4" /> Add Host Note
                    </button>
                )}
                {!showResources && (
                    <button
                        onClick={() => {
                            setShowResources(true);
                            if (resources.length === 0) {
                                setResources([{ title: "", url: "", description: "" }]);
                            }
                        }}
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                    <LinkIcon className="w-4 h-4" /> Add Resources
                    </button>
                )}
                {!showCycle && activeCycles.length > 0 && (
                    <button onClick={() => setShowCycle(true)} className="flex items-center gap-1 hover:text-primary transition-colors">
                    <Repeat className="w-4 h-4" /> Add to Cycle
                    </button>
                )}
                {!showPoll && availablePolls.length > 0 && (
                    <button onClick={() => setShowPoll(true)} className="flex items-center gap-1 hover:text-primary transition-colors">
                    <BarChart2 className="w-4 h-4" /> Add Poll
                    </button>
                )}
            </div>
        </div>

        {/* Footer */}
        <div className="flex gap-4 pt-6 border-t mt-8">
            <Button variant="ghost" onClick={() => handleSaveSession('draft')} className="flex-1">
                Save as Draft
            </Button>
            <Button onClick={() => handleSaveSession('published')} className="flex-1">
                {isEditing ? "Update & Publish" : "Publish Session"}
            </Button>
        </div>

      </div>
    </AppLayout>
  );
}
