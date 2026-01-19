import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { X, Star, Loader2, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { UserPicker } from "@/components/common/UserPicker";

type Visibility = "public" | "contacts" | "private";
type PostType = "review" | "watchlist";

export default function Post() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const movieId = searchParams.get("movieId");
  const paramTitle = searchParams.get("title") || "";
  const posterPath = searchParams.get("poster") || movieDetails?.poster_path || "";
  const mediaType = searchParams.get("mediaType") || "movie";
  const typeParam = searchParams.get("type");

  const [postType, setPostType] = useState<PostType>((typeParam === "watchlist" || typeParam === "review") ? typeParam : "review");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0); // Added for hover effect
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [movieDetails, setMovieDetails] = useState<any>(null);
  const [existingLogId, setExistingLogId] = useState<string | null>(null);

  // Tag states
  const [popularTags, setPopularTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [userPastTags, setUserPastTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  // Recommendation state
  const [recommendTo, setRecommendTo] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!movieId) {
      navigate("/search");
      return;
    }
    if (user) {
      checkExistingReview();
      fetchUserTags();
      fetchMovieDetails();
      fetchPopularTags();
    }
  }, [movieId, user, navigate]);

  const fetchMovieDetails = async () => {
    const { data } = await supabase.functions.invoke("tmdb-movie", {
      body: { movieId: parseInt(movieId!), type: mediaType },
    });
    if (data) setMovieDetails(data);
  };

  const checkExistingReview = async () => {
    if (!movieId || !user) return;
    setCheckingExisting(true);
    try {
      const { data: film } = await supabase
        .from("films")
        .select("id")
        .eq("tmdb_id", parseInt(movieId))
        .eq("media_type", mediaType)
        .maybeSingle();

      if (!film) {
        setCheckingExisting(false);
        return;
      }

      const { data: log } = await supabase
        .from("log")
        .select("*")
        .eq("film_id", film.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (log) {
        setExistingLogId(log.id);
        setPostType(log.status === "watchlist" ? "watchlist" : "review");
        if (log.rating) setRating(log.rating);
        if (log.content) setContent(log.content);
        if (log.tags) setSelectedTags(log.tags);
        if (log.visibility) setVisibility(log.visibility as Visibility);
      }
    } catch (error) {
      console.error("Error checking existing review:", error);
    } finally {
      setCheckingExisting(false);
    }
  };

  const fetchUserTags = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("log")
      .select("tags")
      .eq("user_id", user.id)
      .not("tags", "is", null);

    if (data) {
      const tags = new Set<string>();
      data.forEach((row) => row.tags?.forEach((tag) => tags.add(tag)));
      setUserPastTags(Array.from(tags).sort());
    }
  };

  const fetchPopularTags = async () => {
    if (!movieId) return;
    const { data: film } = await supabase
      .from("films")
      .select("id")
      .eq("tmdb_id", parseInt(movieId))
      .eq("media_type", mediaType)
      .maybeSingle();

    if (!film) return;

    const { data } = await supabase
      .from("log")
      .select("tags")
      .eq("film_id", film.id)
      .eq("status", "watched")
      .not("tags", "is", null);

    if (data) {
      const tagCounts = new Map<string, number>();
      data.forEach((review) => {
        (review.tags || []).forEach((tag: string) => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      });
      setPopularTags([...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag]) => tag));
    }
  };

  const ensureFilmExists = async (): Promise<{ success: boolean; error?: string; filmUuid?: string }> => {
    if (!movieId) return { success: false, error: "No movie ID provided" };
    const filmIdNum = parseInt(movieId);
    const { data: existingFilm } = await supabase.from("films").select("id").eq("tmdb_id", filmIdNum).eq("media_type", mediaType).maybeSingle();
    if (existingFilm) return { success: true, filmUuid: existingFilm.id };

    const { data: tmdbData, error: tmdbError } = await supabase.functions.invoke("tmdb-movie", { body: { movieId: filmIdNum, type: mediaType } });
    if (tmdbError || !tmdbData) return { success: false, error: "TMDB error" };

    // Extract trailer
    const trailer = tmdbData.videos?.results?.find(
      (v: any) => v.site === "YouTube" && v.type === "Trailer"
    );
    const trailerUrl = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;

    const { data: newFilm, error: insertError } = await supabase.from("films").upsert({
      tmdb_id: filmIdNum,
      media_type: mediaType,
      title: tmdbData.title || tmdbData.name,
      poster_path: tmdbData.poster_path,
      backdrop_path: tmdbData.backdrop_path,
      release_date: tmdbData.release_date || tmdbData.first_air_date || null,
      overview: tmdbData.overview,
      original_language: tmdbData.original_language,
      countries: tmdbData.production_countries,
      genre_ids: tmdbData.genres?.map((g: any) => g.id) || [],
      trailer: trailerUrl,
    } as any, { onConflict: "tmdb_id, media_type" }).select().single();

    return insertError ? { success: false, error: insertError.message } : { success: true, filmUuid: newFilm.id };
  };

  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !selectedTags.includes(trimmed)) setSelectedTags([...selectedTags, trimmed]);
    setTagInput("");
    setShowTagSuggestions(false);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await ensureFilmExists();
      if (!result.success) throw new Error(result.error);

      const baseData = { user_id: user!.id, film_id: result.filmUuid, visibility };
      const isReview = postType === "review";

      const { data: logData, error } = await supabase.from("log").upsert({
        ...baseData,
        status: isReview ? "watched" : "watchlist",
        rating: isReview ? rating : null,
        content: content.trim() || null,
        tags: selectedTags.length > 0 ? selectedTags : null,
        watched_at: isReview ? new Date().toISOString() : null,
      }, { onConflict: "user_id, film_id" } as any).select().single();

      if (error) throw error;

      // Handle Recommendations
      if (recommendTo.length > 0) {
        const recommendations = recommendTo.map(recipientId => ({
            recommender_id: user!.id,
            recipient_id: recipientId,
            film_id: result.filmUuid!,
            status: 'pending'
        }));

        const { data: insertedRecs, error: recError } = await supabase
            .from("recommendations")
            .insert(recommendations)
            .select();

        if (recError) {
            console.error("Error saving recommendations", recError);
        } else if (insertedRecs) {
            // Send Notifications
            const notifications = insertedRecs.map(rec => ({
                type: 'recommendation' as const,
                actor_id: user!.id,
                user_id: rec.recipient_id,
                recommendation_id: rec.id,
                resource_id: logData.id // Link to the review created
            }));
            await supabase.from("notifications").insert(notifications);
        }
      }

      toast({ title: isReview ? "Review posted!" : "Added to watchlist!" });
      navigate("/", { state: isReview ? { reviewPosted: true } : undefined });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingLogId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("log")
        .delete()
        .eq("id", existingLogId);

      if (error) throw error;

      toast({ title: "Removed from your list" });
      navigate("/");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      setLoading(false);
    }
  };

  // Determine Titles
  const tmdbTitle = movieDetails?.title || movieDetails?.name;
  const tmdbOriginalTitle = movieDetails?.original_title || movieDetails?.original_name;
  
  // If we have TMDB data, check for original title difference
  // Otherwise fall back to paramTitle
  const titleToDisplay = tmdbTitle || decodeURIComponent(paramTitle);
  const originalTitleToDisplay = tmdbOriginalTitle;
  
  const hasDifferentOriginalTitle = originalTitleToDisplay && originalTitleToDisplay !== titleToDisplay;
  
  const mainTitle = hasDifferentOriginalTitle ? originalTitleToDisplay : titleToDisplay;
  const subTitle = hasDifferentOriginalTitle ? titleToDisplay : null;


  const tagSuggestions = userPastTags.filter(t => t.toLowerCase().includes(tagInput.toLowerCase()) && !selectedTags.includes(t));
  const year = movieDetails?.release_date || movieDetails?.first_air_date ? new Date(movieDetails.release_date || movieDetails.first_air_date).getFullYear() : null;
  const director = movieDetails?.credits?.crew?.find((p: any) => p.job === "Director")?.name;
  const genres = movieDetails?.genres?.slice(0, 3).map((g: any) => g.name).join(", ");

  if (!movieId) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 glass safe-area-pt">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2"><X className="h-5 w-5" /></button>
          <span className="text-sm font-medium">{postType === "review" ? "Rate & Review" : "Add to Watchlist"}</span>
          {/* Save button moved to bottom */}
          <div className="w-5" /> 
        </div>
      </header>

      <main className="pt-14 pb-8 px-4 max-w-lg mx-auto">
        {checkingExisting ? <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : (
          <>
            <div className="flex gap-5 py-6 hairline">
              {posterPath ? (
                <img src={`https://image.tmdb.org/t/p/w342${posterPath}`} alt={titleToDisplay} className="w-32 h-auto aspect-[2/3] object-cover rounded-md shadow-md flex-shrink-0" />
              ) : (
                <div className="w-32 h-auto aspect-[2/3] bg-secondary rounded-md flex-shrink-0" />
              )}
              <div className="flex flex-col justify-center">
                <h2 className="text-xl font-bold leading-tight">{mainTitle}</h2>
                {subTitle && <p className="text-sm text-muted-foreground mt-0.5">{subTitle}</p>}
                
                <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                  <p>{year} {mediaType === "tv" ? "• TV Series" : director ? `• Directed by ${director}` : ""}</p>
                  {genres && <p className="italic text-xs">{genres}</p>}
                </div>
              </div>
            </div>

            <div className="flex gap-2 py-4">
              {(["review", "watchlist"] as PostType[]).map((type) => (
                <button key={type} onClick={() => setPostType(type)} className={cn("flex-1 py-2 rounded-md text-sm font-medium capitalize", postType === type ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
                  {type}
                </button>
              ))}
            </div>

            {postType === "review" && (
              <div className="py-4 hairline">
                <p className="text-sm text-muted-foreground mb-3">Your Rating</p>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-0.5 md:gap-1" onMouseLeave={() => setHoverRating(0)}>
                    {Array.from({ length: 10 }).map((_, i) => {
                      const starValue = i + 1;
                      // Highlight stars if they are <= the selected rating OR <= the current hover index
                      const isHighlighted = starValue <= (hoverRating || rating);
                      
                      return (
                        <button 
                          key={i} 
                          onClick={() => setRating(starValue)}
                          onMouseEnter={() => setHoverRating(starValue)}
                          className="p-0.5"
                        >
                          <Star className={cn(
                            "h-6 w-6 md:h-7 md:w-7 transition-colors",
                            isHighlighted 
                              ? "fill-yellow-500 text-yellow-500" // Active: Plain yellow (border & fill)
                              : "fill-transparent text-muted-foreground/30" // Inactive: Transparent fill, lighter outline
                          )} />
                        </button>
                      );
                    })}
                  </div>
                  {(hoverRating > 0 || rating > 0) && (
                    <span className="text-4xl font-bold text-white ml-2">
                      {hoverRating || rating}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="py-4 hairline">
              <Textarea
                placeholder={postType === "review" ? "Write your thoughts..." : "Why do you want to watch this?"}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[120px] bg-secondary/20 border border-input rounded-md p-3 resize-none focus-visible:ring-1 focus-visible:ring-primary text-base"
              />
            </div>

            <div className="py-4 hairline space-y-3">
              <p className="text-sm text-muted-foreground">Tags</p>
              <div className="flex flex-wrap gap-2">{selectedTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="px-3 py-1 gap-1">{tag}<X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))} /></Badge>
              ))}</div>
              <div className="relative">
                <Input placeholder="Add a tag..." value={tagInput} onChange={(e) => { setTagInput(e.target.value); setShowTagSuggestions(true); }} onFocus={() => setShowTagSuggestions(true)} onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)} onKeyDown={(e) => e.key === "Enter" && handleAddTag(tagInput)} className="bg-secondary/50 border-none" />
                {showTagSuggestions && tagInput && tagSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-10">
                    {tagSuggestions.map((tag) => <button key={tag} className="w-full text-left px-3 py-2 text-sm hover:bg-secondary" onClick={() => handleAddTag(tag)}>{tag}</button>)}
                  </div>
                )}
              </div>
            </div>

            <div className="py-4 hairline space-y-3">
              <p className="text-sm text-muted-foreground">
                {postType === "review"
                  ? "Anyone in particular that shouldn't miss this?"
                  : "I'd like to watch this with... (optional)"}
              </p>
              <UserPicker
                selectedIds={recommendTo}
                onSelect={(id) => setRecommendTo([...recommendTo, id])}
                onRemove={(id) => setRecommendTo(recommendTo.filter(uid => uid !== id))}
              />
            </div>

            <div className="py-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Visibility: <span className="text-foreground font-medium capitalize">{visibility}</span></span>
                <button onClick={() => setShowVisibilityMenu(!showVisibilityMenu)} className="p-1 hover:bg-secondary rounded-full transition-colors">
                  <Pencil className="h-3 w-3 text-muted-foreground/50" />
                </button>
              </div>

              {showVisibilityMenu && (
                <div className="absolute bottom-16 left-4 right-4 bg-popover border rounded-md shadow-xl z-50 overflow-hidden">
                  {(["public", "contacts", "private"] as Visibility[]).map((v) => (
                    <button key={v} onClick={() => { setVisibility(v); setShowVisibilityMenu(false); }} className={cn("w-full px-4 py-3 text-left text-sm hover:bg-secondary", visibility === v ? "text-primary font-bold" : "")}>
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Save Button moved to bottom */}
            <div className="pt-4 pb-8 flex flex-col items-center gap-4">
              <Button 
                size="lg" 
                className="w-full" 
                onClick={handleSubmit} 
                disabled={loading || checkingExisting || (postType === "review" && rating === 0)}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>

              {existingLogId ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="text-sm text-red-500 hover:text-red-600 hover:underline">
                      Delete
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete this entry from your history.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <button
                  onClick={() => navigate(-1)}
                  className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                >
                  Cancel
                </button>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
