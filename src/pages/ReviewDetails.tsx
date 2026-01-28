import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Loader2, Trash2, Heart, Star, MessageCircle, Pencil, MapPin, Send, ExternalLink, Calendar, Building2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { MetaHead } from "@/components/common/MetaHead";
import NotFound from "@/pages/NotFound";
import { getBuildingImageUrl } from "@/utils/image";

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
    address: string | null;
    main_image_url: string | null;
    architects: { id: string; name: string }[] | null;
  };
  images: { id: string; url: string }[];
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
                    building:buildings(id, name, year_completed, address, main_image_url, architects:building_architects(architect:architects(name, id))),
                    images:review_images(id, storage_path)
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

            const rawBuilding = Array.isArray(reviewData.building) ? reviewData.building[0] : reviewData.building;
            const formattedBuilding = {
                ...rawBuilding,
                architects: rawBuilding.architects?.map((a: any) => a.architect) || []
            };

            const images = (reviewData.images || []).map((img: any) => ({
                id: img.id,
                url: getBuildingImageUrl(img.storage_path)
            })).filter((img: any) => img.url);

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
                building: formattedBuilding,
                images,
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

  const isBucketList = review?.status === 'pending';
  const isReviewOwner = user?.id === review?.user_id;

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

  const formatDate = (date: string) => formatDistanceToNow(new Date(date), { addSuffix: true }).replace(/^about /, "");

  return (
    <AppLayout title="Visit Log" showBack>
        <MetaHead
            title={`${review.user.username} - ${review.building.name}`}
            description={review.content || `Check out ${review.user.username}'s visit to ${review.building.name}`}
            image={review.images.length > 0 ? review.images[0].url : undefined}
        />

        <div className="container max-w-5xl mx-auto px-4 py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                
                {/* --- Left/Center Column: Review Content --- */}
                <div className="md:col-span-2 space-y-6">
                    
                    {/* Header Card */}
                    <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
                        <CardHeader className="p-4 pb-0">
                             <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <Link to={`/profile/${review.user.username || review.user_id}`}>
                                        <Avatar className="h-10 w-10 border border-border">
                                            <AvatarImage src={review.user.avatar_url || undefined} />
                                            <AvatarFallback>{review.user.username?.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                    </Link>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Link to={`/profile/${review.user.username || review.user_id}`} className="font-semibold text-foreground hover:underline">
                                                {review.user.username}
                                            </Link>
                                            {isBucketList ? (
                                                <Badge variant="outline" className="text-xs font-normal text-muted-foreground border-blue-500/30 text-blue-500">
                                                    Wants to visit
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                                                    Visited
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                            {formatDate(review.created_at)}
                                        </div>
                                    </div>
                                </div>

                                {/* Rating */}
                                {!isBucketList && review.rating && (
                                     <div className="flex gap-0.5">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <Star
                                                key={i}
                                                className={cn(
                                                    "h-4 w-4",
                                                    i < review.rating!
                                                        ? "fill-yellow-500 text-yellow-500"
                                                        : "fill-transparent text-muted-foreground/20"
                                                )}
                                            />
                                        ))}
                                    </div>
                                )}
                             </div>
                        </CardHeader>

                        <CardContent className="p-4 space-y-4">

                            {/* Text Content */}
                            {review.content && (
                                <div className="text-base text-foreground leading-relaxed">
                                    <p className="whitespace-pre-line">{review.content}</p>
                                </div>
                            )}

                            {/* Review Images */}
                            {review.images.length > 0 && (
                                <div className="space-y-4">
                                    {review.images.map((img) => (
                                        <div key={img.id} className="rounded-lg overflow-hidden border border-border bg-black/5">
                                            <div className="aspect-[4/3] relative">
                                                <img
                                                    src={img.url}
                                                    alt="Review attachment"
                                                    className="absolute inset-0 w-full h-full object-contain"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Tags */}
                            {review.tags && review.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {review.tags.map(tag => (
                                        <Badge key={tag} variant="secondary" className="font-normal text-xs">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            )}

                            {/* Interaction Bar */}
                            <div className="flex items-center gap-4 pt-2 border-t border-border/50">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        "gap-2 px-2 h-8 text-muted-foreground hover:text-foreground",
                                        review.is_liked && "text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                    )}
                                    onClick={handleLikeReview}
                                >
                                    <Heart className={cn("h-4 w-4", review.is_liked && "fill-current")} />
                                    <span className="text-xs">{review.likes_count > 0 ? review.likes_count : "Like"}</span>
                                </Button>

                                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                    <MessageCircle className="h-4 w-4" />
                                    <span>{comments.length} Comments</span>
                                </div>

                                <div className="flex-1" />

                                {isReviewOwner && (
                                    <div className="flex gap-1">
                                         <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                            onClick={() => navigate(`/post?id=${review.building_id}&title=${encodeURIComponent(review.building.name)}`)}
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                            onClick={handleDeleteReview}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>

                             {/* Likes Facepile */}
                            {likers.length > 0 && (
                                <div className="pt-1">
                                    <button
                                        onClick={() => setShowLikesDialog(true)}
                                        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group text-left"
                                    >
                                        <div className="flex -space-x-1.5">
                                            {likers.slice(0, 3).map((liker) => (
                                                <Avatar key={liker.user_id} className="h-5 w-5 border border-background ring-1 ring-background">
                                                    <AvatarImage src={liker.user.avatar_url || undefined} />
                                                    <AvatarFallback className="text-[6px]">{liker.user.username?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                            ))}
                                        </div>
                                        <span>
                                            Liked by <span className="font-medium text-foreground">{likers[0].user.username}</span>
                                            {likers.length > 1 && (
                                                <> and <span className="font-medium text-foreground">{likers.length - 1} other{likers.length > 2 ? 's' : ''}</span></>
                                            )}
                                        </span>
                                    </button>
                                </div>
                            )}

                        </CardContent>
                    </Card>

                    {/* Comments Section */}
                    <div className="space-y-4 pl-0 md:pl-2">
                         <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Comments</h3>
                         {comments.map((comment) => (
                             <div key={comment.id} className="flex gap-3 group">
                                <Link to={`/profile/${comment.user_id}`}>
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={comment.user.avatar_url || undefined} />
                                        <AvatarFallback>{comment.user.username?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                </Link>
                                <div className="flex-1 space-y-1">
                                    <div className="bg-card/50 border border-border/50 rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <Link to={`/profile/${comment.user_id}`} className="text-sm font-semibold hover:underline">
                                                {comment.user.username}
                                            </Link>
                                            <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(comment.created_at))} ago</span>
                                        </div>
                                        <p className="text-sm">{comment.content}</p>
                                    </div>

                                    <div className="flex items-center gap-4 pl-1">
                                        <button
                                            onClick={() => handleLikeComment(comment.id)}
                                            className={cn(
                                                "text-xs flex items-center gap-1.5 transition-colors hover:text-foreground",
                                                comment.is_liked ? "text-red-500" : "text-muted-foreground"
                                            )}
                                        >
                                            <Heart className={cn("h-3 w-3", comment.is_liked && "fill-current")} />
                                            {comment.likes_count > 0 && comment.likes_count}
                                        </button>

                                        {(isReviewOwner || user?.id === comment.user_id) && (
                                            <button
                                                onClick={() => handleDeleteComment(comment.id)}
                                                className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1.5 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                             </div>
                         ))}
                    </div>

                    {/* Comment Input */}
                    <div className="flex gap-3 items-start pt-4 border-t border-border/50 sticky bottom-0 bg-background/95 backdrop-blur-sm p-4 -mx-4 md:static md:bg-transparent md:p-0">
                         <Avatar className="h-8 w-8">
                            <AvatarImage src={user?.user_metadata?.avatar_url || undefined} />
                            <AvatarFallback>{user?.email?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 flex gap-2">
                             <Textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Write a comment..."
                                className="min-h-[40px] h-[40px] py-2 resize-none"
                            />
                            <Button
                                size="icon"
                                onClick={handlePostComment}
                                disabled={submitting || !newComment.trim()}
                                className="h-10 w-10 shrink-0"
                            >
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>

                </div>

                {/* --- Right Column: Sidebar --- */}
                <div className="md:col-span-1 space-y-6">

                    {/* Building Card */}
                    <Card className="overflow-hidden border-border/50 shadow-sm">
                        <div className="aspect-[4/3] bg-muted relative group cursor-pointer" onClick={() => navigate(`/building/${review.building_id}`)}>
                             {review.building.main_image_url ? (
                                <img
                                    src={getBuildingImageUrl(review.building.main_image_url)}
                                    alt={review.building.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                             ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-secondary/50">
                                    <Building2 className="h-10 w-10 opacity-20" />
                                </div>
                             )}
                             <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                             <div className="absolute bottom-3 left-3 right-3 text-white">
                                 <h3 className="font-bold text-lg leading-tight shadow-sm">{review.building.name}</h3>
                             </div>
                        </div>
                        <CardContent className="p-4 space-y-4">
                            <div className="space-y-2 text-sm">
                                {review.building.address && (
                                    <div className="flex items-start gap-2 text-muted-foreground">
                                        <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                                        <span>{review.building.address}</span>
                                    </div>
                                )}
                                {review.building.year_completed && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Calendar className="h-4 w-4 shrink-0" />
                                        <span>{review.building.year_completed}</span>
                                    </div>
                                )}
                                {review.building.architects && review.building.architects.length > 0 && (
                                    <div className="flex flex-wrap gap-1 pt-1">
                                        {review.building.architects.map(arch => (
                                             <Badge key={arch.id} variant="secondary" className="text-xs bg-secondary/50 hover:bg-secondary">
                                                 {arch.name}
                                             </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <Button className="w-full" variant="outline" onClick={() => navigate(`/building/${review.building_id}`)}>
                                View Building Details
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Also Visited By */}
                    {relatedReviews.length > 0 && (
                        <div className="bg-card/30 rounded-lg p-4 border border-border/50">
                            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3 tracking-wider">Also visited by</h4>
                            <div className="flex flex-wrap gap-2">
                                {relatedReviews.map(r => (
                                    <Link key={r.id} to={`/profile/${r.user.username}`}>
                                         <Avatar className="h-8 w-8 ring-2 ring-background hover:ring-primary transition-all cursor-pointer">
                                            <AvatarImage src={r.user.avatar_url || undefined} />
                                            <AvatarFallback>{r.user.username?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                    </Link>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                + {relatedReviews.length} others from the community
                            </p>
                        </div>
                    )}

                    {/* Resources/Links */}
                    {links.length > 0 && (
                         <div className="space-y-3">
                            <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Linked Resources</h4>
                            <div className="grid gap-2">
                                {links.map(link => {
                                    let domain = "";
                                    try { domain = new URL(link.url).hostname; } catch {}
                                    return (
                                        <div key={link.id} className="flex items-center justify-between p-2 rounded-md bg-card border border-border/50 hover:border-border transition-colors group">
                                            <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 min-w-0 flex-1">
                                                <div className="h-8 w-8 rounded bg-secondary/50 flex items-center justify-center shrink-0">
                                                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium truncate">{link.title || domain}</p>
                                                    <p className="text-xs text-muted-foreground truncate">{domain}</p>
                                                </div>
                                            </a>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={cn("h-8 w-8 text-muted-foreground", link.is_liked && "text-red-500")}
                                                onClick={() => handleLikeLink(link.id)}
                                            >
                                                <Heart className={cn("h-4 w-4", link.is_liked && "fill-current")} />
                                            </Button>
                                        </div>
                                    )
                                })}
                            </div>
                         </div>
                    )}

                </div>
            </div>
        </div>

        <Dialog open={showLikesDialog} onOpenChange={setShowLikesDialog}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Liked by</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh]">
                    <div className="space-y-4 py-2">
                        {likers.map((liker) => (
                            <Link 
                                key={liker.user_id}
                                to={`/profile/${liker.user.username}`}
                                onClick={() => setShowLikesDialog(false)}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                            >
                                <Avatar className="h-10 w-10">
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
    </AppLayout>
  );
}
