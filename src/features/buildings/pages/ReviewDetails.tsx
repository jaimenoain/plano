import { useEffect, useState } from "react";
import { useParams, useNavigate, Link, type MetaFunction } from "react-router";
import { Loader2, Trash2, Heart, Circle, MessageCircle, Pencil, MapPin, Send, ExternalLink, Calendar, Building2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import NotFound from "@/pages/NotFound";
import { getBuildingImageUrl } from "@/utils/image";
import { getBuildingUrl } from "@/utils/url";
import { ImageDetailsDialog } from "../components/ImageDetailsDialog";
import {
  visibleCreditSummariesFromEmbed,
  type BuildingCreditEmbed,
} from "@/features/credits/api/credits";
import { reviewLoader } from "./ReviewDetails.loader";

export { reviewLoader as loader };

export const meta: MetaFunction<typeof reviewLoader> = ({ data }) => {
  if (!data) return [{ title: "Plano" }];
  const title = `${data.username} - ${data.buildingName}`;
  const { description, ogImage, canonical, contentLength, imageCount, createdAt, username } = data;

  const isThinContent = contentLength < 50 && imageCount === 0;

  const tags: ReturnType<MetaFunction> = [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: ogImage },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:type", content: "article" },
    { property: "og:url", content: canonical },
    ...(createdAt ? [{ property: "article:published_time", content: createdAt }] : []),
    { property: "article:author", content: `https://plano.app/profile/${username}` },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImage },
    { tagName: "link", rel: "canonical", href: canonical },
  ];

  if (isThinContent) {
    tags.push({ name: "robots", content: "noindex, follow" });
  }

  return tags;
};

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
    creditedEntities: { id: string; name: string }[] | null;
  };
  images: { id: string; url: string; is_generated?: boolean; caption?: string | null }[];
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
  title: string | null;
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
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

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
                .from("building_posts")
                .select(`
                    id, body, tags, created_at, user_id, building_id,
                    user:profiles!building_posts_user_id_fkey(username, avatar_url),
                    building:buildings(id, short_id, slug, name, year_completed, address, hero_image_url, building_credits(status, credit_tier, person:people(id, name), company:companies(id, name))),
                    images:review_images(id, storage_path, is_generated, caption)
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

            // 1b. Fetch rating/status from user_buildings
            const { data: ubData } = await supabase
                .from("user_buildings")
                .select("rating, status")
                .eq("user_id", reviewData.user_id)
                .eq("building_id", reviewData.building_id)
                .maybeSingle();

            // 2. Fetch Auxiliary Data in Parallel
            const [likesCount, commentsCount, userLike, likersData] = await Promise.all([
                supabase.from("likes").select("id", { count: "exact" }).eq("interaction_id", reviewData.id),
                supabase.from("comments").select("id", { count: "exact" }).eq("interaction_id", reviewData.id),
                user ? supabase.from("likes").select("id").eq("interaction_id", reviewData.id).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
                supabase.from("likes").select("user_id, user:profiles(username, avatar_url)").eq("interaction_id", reviewData.id).order("created_at", { ascending: false }).limit(50)
            ]);

            const rawBuilding = Array.isArray(reviewData.building) ? reviewData.building[0] : reviewData.building;
            const rb = rawBuilding as {
              id: string;
              name: string;
              year_completed: number | null;
              address: string | null;
              hero_image_url: string | null;
              building_credits?: BuildingCreditEmbed[] | null;
            };
            const formattedBuilding = {
              id: rb.id,
              name: rb.name,
              year_completed: rb.year_completed,
              address: rb.address,
              main_image_url: rb.hero_image_url ?? null,
              creditedEntities: visibleCreditSummariesFromEmbed(rb.building_credits),
            };

            const images: { id: string; url: string; is_generated?: boolean; caption?: string | null }[] = [];
            for (const img of reviewData.images || []) {
                const row = img as { id: string; storage_path: string; is_generated?: boolean; caption?: string | null };
                const url = getBuildingImageUrl(row.storage_path);
                if (url) {
                    images.push({ id: row.id, url, is_generated: row.is_generated, caption: row.caption });
                }
            }

            setReview({
                id: reviewData.id,
                content: reviewData.body,
                rating: ubData?.rating ?? null,
                tags: reviewData.tags,
                created_at: reviewData.created_at ?? "",
                user_id: reviewData.user_id,
                building_id: reviewData.building_id,
                status: ubData?.status ?? "visited",
                user: Array.isArray(reviewData.user) ? reviewData.user[0] : reviewData.user,
                building: formattedBuilding,
                images,
                likes_count: likesCount.count || 0,
                comments_count: commentsCount.count || 0,
                is_liked: !!userLike.data,
            });

            if (likersData.data) {
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

                let relatedData: { id: string; rating: number | null; user: unknown }[] = [];

                // Try to find friends first
                if (followingIds.length > 0) {
                    const { data: friendsData } = await supabase
                        .from("building_posts")
                        .select(`
                            id, user_id, building_id,
                            user:profiles!building_posts_user_id_fkey(username, avatar_url)
                        `)
                        .eq("building_id", reviewData.building_id)
                        .in("user_id", followingIds)
                        .neq("id", reviewData.id)
                        .limit(15);

                    if (friendsData && friendsData.length > 0) {
                        // Get ratings from user_buildings
                        const userIds = [...new Set(friendsData.map(r => r.user_id))];
                        const { data: ratingsData } = await supabase
                            .from("user_buildings")
                            .select("user_id, rating, status")
                            .eq("building_id", reviewData.building_id)
                            .in("user_id", userIds)
                            .eq("status", "visited");
                        const ratingMap = new Map(ratingsData?.map(r => [r.user_id, r.rating]) ?? []);
                        relatedData = friendsData.map(r => ({ ...r, rating: ratingMap.get(r.user_id) ?? null }));
                    }
                }

                // Fallback to community
                if (relatedData.length === 0) {
                    let bpQuery = supabase
                        .from("building_posts")
                        .select(`
                            id, user_id, building_id,
                            user:profiles!building_posts_user_id_fkey(username, avatar_url)
                        `)
                        .eq("building_id", reviewData.building_id)
                        .neq("id", reviewData.id)
                        .limit(15);

                    if (user) {
                        bpQuery = bpQuery.neq("user_id", user.id);
                    }

                    const { data: communityData } = await bpQuery;
                    if (communityData) {
                        const userIds = [...new Set(communityData.map(r => r.user_id))];
                        const { data: ratingsData } = await supabase
                            .from("user_buildings")
                            .select("user_id, rating, status")
                            .eq("building_id", reviewData.building_id)
                            .in("user_id", userIds)
                            .eq("status", "visited");
                        const ratingMap = new Map(ratingsData?.map(r => [r.user_id, r.rating]) ?? []);
                        relatedData = communityData.map(r => ({ ...r, rating: ratingMap.get(r.user_id) ?? null }));
                    }
                }

                if (relatedData.length > 0) {
                    const mapped = relatedData.map(r => ({
                        ...r,
                        user: Array.isArray(r.user) ? r.user[0] : r.user
                    }));

                    mapped.sort((a: { user: { avatar_url?: string | null } }, b: { user: { avatar_url?: string | null } }) => {
                        const aHasAvatar = !!a.user?.avatar_url;
                        const bHasAvatar = !!b.user?.avatar_url;
                        if (aHasAvatar === bHasAvatar) return 0;
                        return bHasAvatar ? 1 : -1;
                    });

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
            if (commentsData && commentsData.length > 0) {
                const commentIds = commentsData.map(c => c.id);
                const { data: likesData } = await supabase
                    .from("comment_likes")
                    .select("comment_id, user_id")
                    .in("comment_id", commentIds);

                formattedComments = commentsData.map(c => {
                    const relevantLikes = likesData?.filter((l: { comment_id: string; user_id: string }) => l.comment_id === c.id) || [];
                    return {
                        ...c,
                        user: Array.isArray(c.user) ? c.user[0] : c.user,
                        likes_count: relevantLikes.length,
                        is_liked: user ? relevantLikes.some((l: { user_id: string }) => l.user_id === user.id) : false
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
                const { data: allLinkLikes } = await supabase
                    .from("link_likes")
                    .select("link_id, user_id")
                    .in("link_id", linkIds);

                formattedLinks = linksData.map(l => {
                    const relevant = allLinkLikes?.filter((x: { link_id: string; user_id: string }) => x.link_id === l.id) || [];
                    return {
                        ...l,
                        likes_count: relevant.length,
                        is_liked: user ? relevant.some((x: { user_id: string }) => x.user_id === user.id) : false
                    };
                });
            }
            setLinks(formattedLinks);

        } catch (_e) {
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
         setLikers(data.map(item => ({ user_id: item.user_id, user: Array.isArray(item.user) ? item.user[0] : item.user })));
      }
    } catch (_error) {
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
            const { error } = await supabase.from("link_likes").delete().eq("link_id", linkId).eq("user_id", user.id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from("link_likes").insert({ link_id: linkId, user_id: user.id });
            if (error) throw error;
        }
    } catch (_error) {
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
            await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", user.id);
        } else {
            await supabase.from("comment_likes").insert({ comment_id: commentId, user_id: user.id });
        }
    } catch (_error) {
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
          const { data: likesData } = await supabase
            .from("comment_likes")
            .select("comment_id, user_id")
            .in("comment_id", commentIds);

          const formattedComments = commentsData.map(c => {
            const relevantLikes = likesData?.filter((l: { comment_id: string; user_id: string }) => l.comment_id === c.id) || [];
            return {
                ...c,
                user: Array.isArray(c.user) ? c.user[0] : c.user,
                likes_count: relevantLikes.length,
                is_liked: user ? relevantLikes.some((l: { user_id: string }) => l.user_id === user.id) : false
            };
          });
          setComments(formattedComments);
          setReview(prev => prev ? ({ ...prev, comments_count: prev.comments_count + 1 }) : null);
      }

      toast({ title: "Comment posted" });
    } catch (error: unknown) {
toast({ variant: "destructive", title: "Error", description: error instanceof Error ? error.message : "Could not post comment." });
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
    } catch (error: unknown) {
toast({ variant: "destructive", title: "Error", description: error instanceof Error ? error.message : "Could not delete comment." });
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
    } catch (error: unknown) {
toast({ variant: "destructive", title: "Error", description: error instanceof Error ? error.message : "Could not delete log." });
    }
  };

  const isBucketList = review?.status === 'pending';
  const isReviewOwner = user?.id === review?.user_id;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        </div>
      </AppLayout>
    );
  }

  if (notFound || !review || !review.building) return <NotFound />;

  const formatDate = (date: string) =>
    formatDistanceToNow(new Date(date), { addSuffix: true }).replace(/^about /, "");

  return (
    <>
      <AppLayout title="Visit Log" showBack>
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-4xl font-bold tracking-tight leading-tight text-text-primary mb-6">
            Visit Log
          </h1>

          <div className="space-y-8">
            {/* --- Review Content --- */}
            <div className="space-y-6">
              {/* Header Card */}
              <Card className="border-border-default/50 shadow-sm bg-surface-card/50 backdrop-blur-sm">
                <CardHeader className="p-4 pb-0">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Link to={`/profile/${review.user.username || review.user_id}`}>
                        <Avatar className="h-10 w-10 border border-border-default">
                          <AvatarImage src={review.user.avatar_url || undefined} />
                          <AvatarFallback>
                            {review.user.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/profile/${review.user.username || review.user_id}`}
                            className="font-semibold text-text-primary hover:underline"
                          >
                            {review.user.username}
                          </Link>
                          {isBucketList ? (
                            <Badge
                              variant="outline"
                              className="text-xs font-normal text-text-secondary border-border-default"
                            >
                              Wants to visit
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-xs font-normal text-text-secondary border-border-default"
                            >
                              Visited
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-text-secondary flex items-center gap-1">
                          {formatDate(review.created_at)}
                        </div>
                      </div>
                    </div>

                    {/* Rating */}
                    {!isBucketList && review.rating && (
                      <div className="flex gap-0.5">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Circle
                            key={i}
                            className={cn(
                              "h-4 w-4",
                              i < review.rating!
                                ? "fill-[#595959] text-[#595959]"
                                : "text-text-secondary/20",
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
                    <div className="text-lg md:text-xl text-text-primary/90 leading-relaxed font-normal">
                      <p className="whitespace-pre-line">{review.content}</p>
                    </div>
                  )}

                  {/* Review Images */}
                  {review.images.length > 0 && (
                    <div className="space-y-6">
                      {review.images.map((img) => (
                        <div
                          key={img.id}
                          className="rounded-none overflow-hidden cursor-pointer"
                          onClick={() => setSelectedImageId(img.id)}
                        >
                          <img
                            src={img.url}
                            alt="Review attachment"
                            className="w-full h-full block hover:opacity-95 transition-opacity"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tags */}
                  {review.tags && review.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {review.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="font-normal text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Interaction Bar */}
                  <div className="flex items-center gap-4 pt-2 border-t border-border-default/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "gap-2 px-2 h-8 text-text-secondary hover:text-text-primary",
                        review.is_liked && "text-red-500 hover:text-red-600 hover:bg-red-500/10",
                      )}
                      onClick={handleLikeReview}
                    >
                      <Heart
                        className={cn("h-4 w-4", review.is_liked && "fill-current")}
                      />
                      <span className="text-xs">
                        {review.likes_count > 0 ? review.likes_count : "Like"}
                      </span>
                    </Button>

                    <div className="flex items-center gap-2 text-text-secondary text-xs">
                      <MessageCircle className="h-4 w-4" />
                      <span>{comments.length} Comments</span>
                    </div>

                    <div className="flex-1" />

                    {isReviewOwner && (
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-text-secondary hover:text-text-primary"
                          onClick={() =>
                            navigate(
                              `/post?id=${review.building_id}&title=${encodeURIComponent(review.building.name)}`,
                            )
                          }
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-text-secondary hover:text-feedback-destructive hover:bg-feedback-destructive/10"
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
                        className="flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary transition-colors group text-left"
                      >
                        <div className="flex -space-x-1.5">
                          {likers.slice(0, 3).map((liker) => (
                            <Avatar
                              key={liker.user_id}
                              className="h-5 w-5 border border-surface-default ring-1 ring-surface-default"
                            >
                              <AvatarImage src={liker.user.avatar_url || undefined} />
                              <AvatarFallback className="text-[6px]">
                                {liker.user.username?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                        <span>
                          Liked by{" "}
                          <span className="font-medium text-text-primary">
                            {likers[0].user.username}
                          </span>
                          {likers.length > 1 && (
                            <>
                              {" "}
                              and{" "}
                              <span className="font-medium text-text-primary">
                                {likers.length - 1} other
                                {likers.length > 2 ? "s" : ""}
                              </span>
                            </>
                          )}
                        </span>
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Comments Section */}
              <div className="space-y-4 pl-0 md:pl-2">
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
                  Comments
                </h3>
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 group">
                    <Link to={`/profile/${comment.user_id}`}>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.user.avatar_url || undefined} />
                        <AvatarFallback>
                          {comment.user.username?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 space-y-1">
                      <div className="bg-surface-card/50 border border-border-default/50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <Link
                            to={`/profile/${comment.user_id}`}
                            className="text-sm font-semibold hover:underline"
                          >
                            {comment.user.username}
                          </Link>
                          <span className="text-xs text-text-secondary">
                            {formatDistanceToNow(new Date(comment.created_at))} ago
                          </span>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                      </div>

                      <div className="flex items-center gap-4 pl-1">
                        <button
                          onClick={() => handleLikeComment(comment.id)}
                          className={cn(
                            "text-xs flex items-center gap-1.5 transition-colors hover:text-text-primary",
                            comment.is_liked ? "text-red-500" : "text-text-secondary",
                          )}
                        >
                          <Heart
                            className={cn("h-3 w-3", comment.is_liked && "fill-current")}
                          />
                          {comment.likes_count > 0 && comment.likes_count}
                        </button>

                        {(isReviewOwner || user?.id === comment.user_id) && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-xs text-text-secondary hover:text-feedback-destructive flex items-center gap-1.5 transition-colors opacity-0 group-hover:opacity-100"
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
              <div className="flex gap-3 items-start pt-4 border-t border-border-default/50 sticky bottom-0 bg-surface-default/95 backdrop-blur-sm p-4 -mx-4 md:static md:bg-transparent md:p-0">
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
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Building Card */}
            <Card className="overflow-hidden border-border-default/50 shadow-sm">
              <div
                className="aspect-[4/3] bg-surface-muted relative group cursor-pointer"
                // Locality URL not available: review.building does not include locality_country_code/city_slug — requires review detail query to join localities table
                onClick={() => navigate(getBuildingUrl(review.building_id))}
              >
                {review.building.main_image_url ? (
                  <img
                    src={getBuildingImageUrl(review.building.main_image_url)}
                    alt={review.building.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-secondary bg-surface-muted/50">
                    <Building2 className="h-10 w-10 opacity-20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <h3 className="font-bold text-lg leading-tight shadow-sm">
                    {review.building.name}
                  </h3>
                </div>
              </div>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2 text-sm">
                  {review.building.address && (
                    <div className="flex items-start gap-2 text-text-secondary">
                      <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{review.building.address}</span>
                    </div>
                  )}
                  {review.building.year_completed && (
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span>{review.building.year_completed}</span>
                    </div>
                  )}
                  {review.building.creditedEntities &&
                    review.building.creditedEntities.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {review.building.creditedEntities.map((c) => (
                          <Badge
                            key={c.id}
                            variant="secondary"
                            className="text-xs bg-surface-muted/50 hover:bg-surface-muted"
                          >
                            {c.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                </div>
                <Button
                  className="w-full"
                  variant="outline"
                  // Locality URL not available: review.building does not include locality_country_code/city_slug — requires review detail query to join localities table
                  onClick={() => navigate(getBuildingUrl(review.building_id))}
                >
                  View Building Details
                </Button>
              </CardContent>
            </Card>

            {/* Also Visited By */}
            {relatedReviews.length > 0 && (
              <div className="bg-surface-card/30 rounded-lg p-4 border border-border-default/50">
                <h4 className="text-xs font-semibold uppercase text-text-secondary mb-3 tracking-wider">
                  Also visited by
                </h4>
                <div className="flex flex-wrap gap-2">
                  {relatedReviews.map((r) => (
                    <Link key={r.id} to={`/profile/${r.user.username}`}>
                      <Avatar className="h-8 w-8 ring-2 ring-surface-default hover:ring-brand-primary transition-all cursor-pointer">
                        <AvatarImage src={r.user.avatar_url || undefined} />
                        <AvatarFallback>
                          {r.user.username?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                  ))}
                </div>
                <p className="text-xs text-text-secondary mt-2">
                  + {relatedReviews.length} others from the community
                </p>
              </div>
            )}

            {/* Resources/Links */}
            {links.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase text-text-secondary tracking-wider">
                  Linked Resources
                </h4>
                <div className="grid gap-2">
                  {links.map((link) => {
                    let domain = "";
                    try {
                      domain = new URL(link.url).hostname;
                    } catch {}
                    return (
                      <div
                        key={link.id}
                        className="flex items-center justify-between p-2 rounded-md bg-surface-card border border-border-default/50 hover:border-border-default transition-colors group"
                      >
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 min-w-0 flex-1"
                        >
                          <div className="h-8 w-8 rounded bg-surface-muted/50 flex items-center justify-center shrink-0">
                            <ExternalLink className="h-4 w-4 text-text-secondary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {link.title || domain}
                            </p>
                            <p className="text-xs text-text-secondary truncate">
                              {domain}
                            </p>
                          </div>
                        </a>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-8 w-8 text-text-secondary",
                            link.is_liked && "text-red-500",
                          )}
                          onClick={() => handleLikeLink(link.id)}
                        >
                          <Heart
                            className={cn("h-4 w-4", link.is_liked && "fill-current")}
                          />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-muted transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={liker.user.avatar_url || undefined} />
                      <AvatarFallback>{liker.user.username?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="font-medium text-text-primary">
                      {liker.user.username}
                    </div>
                  </Link>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        <ImageDetailsDialog
          isOpen={!!selectedImageId}
          onClose={() => setSelectedImageId(null)}
          imageId={selectedImageId}
          initialUrl={review.images.find((img) => img.id === selectedImageId)?.url || null}
          uploadedBy={{
            username: review.user.username,
            avatar_url: review.user.avatar_url,
          }}
          uploadDate={review.created_at}
          isGenerated={
            review.images.find((img) => img.id === selectedImageId)?.is_generated
          }
          caption={review.images.find((img) => img.id === selectedImageId)?.caption}
          onNext={() => {
            const currentIndex = review.images.findIndex(
              (img) => img.id === selectedImageId,
            );
            if (currentIndex < review.images.length - 1) {
              setSelectedImageId(review.images[currentIndex + 1].id);
            }
          }}
          onPrev={() => {
            const currentIndex = review.images.findIndex(
              (img) => img.id === selectedImageId,
            );
            if (currentIndex > 0) {
              setSelectedImageId(review.images[currentIndex - 1].id);
            }
          }}
          hasNext={
            review.images.findIndex((img) => img.id === selectedImageId) <
            review.images.length - 1
          }
          hasPrev={
            review.images.findIndex((img) => img.id === selectedImageId) > 0
          }
        />
      </AppLayout>
    </>
  );
}
