import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  Loader2, Plus, Check, Star, Clock,
  Edit2, Trash2, Globe, Languages, Users, X, Tag, ExternalLink, Send, ChevronDown, ChevronUp, Play
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { RecommendDialog } from "@/components/common/RecommendDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useFilmAvailability } from "@/hooks/useFilmAvailability";
import { FilmAvailability } from "@/components/film/FilmAvailability";
import { SocialContextHeader } from "@/components/film/SocialContextHeader";
import { RatingSpectrum } from "@/components/RatingSpectrum";
import { MetaHead } from "@/components/common/MetaHead";
import { useUserProfile } from "@/hooks/useUserProfile";
import { COUNTRIES, normalizeCountries } from "@/lib/countries";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { slugify } from "@/lib/utils";
import { GENRE_MAP } from "@/lib/constants";
import { FeedReview } from "@/types/feed";
import { compareBySocialConnection, compareByTags } from "@/lib/feed-sorting";
import { useUserAliases } from "@/context/AliasContext";

// --- Types ---

interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
}

interface MovieDetails {
  id: number;
  trailer?: string | null;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  imdb_id?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  runtime?: number;
  episode_run_time?: number[];
  genres?: { id: number; name: string }[];
  production_countries?: { iso_3166_1: string; name: string }[];
  spoken_languages?: { english_name: string; iso_639_1: string }[];
  credits?: {
    crew: { job: string; name: string; id: number }[];
    cast?: { name: string; character: string; profile_path: string | null; id: number }[];
  };
  "watch/providers"?: {
    results?: {
      [key: string]: {
        link: string;
        flatrate?: WatchProvider[];
        buy?: WatchProvider[];
        rent?: WatchProvider[];
      };
    };
  };
}

// --- Main Component ---

export default function FilmDetails({ mediaType: propMediaType }: { mediaType?: "movie" | "tv" }) {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { getDisplayName } = useUserAliases();
   
  // -- State --
  const [movie, setMovie] = useState<MovieDetails | null>(null);
  const [dbFilmId, setDbFilmId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Reviews & Social
  const [reviews, setReviews] = useState<FeedReview[]>([]);
  const [myReview, setMyReview] = useState<FeedReview | null>(null);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
   
  // User Data
  const [userCountry, setUserCountry] = useState<string>("US");
  const { profile: fullUserProfile } = useUserProfile();
  const [userProfile, setUserProfile] = useState<{ username: string | null, avatar_url: string | null } | null>(null);
  const [userStatus, setUserStatus] = useState<'watched' | 'watchlist' | null>(null);
  const [myRating, setMyRating] = useState<number>(0);
  const [myTags, setMyTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [watchWithInvitations, setWatchWithInvitations] = useState<{ id: string, avatar_url: string | null, username: string | null }[]>([]);

  // UI State
  const [showRecommendDialog, setShowRecommendDialog] = useState(false);
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);
  const [showTrailerDialog, setShowTrailerDialog] = useState(false);
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);

  // --- Helpers ---
  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    if (url.includes("embed/")) return url;
    const v = url.split("v=")[1];
    if (v) {
        const ampersandPosition = v.indexOf('&');
        return `https://www.youtube.com/embed/${ampersandPosition !== -1 ? v.substring(0, ampersandPosition) : v}?autoplay=1`;
    }
    return url;
  };

  const handleWatchTrailer = async () => {
    // 1. If we already have a loaded URL state, just show dialog
    if (trailerUrl) {
      setShowTrailerDialog(true);
      return;
    }

    // 2. If the movie object already has a trailer link
    if (movie?.trailer) {
      setTrailerUrl(getEmbedUrl(movie.trailer));
      setShowTrailerDialog(true);
      return;
    }

    // 3. Otherwise, fetch from Edge Function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tmdbId = (movie as any).tmdb_id || movie?.id;
    const mediaType = (propMediaType || type) === "tv" ? "tv" : "movie";

    try {
        const { data, error } = await supabase.functions.invoke("tmdb-trailers", {
            body: { movieId: tmdbId, mediaType }
        });

        if (error) throw error;

        if (data.trailerUrl) {
            setTrailerUrl(getEmbedUrl(data.trailerUrl));
            setShowTrailerDialog(true);
        } else {
            toast({ title: "No trailer available", description: "We couldn't find a trailer for this title." });
        }
    } catch (error) {
        console.error("Error fetching trailer:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to load trailer." });
    }
  };

  // --- Data Fetching ---
  useEffect(() => {
    if (user) {
      const fetchTags = async () => {
        try {
          const { data, error } = await supabase.rpc('get_user_tags', { p_user_id: user.id });
          if (!error && data) {
             setAllTags(data.map((d: { tag: string }) => d.tag));
          } else {
             const { data: logs } = await supabase.from('log').select('tags').eq('user_id', user.id).not('tags', 'is', null);
             if (logs) {
               const tags = new Set<string>();
               logs.forEach((log: { tags: string[] }) => log.tags.forEach((t: string) => tags.add(t)));
               setAllTags(Array.from(tags));
             }
          }
        } catch (e) { console.error("Error fetching tags", e); }
      };
      fetchTags();
    }
  }, [user]);

  useEffect(() => {
    const activeType = propMediaType || type;
    if (activeType && id) {
      fetchData();
    }
  }, [type, id, user, propMediaType]);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const mediaType = (propMediaType || type) === "tv" ? "tv" : "movie";
      let tmdbId = parseInt(id!);
      let currentMovieData: MovieDetails | null = null;
      let filmUuid: string | null = null;

      // Store friends data locally to avoid stale closure issues with `followingIds` state
      const myFriendsMap = new Map<string, { username: string, avatar_url: string | null }>(); // id -> { username, avatar }
      const myFriendIds: string[] = [];

      if (user) {
        const { data: profile } = await supabase.from("profiles").select("country, username, avatar_url").eq("id", user.id).single();
        if (profile) {
            setUserProfile({ username: profile.username, avatar_url: profile.avatar_url });
            if (profile.country && profile.country.length === 2) setUserCountry(profile.country.toUpperCase());
        }
        const { data: follows } = await supabase.from("follows").select("following_id, following:profiles!following_id(username, avatar_url)").eq("follower_id", user.id);

        if (follows) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            follows.forEach((f: any) => {
                if (f.following) {
                    myFriendsMap.set(f.following_id, {
                        username: f.following.username || "",
                        avatar_url: f.following.avatar_url
                    });
                }
                myFriendIds.push(f.following_id);
            });
            setFollowingIds(myFriendIds);
        }
      }

      // 1. Resolve Film (Handle UUID vs TMDB ID)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let existingFilm: any = null;

      // Robustly check for UUID format to avoid false positives with parseInt
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id!);

      if (isUuid) {
          // If ID is a UUID, try to fetch from DB
          const { data } = await supabase.from("films").select("*").eq("id", id).maybeSingle();
          if (data) {
              existingFilm = data;
              tmdbId = data.tmdb_id; // Set tmdbId for subsequent logic
              filmUuid = data.id;
          } else {
              // Invalid UUID or not found
              throw new Error("Film not found");
          }
      } else {
          // Standard Flow: Fetch by TMDB ID
          const { data } = await supabase.from("films").select("*").eq("tmdb_id", tmdbId).eq("media_type", mediaType).maybeSingle();
          existingFilm = data;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hasExtendedDetails = existingFilm?.credits && Object.keys(existingFilm.credits as any).length > 0 && existingFilm?.countries && (existingFilm as any)?.spoken_languages;

      if (existingFilm && hasExtendedDetails) {
        currentMovieData = {
            ...existingFilm,
            credits: existingFilm.credits as unknown as MovieDetails['credits'],
            "watch/providers": existingFilm.watch_providers as unknown as MovieDetails['watch/providers'],
            production_countries: normalizeCountries(existingFilm.countries),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            spoken_languages: (existingFilm as any).spoken_languages as unknown as MovieDetails['spoken_languages'],
        } as unknown as MovieDetails;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((existingFilm as any).genres) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          currentMovieData.genres = (existingFilm as any).genres;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } else if ((existingFilm as any).genre_ids && Array.isArray((existingFilm as any).genre_ids)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          currentMovieData.genres = (existingFilm as any).genre_ids.map((id: number) => ({
            id,
            name: GENRE_MAP[id] || "Unknown"
          }));
        }
        filmUuid = existingFilm.id;
        setMovie(currentMovieData);
      } else {
        const { data: tmdbData, error: tmdbError } = await supabase.functions.invoke("tmdb-movie", { body: { movieId: tmdbId, type: mediaType } });
        if (tmdbError) throw tmdbError;
        currentMovieData = tmdbData;
        setMovie(tmdbData);

        const filmToUpsert = {
            tmdb_id: tmdbId,
            media_type: mediaType,
            title: tmdbData.title || tmdbData.name || "Unknown Title", 
            original_title: tmdbData.original_title || tmdbData.original_name,
            overview: tmdbData.overview || "",
            poster_path: tmdbData.poster_path,
            backdrop_path: tmdbData.backdrop_path,
            release_date: tmdbData.release_date || tmdbData.first_air_date,
            imdb_id: tmdbData.imdb_id || tmdbData.external_ids?.imdb_id || null,
            credits: tmdbData.credits, 
            runtime: tmdbData.runtime || (tmdbData.episode_run_time?.[0] || null),
            genre_ids: tmdbData.genres?.map((g: { id: number }) => g.id) || [],
            watch_providers: tmdbData["watch/providers"],
            countries: tmdbData.production_countries?.map((c: { iso_3166_1: string }) => c.iso_3166_1) || [],
            original_language: tmdbData.original_language,
            spoken_languages: tmdbData.spoken_languages,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: upserted, error: upsertError } = await supabase.from("films").upsert(existingFilm ? { ...filmToUpsert, id: existingFilm.id } : (filmToUpsert as any)).select().single();
        if (!upsertError && upserted) filmUuid = upserted.id;
      }
       
      setDbFilmId(filmUuid);

      if (filmUuid && user) {
        const { data: logData } = await supabase.from("log").select("*").eq("user_id", user.id).eq("film_id", filmUuid).maybeSingle();
        if (logData) {
            if (logData.status === 'watched' || logData.status === 'watchlist') setUserStatus(logData.status);
            if (logData.rating) setMyRating(logData.rating);
            if (logData.tags) setMyTags(logData.tags);
        }

        const { data: reviewData } = await supabase.from("log")
          .select(`id, content, rating, status, tags, created_at, edited_at, user_id, user:profiles(username, avatar_url)`)
          .eq("film_id", filmUuid)
          .order("edited_at", { ascending: false });

        if (reviewData) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let formattedReviews: FeedReview[] = reviewData.map((r: any) => ({
                ...r,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                film: { title: currentMovieData?.title || "", poster_path: currentMovieData?.poster_path || "", tmdb_id: (currentMovieData as any)?.tmdb_id || currentMovieData?.id, media_type: mediaType },
                likes_count: 0, comments_count: 0, is_liked: false
            }));

            // --- 2nd Degree Connection Logic (Friends of Friends) ---
            if (user && myFriendIds.length > 0) {
                 const strangerIds = formattedReviews
                    .map(r => r.user_id)
                    .filter(uid => uid && uid !== user.id && !myFriendIds.includes(uid));

                 const uniqueStrangerIds = [...new Set(strangerIds)];
                 const secondDegreeMap = new Map<string, { id: string, username: string, avatar_url: string | null }[]>(); // reviewerId -> connectors[]

                 if (uniqueStrangerIds.length > 0) {
                     const { data: connections } = await supabase
                        .from("follows")
                        .select("follower_id, following_id")
                        .in("follower_id", myFriendIds)
                        .in("following_id", uniqueStrangerIds);

                     if (connections) {
                         // eslint-disable-next-line @typescript-eslint/no-explicit-any
                         connections.forEach((c: any) => {
                             const connector = myFriendsMap.get(c.follower_id);
                             if (connector) {
                                 if (!secondDegreeMap.has(c.following_id)) {
                                     secondDegreeMap.set(c.following_id, []);
                                 }
                                 const list = secondDegreeMap.get(c.following_id)!;
                                 if (!list.some(x => x.id === c.follower_id)) {
                                    list.push({
                                        id: c.follower_id,
                                        username: connector.username,
                                        avatar_url: connector.avatar_url
                                    });
                                 }
                             }
                         });
                     }
                 }

                 formattedReviews = formattedReviews.map(r => ({
                     ...r,
                     socialContext: (r.user_id && secondDegreeMap.has(r.user_id))
                        ? secondDegreeMap.get(r.user_id)!
                        : null
                 }));
            }

            setReviews(formattedReviews);
            const mine = formattedReviews.find(r => r.user_id === user.id);
            if (mine) setMyReview(mine);
        }

        // Fetch watch_with invitations
        const { data: recommendations } = await supabase
            .from("recommendations")
            .select(`
                id,
                recommender_id,
                recipient_id,
                status,
                sender:profiles!recommender_id(id, username, avatar_url),
                receiver:profiles!recipient_id(id, username, avatar_url)
            `)
            .eq("film_id", filmUuid)
            .eq("status", "watch_with")
            .or(`recommender_id.eq.${user.id},recipient_id.eq.${user.id}`);

        if (recommendations) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const others = recommendations.map((r: any) => {
                const isSender = r.recommender_id === user.id;
                return isSender ? r.receiver : r.sender;
            }).filter(Boolean);
            // Deduplicate
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const uniqueOthers = Array.from(new Map(others.map((p: any) => [p.id, p])).values());
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setWatchWithInvitations(uniqueOthers as any);
        }
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error:", error);
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers ---
  const handleStatus = async (targetStatus: 'watched' | 'watchlist') => {
    if (!user) { navigate("/auth"); return; }
    if (!dbFilmId) return;
    if (userStatus === 'watched' && targetStatus === 'watchlist') {
        toast({ variant: "destructive", title: "Action not allowed", description: "Delete your rating to add to watchlist." });
        return;
    }
    try {
      let newStatus: 'watched' | 'watchlist' | null = targetStatus;
      if (userStatus === targetStatus) newStatus = null;
      setUserStatus(newStatus);
      const { error } = await supabase.from("log").upsert({
         user_id: user.id, film_id: dbFilmId, status: newStatus || 'dropped',
         watched_at: newStatus === 'watched' ? new Date().toISOString() : null
      }, { onConflict: 'user_id, film_id' }); 
      if (error) throw error;
      toast({ title: newStatus ? `Added to ${newStatus}` : "Removed from list" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) { setUserStatus(userStatus); toast({ variant: "destructive", title: "Error", description: e.message }); }
  };

  const handleSaveReview = async (status: 'watched' | 'watchlist', rating: number | null, content: string | null, tags: string[]) => {
      if (!user) { navigate("/auth"); return; }
      if (!dbFilmId) return;

      const previousRating = myRating;
      const previousStatus = userStatus;

      setMyRating(rating || 0);
      setUserStatus(status);
      setMyTags(tags);
      setMyReview(prev => prev ? { ...prev, content: content || null, rating, tags, status } : null);

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payload: any = {
            user_id: user.id,
            film_id: dbFilmId,
            status: status,
            content: content && content.trim().length > 0 ? content.trim() : null,
            tags: tags.length > 0 ? tags : null,
        };

        if (status === 'watched') {
             payload.rating = rating;
             payload.watched_at = new Date().toISOString();
        } else {
             payload.rating = null;
        }

        const { error } = await supabase.from("log").upsert(payload, { onConflict: 'user_id, film_id' });

        if (error) throw error;
        toast({ title: status === 'watched' ? "Review saved!" : "Added to watchlist" });
        // Refresh reviews to show the new one
        fetchData(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
          setMyRating(previousRating);
          setUserStatus(previousStatus);
          toast({ variant: "destructive", title: "Error", description: e.message });
      }
  };

  const handleRateNav = () => {
    const mediaType = (propMediaType || type) === "tv" ? "tv" : "movie";
    navigate(`/post?movieId=${id}&mediaType=${mediaType}&title=${encodeURIComponent(movie?.title || movie?.name || "")}&poster=${movie?.poster_path || ""}`);
  };

  const handleDeleteRating = async () => {
      if (!user || !dbFilmId) return;
      try {
          const { error } = await supabase.from("log").delete().eq("user_id", user.id).eq("film_id", dbFilmId);
          if (error) throw error;
          setMyRating(0); setUserStatus(null); setMyReview(null); setMyTags([]);
          toast({ title: "Log entry removed" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) { toast({ variant: "destructive", title: "Error", description: e.message }); }
  }

  // --- Derived Data for Render ---
  const availabilityFromMovie = useMemo(() => {
      if (!movie || !movie["watch/providers"]?.results || !userCountry) return undefined;
      const results = movie["watch/providers"].results[userCountry];
      if (!results) return undefined;
      return { stream: results.flatrate || [], rent: results.rent || [], buy: results.buy || [] };
  }, [movie, userCountry]);

  const { availability, loading: availabilityLoading } = useFilmAvailability(dbFilmId, id ? parseInt(id) : null, (propMediaType || type), userCountry, availabilityFromMovie);

  // Sorting Logic for Social Section
  const { friendsText, friendsStars, secondDegreeText, secondDegreeStars, communityText, communityStars, friendsWantToWatch } = useMemo(() => {
      const ft: FeedReview[] = []; // Friends Text
      const fs: FeedReview[] = []; // Friends Stars
      const sdt: FeedReview[] = []; // Second Degree Text
      const sds: FeedReview[] = []; // Second Degree Stars
      const ct: FeedReview[] = []; // Community Text
      const cs: FeedReview[] = []; // Community Stars
      const fwtw: FeedReview[] = [];

      reviews.forEach(r => {
          const isFriend = followingIds.includes(r.user_id || "");
          const isMe = r.user_id === user?.id;

          if (r.status === 'watchlist') {
              if (isFriend && !isMe) fwtw.push(r);
              return;
          }

          if (isMe) return; // Don't show myself in feed

          if (isFriend) {
              if (r.content) ft.push(r);
              else fs.push(r);
          } else if (r.socialContext) {
              // Tier 2: Friends of Friends
              if (r.content) sdt.push(r);
              else sds.push(r);
          } else {
              // Tier 3: Community
              if (r.content) ct.push(r);
              else cs.push(r);
          }
      });

      // Sort friends and community ratings by tags (prioritize content)
      fs.sort(compareByTags);
      cs.sort(compareByTags);

      // Sort 2nd Degree (Friends of Friends) by social connection strength
      sdt.sort(compareBySocialConnection);
      sds.sort(compareBySocialConnection);

      return { friendsText: ft, friendsStars: fs, secondDegreeText: sdt, secondDegreeStars: sds, communityText: ct, communityStars: cs, friendsWantToWatch: fwtw };
  }, [reviews, followingIds, user]);

  const hasFriendRatings = friendsText.length > 0 || friendsStars.length > 0;

  const spectrumLogs = useMemo(() => {
    // Only friends + me
    const friendsLogs = reviews.filter(r => followingIds.includes(r.user_id || "") && r.status !== 'watchlist' && r.rating);
    const logs = friendsLogs.map(r => ({ rating: r.rating!, user: { id: r.user_id!, username: r.user.username, avatar_url: r.user.avatar_url } }));

    if (user && userProfile && myRating > 0) {
      if (!logs.some(l => l.user.id === user.id)) {
        logs.push({ rating: myRating, user: { id: user.id, username: userProfile.username, avatar_url: userProfile.avatar_url } });
      }
    }
    return logs;
  }, [reviews, followingIds, user, userProfile, myRating]);

  const handleAvatarClick = (clickedUser: { id: string, username: string | null }) => {
    if (!movie || !clickedUser.username) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tmdbId = (movie as any).tmdb_id || movie.id;
    navigate(`/${activeMediaType}/${slug}/${tmdbId}/${encodeURIComponent(clickedUser.username)}`);
  };

  // Title Logic
  const originalTitle = movie?.original_title || movie?.original_name;
  const localizedTitle = movie?.title || movie?.name;
  const showSecondary = localizedTitle && originalTitle && localizedTitle !== originalTitle;
  const mainTitle = originalTitle || localizedTitle; // Prioritize original title
  const secondaryTitle = showSecondary ? localizedTitle : null;

  if (loading || !movie) return <AppLayout title="Details" showBack>
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    </AppLayout>;

  // SEO & Structured Data Logic
  const activeMediaType = (propMediaType || type) === "tv" ? "tv" : "movie";
  // Generate slug from movie.title (localized) as requested, fallback to mainTitle
  const slug = slugify(movie?.title || mainTitle || "title");
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://cineforum.eu';
  // Use dbFilmId (UUID) for canonical URL if available, to ensure permanent link
  const canonicalId = dbFilmId || id;
  const canonicalUrl = `${origin}/${activeMediaType}/${slug}/${canonicalId}`;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Movie",
    "name": mainTitle,
    "image": movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : undefined,
    "datePublished": movie.release_date || movie.first_air_date,
    "description": movie.overview,
    ...(movie.vote_average ? {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": movie.vote_average,
        "bestRating": 10,
        "ratingCount": movie.vote_count || 1
      }
    } : {})
  };

  return (
    <AppLayout title="Details" showBack>
       <MetaHead
        title={mainTitle || "Film Details"}
        description={movie.overview ? movie.overview.slice(0, 160) : "View film details on Cineforum"}
        image={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : undefined}
        canonicalUrl={canonicalUrl}
        structuredData={structuredData}
      />

      <div className="w-full min-h-screen bg-background pb-20">
        
        {/* --- DESKTOP GRID LAYOUT (Asymmetric 35/65) --- */}
        <div className="lg:grid lg:grid-cols-[35%_65%] lg:gap-12 lg:max-w-7xl lg:mx-auto lg:px-8 lg:py-12">

            {/* === LEFT COLUMN: Reference & Identity === */}
            <div className="hidden lg:block space-y-6 h-fit">

                {/* Poster */}
                <div className="rounded-xl overflow-hidden shadow-2xl aspect-[2/3] border border-white/5 relative group bg-muted">
                    {movie.poster_path ? (
                        <img src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">No Poster</div>
                    )}
                </div>

                {/* Deep Data (Full Text, Vertical Cast) */}
                <DeepDataSection
                    movie={movie}
                    layout="vertical"
                />
            </div>

            {/* === RIGHT COLUMN: Social Feed & Action === */}
            <div className="px-0 sm:px-0 space-y-10 mt-0">

                {/* Mobile Hero (Hidden on Desktop) */}
                <div className="lg:hidden">
                    <HeroSection
                        movie={movie}
                        availability={availability}
                        availabilityLoading={availabilityLoading}
                        onOpenAvailability={() => setShowAvailabilityDialog(true)}
                        onWatchTrailer={handleWatchTrailer}
                        countryCode={userCountry}
                        subscribedPlatforms={fullUserProfile?.subscribed_platforms}
                    />
                </div>

                {/* Desktop Title Header */}
                <div className="hidden lg:block space-y-2">
                      <h1 className="text-5xl font-extrabold tracking-tight leading-tight">{mainTitle}</h1>
                      {secondaryTitle && (
                        <h2 className="text-2xl text-muted-foreground font-medium">{secondaryTitle}</h2>
                      )}
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-muted-foreground text-lg">
                          <div className="flex items-center gap-4">
                              {(() => {
                                const d = movie.release_date || movie.first_air_date;
                                return d ? <span>{new Date(d).getFullYear()}</span> : null;
                              })()}
                              {movie.runtime > 0 && (
                                <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                                    <span>{Math.floor(movie.runtime/60)}h {movie.runtime%60}m</span>
                                </>
                              )}
                              {movie.genres && (
                                  <>
                                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                                      <span>{movie.genres.slice(0, 3).map(g => g.name).join(", ")}</span>
                                   </>
                              )}
                          </div>
                          <div className="flex items-center gap-3">
                             <FilmAvailability
                                availability={availability}
                                loading={availabilityLoading}
                                countryCode={userCountry}
                                subscribedPlatforms={fullUserProfile?.subscribed_platforms}
                                mode="summary"
                                onExpand={() => setShowAvailabilityDialog(true)}
                             />
                             <Button
                                variant="secondary"
                                size="sm"
                                className="gap-2 rounded-full px-4 h-8"
                                onClick={handleWatchTrailer}
                             >
                                <Play className="w-3.5 h-3.5 fill-current" /> Trailer
                             </Button>
                          </div>
                      </div>
                </div>

                {/* User Action Bar */}
                <div className="px-4 sm:px-6 lg:px-0">
                    <ActionSection
                        userStatus={userStatus}
                        myRating={myRating}
                        myReview={myReview}
                        myTags={myTags}
                        allTags={allTags}
                        handleStatus={handleStatus}
                        onSaveReview={handleSaveReview}
                        handleRateNav={handleRateNav}
                        handleDeleteRating={handleDeleteRating}
                        showRecommend={() => setShowRecommendDialog(true)}
                        watchWithInvitations={watchWithInvitations}
                        hasFriendRatings={hasFriendRatings}
                    />
                </div>

                {/* SOCIAL CORE */}
                <div className="space-y-10 px-4 sm:px-6 lg:px-0">
                    
                    {/* Friend Distribution Chart */}
                    {spectrumLogs.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <Users className="w-4 h-4" /> Friend Ratings
                                </h3>
                                {/* Avg Rating */}
                                <div className="flex items-center gap-1 text-sm">
                                    <span className="text-muted-foreground">Avg:</span>
                                    <Star className="inline w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                                    <span className="font-bold">{(spectrumLogs.reduce((acc, log) => acc + log.rating, 0) / spectrumLogs.length).toFixed(1)}</span>
                                </div>
                            </div>
                            <div className="p-5 bg-card/80 shadow-sm transition-colors">
                                <RatingSpectrum logs={spectrumLogs} onAvatarClick={handleAvatarClick} />
                            </div>
                        </div>
                    )}

                    {/* Review Feed */}
                    <div className="space-y-6">
                         {/* Friends Want to Watch - Facepile */}
                         {friendsWantToWatch.length > 0 && (
                            <div className="flex items-center gap-4 bg-muted/20 p-4">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-blue-500" />
                                    <span className="text-sm font-semibold text-muted-foreground">Want to watch</span>
                                </div>
                                <div className="flex -space-x-3">
                                    {friendsWantToWatch.map(r => (
                                        <TooltipProvider key={r.id}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Link to={`/profile/${r.user.username}`}>
                                                        <Avatar className="w-8 h-8 border-2 border-background ring-2 ring-background/50 hover:z-10 transition-all hover:scale-110">
                                                            <AvatarImage src={r.user.avatar_url || undefined} />
                                                            <AvatarFallback className="text-[10px] bg-secondary text-foreground font-bold">
                                                                {r.user.username?.[0]}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    </Link>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{getDisplayName(r.user_id, r.user.username) || r.user.username}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    ))}
                                </div>
                            </div>
                         )}

                         {/* Friends Text */}
                         {friendsText.map(r => <ReviewCard key={r.id} review={r} />)}

                         {/* Friends Stars */}
                         {friendsStars.length > 0 && (
                             <div className="space-y-2">
                                 {friendsStars.map(r => <CompactRatingRow key={r.id} review={r} />)}
                             </div>
                         )}

                         {/* 2ND DEGREE (Friends of Friends) */}
                         {(secondDegreeText.length > 0 || secondDegreeStars.length > 0) && (
                             <div className="relative py-4">
                                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-dashed border-primary/20" /></div>
                                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Friends of Friends</span></div>
                             </div>
                         )}

                         {secondDegreeText.map(r => <ReviewCard key={r.id} review={r} />)}
                         {secondDegreeStars.length > 0 && (
                            <div className="space-y-2">
                                {secondDegreeStars.map(r => <CompactRatingRow key={r.id} review={r} />)}
                            </div>
                         )}

                         {/* Separator if Community content exists */}
                         {(communityText.length > 0 || communityStars.length > 0) && (
                             <div className="relative py-4">
                                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-dashed" /></div>
                                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Community</span></div>
                             </div>
                         )}

                         {/* Community Text */}
                         {communityText.map(r => <ReviewCard key={r.id} review={r} community />)}

                         {/* Community Stars */}
                         {communityStars.length > 0 && (
                             <div className="space-y-2">
                                 {communityStars.map(r => <CompactRatingRow key={r.id} review={r} community />)}
                             </div>
                         )}

                         {reviews.length === 0 && (
                             <div className="text-center py-12 text-muted-foreground bg-muted/10">
                                 <p>No activity yet. Be the first to review!</p>
                             </div>
                         )}
                    </div>
                </div>

                {/* MOBILE ONLY: Deep Data at bottom */}
                <div className="lg:hidden mt-12 space-y-8 px-4 sm:px-6">
                      <DeepDataSection movie={movie} />
                </div>

            </div>
        </div>

      </div>

      {/* DIALOGS */}
      {dbFilmId && (
        <RecommendDialog
            open={showRecommendDialog}
            onOpenChange={setShowRecommendDialog}
            film={{ id: dbFilmId, title: mainTitle || "" }}
            mode={userStatus === 'watchlist' ? 'watch_with' : 'recommend'}
        />
      )}

      <Dialog open={showAvailabilityDialog} onOpenChange={setShowAvailabilityDialog}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle tabIndex={0} className="focus:outline-none">Where to Watch</DialogTitle>
              </DialogHeader>
              <FilmAvailability
                 availability={availability}
                 loading={availabilityLoading}
                 countryCode={userCountry}
                 subscribedPlatforms={fullUserProfile?.subscribed_platforms}
                 mode="full"
              />
          </DialogContent>
      </Dialog>

      <Dialog open={showTrailerDialog} onOpenChange={setShowTrailerDialog}>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-black border-border/50">
            <div className="relative w-full aspect-video">
                {trailerUrl ? (
                    <iframe
                        src={trailerUrl}
                        className="absolute inset-0 w-full h-full"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        title="Trailer"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                )}
            </div>
        </DialogContent>
      </Dialog>

    </AppLayout>
  );
}

// --- SUB-COMPONENTS ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HeroSection({ movie, availability, availabilityLoading, onOpenAvailability, onWatchTrailer, countryCode, subscribedPlatforms }: any) {
    const originalTitle = movie.original_title || movie.original_name;
    const localizedTitle = movie.title || movie.name;

    // Check if we should show the localized title as secondary
    const showSecondary = localizedTitle && originalTitle && localizedTitle !== originalTitle;

    // Main title is original title (or localized if no original, but API usually gives both)
    const mainTitle = originalTitle || localizedTitle;
    const secondaryTitle = showSecondary ? localizedTitle : null;

    const year = new Date(movie.release_date || movie.first_air_date || "").getFullYear();
    const runtime = movie.runtime;
    const genres = movie.genres?.slice(0, 3); // Limit genres

    return (
        <div className="relative w-full overflow-hidden lg:rounded-2xl bg-black/40 lg:bg-transparent">
             {/* Mobile: Blend Backdrop */}
             <div className="lg:hidden absolute inset-0 z-0">
                 {movie.backdrop_path && (
                    <>
                        <img src={`https://image.tmdb.org/t/p/w780${movie.backdrop_path}`} className="w-full h-full object-cover opacity-30" />
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
                    </>
                 )}
             </div>

             <div className="relative z-10 p-4 pt-20 sm:pt-32 lg:p-0 flex flex-col items-center lg:items-start text-center lg:text-left">
                  {/* Poster (Mobile: Small shadow, Desktop: Full) */}
                  <div className="w-32 sm:w-48 lg:w-full lg:aspect-[2/3] rounded-lg shadow-2xl overflow-hidden mb-4 lg:mb-6 border border-white/10 bg-muted">
                      {movie.poster_path ? (
                          <img src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} className="w-full h-full object-cover" />
                      ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No Poster</div>
                      )}
                  </div>

                  {/* Core Identity */}
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight mb-2 text-white">
                      {mainTitle}
                  </h1>
                  {secondaryTitle && (
                      <h2 className="text-lg lg:text-xl text-muted-foreground font-medium mb-3">
                          {secondaryTitle}
                      </h2>
                  )}

                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 text-sm text-muted-foreground mb-4">
                      {year && <span>{year}</span>}
                      {runtime > 0 && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-white/30" />
                            <span>{Math.floor(runtime/60)}h {runtime%60}m</span>
                          </>
                      )}
                      {genres?.length > 0 && (
                          <>
                             <span className="w-1 h-1 rounded-full bg-white/30" />
                             <span className="truncate max-w-[200px]">{genres.map((g: { name: string }) => g.name).join(", ")}</span>
                          </>
                      )}
                  </div>

                  {/* Availability Utility Line */}
                  <div className="w-full max-w-sm lg:max-w-none flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 mb-4 lg:mb-0">
                     <FilmAvailability
                        availability={availability}
                        loading={availabilityLoading}
                        countryCode={countryCode}
                        subscribedPlatforms={subscribedPlatforms}
                        mode="hero"
                        onExpand={onOpenAvailability}
                     />

                     <Button
                        variant="secondary"
                        size="sm"
                        className="gap-2 rounded-full bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-md"
                        onClick={onWatchTrailer}
                     >
                        <Play className="w-4 h-4 fill-current" /> Watch Trailer
                     </Button>
                  </div>
             </div>
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ActionSection({ userStatus, myRating, myReview, myTags, allTags, handleStatus, onSaveReview, handleRateNav, handleDeleteRating, showRecommend, watchWithInvitations = [], hasFriendRatings = false }: any) {
    const [hoverRating, setHoverRating] = useState(0);
    const [isExpanded, setIsExpanded] = useState(!hasFriendRatings && userStatus === null);
    const userInteracted = useRef(false);
    const { getDisplayName } = useUserAliases();

    useEffect(() => {
        if (userInteracted.current) return;

        if (hasFriendRatings) {
            setIsExpanded(false);
        } else if (userStatus === null) {
            setIsExpanded(true);
        }
    }, [hasFriendRatings, userStatus]);

    const [content, setContent] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");
    const [showTagSuggestions, setShowTagSuggestions] = useState(false);
    const [draftRating, setDraftRating] = useState(0);

    // Initialize local state when myReview/myRating changes
    useEffect(() => {
        if (myReview) {
            setContent(myReview.content || "");
        } else {
            setContent("");
        }
    }, [myReview]);

    useEffect(() => {
        setTags(myTags || []);
    }, [myTags]);

    useEffect(() => {
        setDraftRating(myRating);
    }, [myRating]);

    const handleStarClick = (star: number) => {
        userInteracted.current = true;
        // Auto-save immediately
        onSaveReview('watched', star, content, tags);
        // Expand
        setIsExpanded(true);
    };

    const handleWatchlistClick = () => {
        userInteracted.current = true;
        // Auto-save immediately
        onSaveReview('watchlist', null, content, tags);
        // Expand
        setIsExpanded(true);
    }

    const handleAddTag = (tag: string) => {
        const trimmed = tag.trim();
        if (trimmed && !tags.includes(trimmed)) {
            setTags([...tags, trimmed]);
        }
        setTagInput("");
        setShowTagSuggestions(false);
    };

    const tagSuggestions = (allTags || []).filter((t: string) => t.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t));

    const onSaveNotes = () => {
        userInteracted.current = true;
        const status = userStatus || 'watched';
        const rating = userStatus === 'watched' ? (myRating || draftRating) : null;
        onSaveReview(status, rating, content, tags);
        setIsExpanded(false);
    }

    const renderExpandedForm = (mode: 'watched' | 'watchlist') => (
         <div className="mt-4 space-y-4 bg-card/30 border-t border-dashed pt-4 animate-in fade-in slide-in-from-top-1">
             {/* Content */}
             <Textarea
                placeholder={mode === 'watched' ? "Write your thoughts..." : "Add a note..."}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[100px] bg-secondary/30 resize-none text-base"
             />

             {/* Tags */}
             <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="px-2 py-0.5 gap-1 text-xs">
                            {tag}
                            <X className="h-3 w-3 cursor-pointer" onClick={() => setTags(tags.filter(t => t !== tag))} />
                        </Badge>
                    ))}
                </div>
                <div className="relative">
                    <Input
                        placeholder="Add a tag..."
                        value={tagInput}
                        onChange={(e) => { setTagInput(e.target.value); setShowTagSuggestions(true); }}
                        onFocus={() => setShowTagSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddTag(tagInput)}
                        className="h-9 bg-secondary/30"
                    />
                    {showTagSuggestions && tagInput && tagSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-40 overflow-y-auto">
                            {tagSuggestions.map((tag: string) => (
                                <button key={tag} className="w-full text-left px-3 py-2 text-sm hover:bg-secondary" onClick={() => handleAddTag(tag)}>
                                    {tag}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
             </div>

             {/* Actions */}
             <div className="flex gap-2 justify-end">
                 <Button variant="ghost" size="sm" onClick={() => {
                     userInteracted.current = true;
                     setIsExpanded(false);
                 }}>Cancel</Button>
                 <Button size="sm" onClick={onSaveNotes}>Save</Button>
             </div>
         </div>
    );

    return (
        <div className="w-full bg-card/90 backdrop-blur-sm px-4 py-3 shadow-sm z-20">
            {/* WATCHED STATE */}
            {userStatus === 'watched' && (
                <div className="space-y-4 group/section">
                    {/* Header Row */}
                    <div className="flex flex-col gap-0">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-muted-foreground uppercase">Your Rating</span>
                            <div className="flex gap-2 opacity-0 group-hover/section:opacity-100 transition-opacity">
                                <Button variant="outline" size="sm" onClick={handleRateNav}>
                                    <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={handleDeleteRating}>
                                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 group relative flex-wrap">
                            <div className="flex flex-wrap" onMouseLeave={() => setHoverRating(0)}>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => handleStarClick(star)}
                                        onMouseEnter={() => setHoverRating(star)}
                                        className="p-0.5"
                                    >
                                        <Star
                                            className={`w-5 h-5 ${star <= (hoverRating || myRating) ? "fill-yellow-400 text-yellow-400" : "fill-transparent text-muted-foreground/30"}`}
                                        />
                                    </button>
                                ))}
                            </div>
                            <span className="ml-3 text-4xl font-black text-white tabular-nums tracking-tighter">{hoverRating || myRating}</span>

                            <Button variant="ghost" size="sm" onClick={showRecommend} className="hidden sm:flex text-muted-foreground hover:text-primary ml-auto">
                                <Send className="w-4 h-4 mr-2" /> Recommend
                            </Button>
                        </div>
                    </div>

                    {/* Content Display (Only if NOT expanded) */}
                    {!isExpanded && myReview?.content && (
                         <div className="bg-muted/30 p-3 rounded-lg text-sm border group/content relative">
                             <p className="leading-relaxed whitespace-pre-wrap line-clamp-4">
                                 {myReview.content}
                             </p>
                             <Button
                                variant="ghost"
                                size="sm"
                                className="absolute top-2 right-2 opacity-0 group-hover/content:opacity-100 h-6 px-2 text-xs"
                                onClick={() => {
                                    userInteracted.current = true;
                                    setIsExpanded(true);
                                }}
                             >
                                Edit Note
                             </Button>
                         </div>
                    )}

                    {isExpanded && renderExpandedForm('watched')}
                </div>
            )}

            {/* WATCHLIST STATE */}
            {userStatus === 'watchlist' && (
                 <div className="space-y-4 group/section">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-primary">
                                <Clock className="w-5 h-5" />
                                <span className="font-bold">You want to watch this</span>
                            </div>

                            {/* Desktop Watch With Button */}
                            <Button variant="ghost" size="sm" onClick={showRecommend} className="hidden sm:flex text-muted-foreground hover:text-primary hover:bg-primary/10">
                                <Users className="w-4 h-4 mr-2" /> Watch with...
                            </Button>
                        </div>

                        <div className="flex gap-2 opacity-0 group-hover/section:opacity-100 transition-opacity">
                            <Button variant="outline" size="sm" onClick={handleRateNav}>
                                <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handleDeleteRating}>
                                <Trash2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                        </div>
                     </div>

                     {/* Watching With Faces */}
                     {watchWithInvitations.length > 0 && (
                        <div className="flex items-center gap-3 bg-muted/20 p-2 rounded-lg">
                            <span className="text-xs text-muted-foreground font-medium uppercase">Watching with</span>
                            <div className="flex -space-x-2">
                                {watchWithInvitations.map((p: { id: string, username: string | null, avatar_url: string | null }) => (
                                    <TooltipProvider key={p.id}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Link to={`/profile/${p.username}`}>
                                                    <Avatar className="w-6 h-6 border border-background">
                                                        <AvatarImage src={p.avatar_url || undefined} />
                                                        <AvatarFallback className="text-[8px]">{p.username?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                </Link>
                                            </TooltipTrigger>
                                            <TooltipContent><p>{getDisplayName(p.id, p.username) || p.username}</p></TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ))}
                            </div>
                        </div>
                     )}

                     {/* Mobile Watch With Button */}
                     <div className="flex items-center justify-end sm:hidden">
                        <Button variant="ghost" size="sm" onClick={showRecommend} className="text-muted-foreground hover:text-primary hover:bg-primary/10">
                            <Users className="w-4 h-4 mr-2" /> Watch with...
                        </Button>
                     </div>

                     {/* Content Display */}
                     {!isExpanded && myReview?.content && (
                        <div className="bg-muted/30 p-3 rounded-lg text-sm border group/content relative">
                            <p className="leading-relaxed whitespace-pre-wrap">{myReview.content}</p>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="absolute top-2 right-2 opacity-0 group-hover/content:opacity-100 h-6 px-2 text-xs"
                                onClick={() => {
                                    userInteracted.current = true;
                                    setIsExpanded(true);
                                }}
                            >
                                Edit Note
                            </Button>
                        </div>
                    )}

                    {isExpanded && renderExpandedForm('watchlist')}
                 </div>
            )}

            {/* NULL STATE */}
            {userStatus === null && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                         <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-muted-foreground uppercase">Rate This</span>
                            <div className="flex items-center gap-1 min-h-[28px]" onMouseLeave={() => setHoverRating(0)}>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => handleStarClick(star)}
                                        onMouseEnter={() => setHoverRating(star)}
                                        className="p-0.5 transition-transform hover:scale-110"
                                    >
                                        <Star
                                            className={`w-5 h-5 ${star <= hoverRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30 fill-transparent"}`}
                                        />
                                    </button>
                                ))}

                                {/* Fixed width container for rating number to prevent shifting */}
                                <span className="w-8 ml-2 text-xl font-bold text-white text-center">
                                    {hoverRating > 0 ? hoverRating : ""}
                                </span>
                             </div>
                         </div>

                         <div className="flex items-center gap-4 pb-1 mt-3">
                             <span className={`text-muted-foreground text-sm hidden sm:inline transition-opacity duration-200 ${hoverRating > 0 ? 'opacity-0' : 'opacity-100'}`}>or</span>
                             <Button
                                variant="outline"
                                className="w-full sm:w-auto gap-2 border-primary/20 text-primary hover:bg-primary/5 hover:border-primary"
                                onClick={handleWatchlistClick}
                             >
                                 <Plus className="w-4 h-4" /> Add to Watchlist
                             </Button>
                         </div>
                    </div>
                    {isExpanded && renderExpandedForm('watched')}
                </div>
            )}

            {/* Recommend Action Mobile (for Watched state mostly) */}
            {(!isExpanded && userStatus === 'watched') && (
                <div className="mt-3 border-t border-dashed pt-2 flex justify-end sm:hidden">
                    <Button variant="ghost" size="sm" onClick={showRecommend} className="text-muted-foreground hover:text-primary">
                        <Send className="w-4 h-4 mr-2" /> Recommend to friend
                    </Button>
                </div>
            )}
        </div>
    )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DeepDataSection({ movie, layout = 'horizontal' }: any) {
    const [isExpanded, setIsExpanded] = useState(false);
    const directors = movie.credits?.crew.filter((c: { job: string, name: string, id: number }) => c.job === "Director") || [];
    const cast = movie.credits?.cast?.slice(0, 15) || [];
    const isLongOverview = movie.overview && movie.overview.length > 150;
    const isVertical = layout === 'vertical';

    return (
        <div className="space-y-8 pb-12">

            {/* Director - NEW */}
            {directors.length > 0 && (
                 <div className="space-y-1">
                     <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Director</h3>
                     <div className="font-medium text-foreground text-lg">
                         {directors.map((d: { id: number, name: string }, i: number) => (
                            <span key={d.id}>
                                <Link
                                    to={`/search?tab=movies&sort=relevance&people=${d.id}%3A${encodeURIComponent(d.name)}`}
                                    className="hover:text-primary hover:underline transition-colors"
                                >
                                    {d.name}
                                </Link>
                                {i < directors.length - 1 && ", "}
                            </span>
                         ))}
                     </div>
                 </div>
            )}

            {/* Overview */}
            {movie.overview && (
                <div className="space-y-2">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Synopsis</h3>
                    <div className="relative">
                        <p className={`text-muted-foreground leading-relaxed ${!isExpanded ? 'line-clamp-4' : ''}`}>
                            {movie.overview}
                        </p>
                        {isLongOverview && !isExpanded && (
                            <button onClick={() => setIsExpanded(true)} className="text-primary text-sm font-medium mt-1 hover:underline">
                                Show more
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Cast */}
            {cast.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Cast</h3>

                    {/* Always use Horizontal Carousel (ScrollArea) */}
                    <ScrollArea className="w-full whitespace-nowrap pb-4">
                        <div className="flex w-max space-x-4">
                            {cast.map((c: { id: number, name: string, profile_path: string | null, character: string }) => (
                                <Link key={c.id} to={`/search?tab=movies&sort=relevance&people=${c.id}%3A${encodeURIComponent(c.name)}`} className="block w-24 space-y-2 group">
                                    <div className="w-24 h-32 rounded-lg overflow-hidden bg-muted">
                                        {c.profile_path ? (
                                            <img src={`https://image.tmdb.org/t/p/w185${c.profile_path}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No Image</div>
                                        )}
                                    </div>
                                    <div className="whitespace-normal">
                                        <p className="text-xs font-semibold leading-tight text-wrap">{c.name}</p>
                                        <p className="text-[10px] text-muted-foreground leading-tight text-wrap">{c.character}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </div>
            )}

            {/* Tech Specs Footer */}
            <div className="pt-8 border-t border-white/5 space-y-4">
                <div className="flex flex-col gap-2 text-xs text-muted-foreground/60">
                     <div className="flex gap-2">
                         <span className="font-semibold uppercase w-20 shrink-0">Countries</span>
                         <span>{movie.production_countries?.map((c: { name: string, iso_3166_1: string }) => c.name || c.iso_3166_1).join(", ")}</span>
                     </div>
                     <div className="flex gap-2">
                         <span className="font-semibold uppercase w-20 shrink-0">Languages</span>
                         <span>{movie.spoken_languages?.map((l: { english_name: string, iso_639_1: string }) => l.english_name || l.iso_639_1).join(", ")}</span>
                     </div>
                     {movie.imdb_id && (
                         <div className="flex gap-2">
                             <span className="font-semibold uppercase w-20 shrink-0">Links</span>
                             <a
                                href={`https://www.imdb.com/title/${movie.imdb_id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:text-primary underline decoration-muted-foreground/30 underline-offset-4"
                             >
                                 IMDb Profile
                             </a>
                         </div>
                     )}
                </div>
            </div>

        </div>
    )
}

function ReviewCard({ review, community = false }: { review: FeedReview, community?: boolean }) {
    const navigate = useNavigate();
    const { getDisplayName } = useUserAliases();
    const displayName = getDisplayName(review.user_id, review.user.username) || review.user.username;

    return (
        <div 
            onClick={() => {
                if (review.film.tmdb_id && review.user.username) {
                    navigate(`/${review.film.media_type || 'movie'}/${slugify(review.film.title) || 'title'}/${review.film.tmdb_id}/${encodeURIComponent(review.user.username)}`);
                } else {
                    navigate(`/review/${review.id}`);
                }
            }}
            className={`
                p-4 rounded-xl border bg-card hover:bg-card/80 transition-colors cursor-pointer
                ${community ? 'opacity-80 border-transparent bg-muted/10' : 'shadow-sm border-primary/10'}
            `}
        >
             {review.socialContext && (
                 <SocialContextHeader connectors={review.socialContext} />
             )}

             <div className="flex items-start gap-3">
                 <Avatar className="w-10 h-10 border border-background">
                     <AvatarImage src={review.user.avatar_url || undefined} />
                     <AvatarFallback>{review.user.username?.[0]}</AvatarFallback>
                 </Avatar>
                 <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                          <span className={`font-semibold ${community ? 'text-muted-foreground' : 'text-foreground'}`}>
                              {displayName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(review.edited_at || review.created_at))} ago
                          </span>
                      </div>

                      {review.rating && (
                          <div className="flex items-center gap-1 mt-1 mb-2">
                              <div className="flex text-yellow-500">
                                  {[1,2,3,4,5,6,7,8,9,10].map(i => (
                                      <Star key={i} className={`w-3 h-3 ${i <= review.rating! ? "fill-current" : "text-muted-foreground/30"}`} />
                                  ))}
                              </div>
                              <span className="text-white text-sm font-bold ml-1">{review.rating}</span>
                          </div>
                      )}

                      {review.content && (
                          <p className="text-sm text-foreground/90 line-clamp-6 leading-relaxed">
                              {review.content}
                          </p>
                      )}

                      {review.tags && review.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                              {review.tags.map(tag => (
                                  <Badge key={tag} variant="secondary" className="px-1.5 py-0 text-[10px] h-5">{tag}</Badge>
                              ))}
                          </div>
                      )}
                 </div>
             </div>
        </div>
    )
}

function CompactRatingRow({ review, community = false }: { review: FeedReview, community?: boolean }) {
    const navigate = useNavigate();
    const { getDisplayName } = useUserAliases();
    const displayName = getDisplayName(review.user_id, review.user.username) || review.user.username;

    return (
        <div
            onClick={() => {
                // Check if we have necessary fields for the SEO friendly route
                 if (review.film.tmdb_id && review.user.username) {
                    // Default to 'movie' if media_type is missing/null
                    const mediaType = review.film.media_type || 'movie';
                    const slug = slugify(review.film.title) || 'title';
                    navigate(`/${mediaType}/${slug}/${review.film.tmdb_id}/${encodeURIComponent(review.user.username)}`);
                } else {
                    navigate(`/review/${review.id}`);
                }
            }}
            className={`
                flex flex-col p-2 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer
                ${community ? 'opacity-60' : ''}
            `}
        >
            {review.socialContext && (
                <SocialContextHeader connectors={review.socialContext} compact />
            )}
            <div className="flex items-start gap-3">
                <Avatar className="w-6 h-6 border text-[10px] mt-0.5">
                    <AvatarImage src={review.user.avatar_url || undefined} />
                    <AvatarFallback>{review.user.username?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-2 flex-1 flex-wrap mt-0.5">
                    <span className="text-sm font-medium truncate max-w-[120px]">{displayName}</span>
                    <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                        <span className="text-sm font-bold">{review.rating}</span>
                    </div>
                    {review.tags && review.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 ml-2">
                            {review.tags.map(tag => (
                                <Badge key={tag} variant="outline" className="px-1.5 py-0 text-[10px] h-5 border-muted-foreground/30 text-muted-foreground">{tag}</Badge>
                            ))}
                        </div>
                    )}
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-1">
                    {formatDistanceToNow(new Date(review.edited_at || review.created_at))} ago
                </span>
            </div>
        </div>
    )
}