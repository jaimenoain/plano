import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Loader2, ArrowLeft, ArrowRight, Trash2, Heart, Star, MessageCircle, Clock, Pencil, MapPin, Send, ExternalLink } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { MetaHead } from "@/components/common/MetaHead";
import NotFound from "@/pages/NotFound";

interface FeedReview {
  id: string;
  content: string | null;
  rating: number | null;
  tags: string[] | null;
  created_at: string;
  user_id: string;
  building_id: string;
  status: string;
  user: {
    username: string | null;
    avatar_url: string | null;
  };
  building: {
    id: string;
    name: string;
    year_completed: number | null;
    architects: string[] | null;
    address: string | null;
  };
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user: {
    username: string | null;
    avatar_url: string | null;
  };
  likes_count: number;
  is_liked: boolean;
}

interface RelatedReview {
  id: string;
  rating: number | null;
  user: {
    username: string | null;
    avatar_url: string | null;
  };
}

interface Liker {
  user_id: string;
  user: {
    username: string | null;
    avatar_url: string | null;
  };
}

interface ReviewLink {
  id: string;
  url: string;
  title: string;
  likes_count: number;
  is_liked: boolean;
}

export default function ReviewDetails() {
  const { id: paramId } = useParams(); // This is the Log UUID
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [review, setReview] = useState<FeedReview | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [relatedReviews, setRelatedReviews] = useState<RelatedReview[]>([]);
  const [links, setLinks] = useState<ReviewLink[]>([]);
  const [likers, setLikers] = useState<Liker[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showLikesDialog, setShowLikesDialog] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function loadData() {
        if (!paramId) {
            setNotFound(true);
            setLoading(false);
            return;
        }

        setLoading(true);
        setNotFound(false);

        try {
            // 1. Fetch Log Data
            const { data: reviewData, error } = await supabase
                .from("user_buildings")
                .select(`
                    id, content, rating, tags, created_at, user_id, building_id, status,
                    user:profiles(username, avatar_url),
                    building:buildings(id, name, year_completed, architects, address)
                `)
                .eq("id", paramId)
                .single();

            if (error) {
                if (error.code === "PGRST116") {
                        setNotFound(true);
                        setLoading(false);
                        return;
                }
                throw error;
            }

            if (!reviewData) {
                setNotFound(true);
                setLoading(false);
                return;
            }

            // 2. Fetch Auxiliary Data in Parallel
            const [likesCount, commentsCount, userLike, likersData] = await Promise.all([
                supabase.from("likes").select("id", { count: "exact" }).eq("interaction_id", reviewData.id),
                supabase.from("comments").select("id", { count: "exact" }).eq("interaction_id", reviewData.id),
                user ? supabase.from("likes").select("id").eq("interaction_id", reviewData.id).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
                supabase.from("likes").select("user_id, user:profiles(username, avatar_url)").eq("interaction_id", reviewData.id).order("created_at", { ascending: false }).limit(50)
            ]);

            setReview({
                id: reviewData.id,
                content: reviewData.content,
                rating: reviewData.rating,
                tags: reviewData.tags,
                created_at: reviewData.created_at,
                user_id: reviewData.user_id,
                building_id: reviewData.building_id,
                status: reviewData.status,
                user: Array.isArray(reviewData.user) ? reviewData.user[0] : reviewData.user,
                building: Array.isArray(reviewData.building) ? reviewData.building[0] : reviewData.building,
                likes_count: likesCount.count || 0,
                comments_count: commentsCount.count || 0,
                is_liked: !!userLike.data,
            });

            if (likersData.data) {
                // @ts-ignore
                setLikers(likersData.data.map(item => ({
                    user_id: item.user_id,
                    user: Array.isArray(item.user) ? item.user[0] : item.user
                })));
            }

            // Related Reviews Logic (Same Building)
            if (reviewData.building_id) {
                let followingIds: string[] = [];
                if (user) {
                    const { data: follows } = await supabase
                        .from("follows")
                        .select("following_id")
                        .eq("follower_id", user.id);

                    followingIds = follows?.map(f => f.following_id) || [];
                }

                let relatedData: any[] = [];

                // Try to find friends first
                if (followingIds.length > 0) {
                    const { data: friendsData } = await supabase
                        .from("user_buildings")
                        .select(`
                            id, rating,
                            user:profiles(username, avatar_url)
                        `)
                        .eq("building_id", reviewData.building_id)
                        .in("user_id", followingIds)
                        .neq("id", reviewData.id)
                        .eq("status", "visited") // Only visited logs usually have ratings/value
                        .limit(15);

                    if (friendsData && friendsData.length > 0) {
                        relatedData = friendsData;
                    }
                }

                // Fallback to community
                if (relatedData.length === 0) {
                    let query = supabase
                        .from("user_buildings")
                        .select(`
                            id, rating,
                            user:profiles(username, avatar_url)
                        `)
                        .eq("building_id", reviewData.building_id)
                        .neq("id", reviewData.id)
                        .eq("status", "visited")
                        .limit(15);

                    if (user) {
                        query = query.neq("user_id", user.id);
                    }

                    const { data: communityData } = await query;
                    if (communityData) {
                        relatedData = communityData;
                    }
                }

                if (relatedData.length > 0) {
                    const mapped = relatedData.map(r => ({
                        ...r,
                        user: Array.isArray(r.user) ? r.user[0] : r.user
                    }));

                    mapped.sort((a: any, b: any) => {
                        const aHasAvatar = !!a.user.avatar_url;
                        const bHasAvatar = !!b.user.avatar_url;
                        if (aHasAvatar === bHasAvatar) return 0;
                        return bHasAvatar ? 1 : -1;
                    });

                    // @ts-ignore
                    setRelatedReviews(mapped);
                }
            }

            // Comments
            const { data: commentsData, error: commentsError } = await supabase
                .from("comments")
                .select(`
                    id, content, created_at, user_id,
                    user:profiles(username, avatar_url)
                `)
                .eq("interaction_id", reviewData.id)
                .order("created_at", { ascending: true });

            if (commentsError) throw commentsError;

            let formattedComments: Comment[] = [];
            if (commentsData.length > 0) {
                const commentIds = commentsData.map(c => c.id);
                // @ts-ignore
                const { data: likesData } = await supabase
                    .from("comment_likes")
                    .select("comment_id, user_id")
                    .in("comment_id", commentIds);

                formattedComments = commentsData.map(c => {
                    const relevantLikes = likesData?.filter((l: any) => l.comment_id === c.id) || [];
                    return {
                        ...c,
                        user: Array.isArray(c.user) ? c.user[0] : c.user,
                        likes_count: relevantLikes.length,
                        is_liked: user ? relevantLikes.some((l: any) => l.user_id === user.id) : false
                    };
                });
            }
            setComments(formattedComments);

            // Links
            const { data: linksData } = await supabase
                .from("review_links")
                .select("id, url, title")
                .eq("review_id", reviewData.id);

            let formattedLinks: ReviewLink[] = [];
            if (linksData && linksData.length > 0) {
                const linkIds = linksData.map(l => l.id);
                // @ts-ignore
                const { data: allLinkLikes } = await supabase
                    .from("link_likes")
                    .select("link_id, user_id")
                    .in("link_id", linkIds);

                formattedLinks = linksData.map(l => {
                    const relevant = allLinkLikes?.filter((x: any) => x.link_id === l.id) || [];
                    return {
                        ...l,
                        likes_count: relevant.length,
                        is_liked: user ? relevant.some((x: any) => x.user_id === user.id) : false
                    };
                });
            }
            setLinks(formattedLinks);

        } catch (e) {
            console.error(e);
            setNotFound(true);
        } finally {
            setLoading(false);
        }
    }

    loadData();
  }, [paramId, user?.id]);

  const handleLikeReview = async () => {
    if (!user || !review) return;
    
    // Optimistic update
    const isLiking = !review.is_liked;
    
    setReview(prev => prev ? ({
      ...prev,
      is_liked: isLiking,
      likes_count: isLiking ? prev.likes_count + 1 : prev.likes_count - 1
    }) : null);

    // Update likers list locally
    if (isLiking) {
        setLikers(prev => [
            { 
                user_id: user.id, 
                user: { 
                    username: user.email?.split('@')[0] || "Me", // Fallback if profile not fully loaded
                    avatar_url: null 
                } 
            }, 
            ...prev
        ]);
    } else {
        setLikers(prev => prev.filter(l => l.user_id !== user.id));
    }

    try {
      if (!isLiking) {
        await supabase.from("likes").delete().eq("interaction_id", review.id).eq("user_id", user.id);
      } else {
        await supabase.from("likes").insert({ interaction_id: review.id, user_id: user.id });
      }
      // Re-fetch to ensure data consistency, especially user details
      const { data } = await supabase.from("likes").select("user_id, user:profiles(username, avatar_url)").eq("interaction_id", review.id).order("created_at", { ascending: false }).limit(50);
      if (data) {
         // @ts-ignore
         setLikers(data.map(item => ({ user_id: item.user_id, user: Array.isArray(item.user) ? item.user[0] : item.user })));
      }
    } catch (error) {
      console.error(error);
      // Revert on error would go here
    }
  };

  const handleLikeLink = async (linkId: string) => {
    if (!user) return;
    const link = links.find(l => l.id === linkId);
    if (!link) return;

    const wasLiked = link.is_liked;
    setLinks(prev => prev.map(l => l.id === linkId ? {
        ...l,
        is_liked: !wasLiked,
        likes_count: wasLiked ? l.likes_count - 1 : l.likes_count + 1
    } : l));

    try {
        if (wasLiked) {
            // @ts-ignore
            const { error } = await supabase.from("link_likes").delete().eq("link_id", linkId).eq("user_id", user.id);
            if (error) throw error;
        } else {
            // @ts-ignore
            const { error } = await supabase.from("link_likes").insert({ link_id: linkId, user_id: user.id });
            if (error) throw error;
        }
    } catch (error) {
        console.error("Error toggling link like", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to update like." });
        // Revert optimistic update
        setLinks(prev => prev.map(l => l.id === linkId ? {
            ...l,
            is_liked: wasLiked,
            likes_count: wasLiked ? l.likes_count + 1 : l.likes_count - 1
        } : l));
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) return;
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;
    const wasLiked = comment.is_liked;
    setComments(prev => prev.map(c => c.id === commentId ? {
        ...c,
        is_liked: !wasLiked,
        likes_count: wasLiked ? c.likes_count - 1 : c.likes_count + 1
    } : c));
    try {
        if (wasLiked) {
            // @ts-ignore
            await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", user.id);
        } else {
            // @ts-ignore
            await supabase.from("comment_likes").insert({ comment_id: commentId, user_id: user.id });
        }
    } catch (error) {
        console.error("Error toggling comment like", error);
    }
  };

  const handlePostComment = async () => {
    if (!user || !newComment.trim() || !review) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("comments").insert({
        interaction_id: review.id,
        user_id: user.id,
        content: newComment.trim()
      });
      if (error) throw error;
      setNewComment("");

      // Refresh comments and counts
      const { data: commentsData } = await supabase
        .from("comments")
        .select(`
          id, content, created_at, user_id,
          user:profiles(username, avatar_url)
        `)
        .eq("interaction_id", review.id)
        .order("created_at", { ascending: true });

      if (commentsData) {
          // Refresh comments to ensure data consistency
          const commentIds = commentsData.map(c => c.id);
          // @ts-ignore
          const { data: likesData } = await supabase
            .from("comment_likes")
            .select("comment_id, user_id")
            .in("comment_id", commentIds);

          const formattedComments = commentsData.map(c => {
            const relevantLikes = likesData?.filter((l: any) => l.comment_id === c.id) || [];
            return {
                ...c,
                user: Array.isArray(c.user) ? c.user[0] : c.user,
                likes_count: relevantLikes.length,
                is_liked: user ? relevantLikes.some((l: any) => l.user_id === user.id) : false
            };
          });
          setComments(formattedComments);
          setReview(prev => prev ? ({ ...prev, comments_count: prev.comments_count + 1 }) : null);
      }

      toast({ title: "Comment posted" });
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: error.message || "Could not post comment." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
        const { error } = await supabase.from("comments").delete().eq("id", commentId);
        if (error) throw error;
        setComments(prev => prev.filter(c => c.id !== commentId));
        setReview(prev => prev ? ({ ...prev, comments_count: prev.comments_count - 1 }) : null);
        toast({ title: "Comment deleted" });
    } catch (error: any) {
        console.error(error);
        toast({ variant: "destructive", title: "Error", description: error.message || "Could not delete comment." });
    }
  };

  const handleDeleteReview = async () => {
    if (!review) return;
    if (!window.confirm("Are you sure you want to delete this log? This action cannot be undone.")) return;
    try {
        const { error } = await supabase.from("user_buildings").delete().eq("id", review.id);
        if (error) throw error;
        toast({ title: "Log deleted" });
        navigate("/profile"); 
    } catch (error: any) {
        console.error(error);
        toast({ variant: "destructive", title: "Error", description: error.message || "Could not delete log." });
    }
  };

  const renderFacepileText = () => {
    if (relatedReviews.length === 0) return null;
    const firstUser = relatedReviews[0].user.username;
    if (relatedReviews.length === 1) {
        return <span>Also visited by <span className="font-semibold">{firstUser}</span></span>;
    }
    return (
        <span>
            Also visited by <span className="font-semibold">{firstUser}</span> and <span className="font-semibold">{relatedReviews.length - 1} other{relatedReviews.length > 2 ? 's' : ''}</span>
        </span>
    );
  };

  const isBucketList = review?.status === 'pending';
  const isReviewOwner = user?.id === review?.user_id;

  const renderSidebarActions = () => (
    <div className="space-y-4 pt-2">
        {relatedReviews.length > 0 && (
            <Link
                to={`/building/${review!.building_id}`}
                className="block w-full group cursor-pointer animate-in fade-in slide-in-from-top-1"
            >
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center -space-x-2">
                        {relatedReviews.slice(0, 7).map((r) => (
                            <div
                                key={r.id}
                                className="relative transition-transform group-hover:scale-110"
                            >
                                <Avatar className="h-9 w-9 border border-white/10">
                                    <AvatarImage src={r.user.avatar_url || undefined} />
                                    <AvatarFallback className="text-[10px] bg-secondary">{r.user.username?.charAt(0)}</AvatarFallback>
                                </Avatar>
                            </div>
                        ))}
                    </div>
                    <p className="text-sm text-muted-foreground leading-tight group-hover:text-primary transition-colors">
                        {renderFacepileText()}
                    </p>
                </div>
            </Link>
        )}
    </div>
  );

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (notFound || !review || !review.building) return <NotFound />;

  // Building images are typically 4:3
  const imageUrl = null;

  const mainTitle = review.building.name;
  const completionYear = review.building.year_completed;

  const pageTitle = isBucketList
    ? `${review.user.username} wants to visit ${mainTitle}`
    : `${review.user.username}'s visit to ${mainTitle}`;

  const pageDescription = review.content
    ? review.content.replace(/[*_~`#]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\n/g, ' ').slice(0, 160)
    : isBucketList
      ? `${review.user.username} added ${mainTitle} to their bucket list.`
      : `${review.user.username} visited ${mainTitle} ${review.rating ? `and rated it ${review.rating}/5` : ''}.`;
  
  const formatDate = (date: string) => formatDistanceToNow(new Date(date), { addSuffix: true }).replace(/^about /, "");

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-primary/30 pb-32">
        <MetaHead
            title={pageTitle}
            description={pageDescription}
            image={imageUrl || undefined}
        />

        {imageUrl && (
            <div className="fixed inset-0 z-0">
                <img 
                    src={imageUrl}
                    alt="Background" 
                    className="w-full h-full object-cover blur-[80px] opacity-20 scale-105" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/50" />
            </div>
        )}

        <header className="sticky top-0 left-0 right-0 z-50 transition-all duration-200 bg-background/50 backdrop-blur-xl border-b border-white/5">
            <div className="flex items-center h-16 px-4 max-w-4xl mx-auto w-full">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-white/10 rounded-full">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <span className="font-semibold ml-4 text-sm opacity-70 truncate">
                    Visit Log
                </span>
            </div>
        </header>

        <main className="relative z-10 container max-w-4xl mx-auto px-4 pt-8 md:pt-12">
            <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start">
                
                {/* Left Column: Image & Facepile */}
                <div className="hidden md:block w-[160px] md:w-[240px] shrink-0 mx-auto md:mx-0 space-y-4">
                    <Link 
                        to={`/building/${review.building_id}`}
                        className="shadow-2xl rounded-lg overflow-hidden ring-1 ring-white/10 bg-secondary/50 block hover:ring-primary/50 hover:scale-[1.02] transition-all aspect-[4/3]"
                    >
                        {imageUrl ? (
                                <img 
                                src={imageUrl}
                                alt={review.building.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-secondary">
                                No Image
                            </div>
                        )}
                    </Link>

                    <div className="hidden md:block">
                        {renderSidebarActions()}
                    </div>
                </div>
                
                {/* Right Column: Review Details */}
                <div className="flex-1 min-w-0 w-full space-y-6 text-left">
                    
                    {/* Header: Title Sentence & Avatar */}
                    <div className="space-y-4">
                        <div className="flex items-start gap-4">
                             <Link to={`/profile/${review.user.username || review.user_id}`}>
                                <Avatar className="h-12 w-12 ring-2 ring-white/10 hover:ring-primary/50 transition-all">
                                    <AvatarImage src={review.user.avatar_url || undefined} />
                                    <AvatarFallback>{review.user.username?.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                             </Link>

                             <div className="flex-1 pr-2">
                                <h1 className="text-2xl md:text-3xl font-bold leading-tight text-white break-words">
                                   <Link to={`/profile/${review.user.username || review.user_id}`} className="hover:underline decoration-primary/50 underline-offset-4 decoration-2">
                                       {isReviewOwner ? "You" : review.user.username}
                                   </Link>
                                   {" "}
                                   <span className="text-muted-foreground font-normal text-xl md:text-2xl">
                                      {isBucketList ? (isReviewOwner ? "want to visit" : "wants to visit") : "visited"}
                                   </span>
                                   {" "}
                                   <Link to={`/building/${review.building_id}`} className="hover:text-primary transition-colors">{mainTitle}</Link>
                                </h1>

                                <div className="text-sm text-muted-foreground mt-1">
                                   {formatDate(review.created_at)}
                                </div>
                             </div>
                        </div>

                        {/* Rating or Watchlist Status */}
                        <div className="pl-16">
                            {isBucketList ? (
                                <div className="flex items-center gap-2 text-blue-400">
                                    <Clock className="w-5 h-5" />
                                    <span className="font-medium">Added to Bucket List</span>
                                </div>
                            ) : (
                                review.rating && (
                                    <div className="flex items-center gap-3">
                                        <div className="flex gap-0.5 md:gap-1.5">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className={cn(
                                                        "h-5 w-5 md:h-6 md:w-6 transition-all",
                                                        i < review.rating!
                                                            ? "fill-yellow-500 text-yellow-500"
                                                            : "fill-transparent text-white/20"
                                                    )}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-xl md:text-2xl font-bold text-white font-mono leading-none tracking-tighter">
                                            {review.rating}
                                        </span>
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    {/* Review Content */}
                    {review.content && (
                        <div className="relative group pt-2 pl-16">
                            <div className="prose prose-invert max-w-none">
                                <p className="text-lg text-slate-200 leading-relaxed whitespace-pre-line">
                                    {review.content}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Tags */}
                    {review.tags && review.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4 pl-16">
                            {review.tags.map(tag => (
                                <Link
                                    key={tag}
                                    to={`/profile/${review.user.username || review.user_id}?tag=${encodeURIComponent(tag)}`}
                                >
                                    <Badge variant="secondary" className="text-base font-normal px-3 py-1 rounded-full text-slate-200 bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                                        {tag}
                                    </Badge>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Resources Section */}
                    {links.length > 0 && (
                        <div className="pl-16 mt-6">
                            <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-3 tracking-wider">Resources</h3>
                            <div className="grid gap-2">
                                {links.map(link => {
                                    let domain = "";
                                    try {
                                        domain = new URL(link.url).hostname;
                                    } catch { }

                                    const displayDomain = domain || link.url;
                                    const hasTitle = !!link.title;

                                    return (
                                        <div key={link.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-white/5 group hover:bg-secondary/50 transition-colors">
                                            <a
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-3 min-w-0 flex-1"
                                            >
                                                <div className="p-2 rounded bg-background/50 text-muted-foreground group-hover:text-primary transition-colors">
                                                    <ExternalLink className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-sm text-slate-200 truncate pr-2">
                                                        {hasTitle ? link.title : displayDomain}
                                                    </p>
                                                    {hasTitle && (
                                                        <p className="text-xs text-muted-foreground truncate">
                                                            {displayDomain}
                                                        </p>
                                                    )}
                                                </div>
                                            </a>

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleLikeLink(link.id)}
                                                className={cn(
                                                    "ml-2 h-11 min-w-[44px] px-3 gap-1.5 hover:bg-background/50 rounded-full",
                                                    link.is_liked ? "text-red-500 hover:text-red-400" : "text-muted-foreground"
                                                )}
                                            >
                                                <Heart className={cn("w-4 h-4", link.is_liked && "fill-current")} />
                                                {link.likes_count > 0 && <span className="text-xs">{link.likes_count}</span>}
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons (Edit, Delete) - Only for Owner */}
                    {isReviewOwner && (
                        <div className="pl-0 md:pl-16 mt-6 flex flex-wrap gap-3">
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => navigate(`/post?id=${review.building_id}&title=${encodeURIComponent(review.building.name)}`)}
                            >
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit
                            </Button>

                            <Button
                                size="sm"
                                variant="ghost"
                                className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                onClick={handleDeleteReview}
                                aria-label="Delete log"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    )}

                    {/* Context Card (Mobile Only) */}
                    <div className="md:hidden mt-2">
                        <Link
                            to={`/building/${review.building_id}`}
                            className="block bg-secondary/30 border border-white/5 rounded-xl overflow-hidden active:scale-[0.98] transition-transform"
                        >
                            <div className="flex gap-4 p-3">
                                <div className="shrink-0 w-24 aspect-[4/3] bg-secondary rounded-md overflow-hidden relative">
                                     {imageUrl && <img src={imageUrl} className="w-full h-full object-cover" />}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
                                     <div className="flex items-center justify-between gap-2">
                                         <span className="font-semibold text-base text-white truncate">{mainTitle}</span>
                                         <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                     </div>
                                     <div className="text-sm text-muted-foreground flex items-center gap-1">
                                        {review.building.address && <MapPin className="w-3 h-3" />}
                                        <span className="truncate">{review.building.address || completionYear}</span>
                                     </div>
                                </div>
                            </div>
                        </Link>

                        {/* Facepile below Card */}
                        {relatedReviews.length > 0 && (
                            <div className="flex items-center gap-2 mt-3 px-1">
                                <div className="flex -space-x-2">
                                    {relatedReviews.slice(0, 3).map(r => (
                                        <Avatar key={r.id} className="w-7 h-7 border border-background ring-1 ring-white/10">
                                            <AvatarImage src={r.user.avatar_url || undefined} />
                                            <AvatarFallback className="text-[9px]">{r.user.username?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                    ))}
                                </div>
                                <span className="text-sm text-muted-foreground ml-1">
                                    Also visited by {relatedReviews[0].user.username} {relatedReviews.length > 1 ? `+${relatedReviews.length - 1}` : ''}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Interaction Bar */}
                    <div className="flex items-center gap-6 pt-2 border-t border-white/5 mt-6">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className={cn(
                                "gap-2 h-9 px-0 hover:bg-transparent hover:text-white transition-colors", 
                                review.is_liked ? "text-red-500 hover:text-red-400" : "text-muted-foreground"
                            )}
                            onClick={handleLikeReview}
                        >
                            <Heart className={cn("h-5 w-5", review.is_liked && "fill-current")} />
                            <span className="text-sm font-medium">{review.likes_count > 0 ? review.likes_count : "Like"}</span>
                        </Button>
                        
                        <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                            <MessageCircle className="h-5 w-5" />
                            <span>{comments.length} Comments</span>
                        </div>
                    </div>

                    {/* Likes Facepile Section */}
                    {likers.length > 0 && (
                        <div className="pt-2 animate-in fade-in slide-in-from-top-1">
                            <button 
                                onClick={() => setShowLikesDialog(true)}
                                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors group text-left"
                            >
                                <div className="flex -space-x-2">
                                    {likers.slice(0, 3).map((liker) => (
                                        <Avatar key={liker.user_id} className="h-5 w-5 border border-background ring-1 ring-white/10">
                                            <AvatarImage src={liker.user.avatar_url || undefined} />
                                            <AvatarFallback className="text-[8px] bg-secondary">{liker.user.username?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                    ))}
                                </div>
                                <span>
                                    Liked by <span className="font-semibold text-white/90 group-hover:text-primary transition-colors">{likers[0].user.username}</span>
                                    {likers.length > 1 && (
                                        <> and <span className="font-semibold text-white/90 group-hover:text-primary transition-colors">{likers.length - 1} other{likers.length > 2 ? 's' : ''}</span></>
                                    )}
                                </span>
                            </button>
                        </div>
                    )}

                    {/* Comments Section */}
                    {comments.length > 0 && (
                        <div className="pt-8 mt-4 space-y-6">
                            {comments.map((comment) => {
                                const isCommentOwner = user?.id === comment.user_id;
                                const canDelete = isReviewOwner || isCommentOwner;

                                return (
                                    <div key={comment.id} className="flex gap-3 group animate-in fade-in slide-in-from-bottom-2 duration-500">
                                        <Link to={`/profile/${comment.user_id}`}>
                                            <Avatar className="h-8 w-8 mt-1 ring-1 ring-white/10 shrink-0 hover:ring-primary/50 transition-all">
                                                <AvatarImage src={comment.user.avatar_url || undefined} />
                                                <AvatarFallback>{comment.user.username?.charAt(0).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                        </Link>
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-baseline gap-2">
                                                <Link to={`/profile/${comment.user_id}`} className="text-sm font-semibold text-white/90 hover:text-primary transition-colors">
                                                    {comment.user.username}
                                                </Link>
                                                <span className="text-xs text-muted-foreground">
                                                    {formatDate(comment.created_at)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-300 leading-relaxed">{comment.content}</p>

                                            <div className="flex items-center gap-4 mt-1">
                                                <button
                                                    onClick={() => handleLikeComment(comment.id)}
                                                    className={cn(
                                                        "text-xs flex items-center gap-1.5 transition-colors hover:text-white",
                                                        comment.is_liked ? "text-red-500" : "text-muted-foreground"
                                                    )}
                                                >
                                                    <Heart className={cn("h-3 w-3", comment.is_liked && "fill-current")} />
                                                    {comment.likes_count > 0 && comment.likes_count}
                                                </button>

                                                {canDelete && (
                                                    <button 
                                                        onClick={() => handleDeleteComment(comment.id)}
                                                        className="text-xs text-muted-foreground hover:text-red-400 flex items-center gap-1.5 transition-colors opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                        <span>Delete</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                </div>
            </div>
        </main>

        <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-white/10 p-4 z-50">
            <div className="max-w-4xl mx-auto flex gap-3 items-end">
                <Textarea 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add to the discussion..."
                    className="min-h-[44px] max-h-32 resize-none bg-secondary/50 border-white/5 focus:border-primary focus:ring-1 focus:ring-primary/50 rounded-2xl py-2.5 px-4 text-sm shadow-lg"
                />
                <Button 
                    size="icon" 
                    onClick={handlePostComment}
                    disabled={submitting || !newComment.trim()}
                    className="h-[44px] w-[44px] shrink-0 rounded-full shadow-xl bg-primary hover:bg-primary/90 transition-transform active:scale-95"
                >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 ml-0.5" />}
                </Button>
            </div>
        </div>

        <Dialog open={showLikesDialog} onOpenChange={setShowLikesDialog}>
            <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-white/10">
                <DialogHeader>
                    <DialogTitle>Liked by</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] overflow-y-auto -mx-1 pr-3">
                    <div className="space-y-4 py-2">
                        {likers.map((liker) => (
                            <Link 
                                key={liker.user_id}
                                to={`/profile/${liker.user.username}`}
                                onClick={() => setShowLikesDialog(false)}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
                            >
                                <Avatar className="h-10 w-10 ring-1 ring-white/10">
                                    <AvatarImage src={liker.user.avatar_url || undefined} />
                                    <AvatarFallback>{liker.user.username?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="font-medium text-foreground">
                                    {liker.user.username}
                                </div>
                            </Link>
                        ))}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    </div>
  );
}
