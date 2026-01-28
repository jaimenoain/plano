import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogClose, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Send, X, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  };
}

interface ImageDetailsDialogProps {
  imageId: string | null;
  initialUrl: string | null;
  isOpen: boolean;
  onClose: () => void;
  canInteract?: boolean;
  uploadedBy?: {
    username: string | null;
    avatar_url: string | null;
  } | null;
  uploadDate?: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ImageDetailsDialog({
  imageId,
  initialUrl,
  isOpen,
  onClose,
  canInteract = true,
  uploadedBy,
  uploadDate
}: ImageDetailsDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const commentEndRef = useRef<HTMLDivElement>(null);

  const isValidUuid = imageId && UUID_REGEX.test(imageId);
  const isInteractive = canInteract && isValidUuid;

  // Reset state when dialog opens with a new image
  useEffect(() => {
    if (isOpen && isInteractive) {
      fetchImageDetails();
    } else {
        // Reset for non-interactive images
        setComments([]);
        setLikesCount(0);
        setIsLiked(false);
    }
  }, [isOpen, imageId, isInteractive]);

  const fetchImageDetails = async () => {
    if (!imageId) return;
    setIsLoading(true);

    try {
      // 1. Fetch Comments
      const { data: commentsData, error: commentsError } = await supabase
        .from("image_comments")
        .select(`
          id, content, created_at,
          user:profiles(id, username, avatar_url)
        `)
        .eq("image_id", imageId)
        .order("created_at", { ascending: true });

      if (commentsError) throw commentsError;

      // Transform data to match Comment interface
      const formattedComments = commentsData.map((c) => ({
        id: c.id,
        content: c.content,
        created_at: c.created_at,
        user: c.user as unknown as Comment['user']
      }));

      setComments(formattedComments);

      // 2. Fetch Likes Count & User Like Status
      const { data: imageData, error: imageError } = await supabase
        .from("review_images")
        .select("likes_count")
        .eq("id", imageId)
        .single();

      if (imageError) throw imageError;
      setLikesCount(imageData.likes_count || 0);

      if (user) {
        const { data: likeData } = await supabase
          .from("image_likes")
          .select("id")
          .eq("image_id", imageId)
          .eq("user_id", user.id)
          .maybeSingle();

        setIsLiked(!!likeData);
      }

    } catch (error) {
      console.error("Error fetching image details:", error);
    } finally {
      setIsLoading(false);
      // Scroll to bottom of comments
      setTimeout(() => commentEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const handleLike = async () => {
    if (!user || !imageId || !isInteractive) return;

    // Optimistic update
    const previousIsLiked = isLiked;
    const previousLikesCount = likesCount;

    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);

    try {
      if (previousIsLiked) {
        // Unlike
        const { error } = await supabase
          .from("image_likes")
          .delete()
          .eq("image_id", imageId)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from("image_likes")
          .insert({
            image_id: imageId,
            user_id: user.id
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      // Revert optimistic update
      setIsLiked(previousIsLiked);
      setLikesCount(previousLikesCount);
      toast({ variant: "destructive", title: "Failed to update like" });
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !imageId || !newComment.trim() || !isInteractive) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("image_comments")
        .insert({
          image_id: imageId,
          user_id: user.id,
          content: newComment.trim()
        })
        .select(`
          id, content, created_at,
          user:profiles(id, username, avatar_url)
        `)
        .single();

      if (error) throw error;

      // Add new comment to list
      const newCommentObj = {
        id: data.id,
        content: data.content,
        created_at: data.created_at,
        user: data.user as unknown as Comment['user']
      };

      setComments([...comments, newCommentObj]);
      setNewComment("");

      // Scroll to bottom
      setTimeout(() => commentEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

    } catch (error) {
      console.error("Error adding comment:", error);
      toast({ variant: "destructive", title: "Failed to post comment" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("image_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      setComments(comments.filter(c => c.id !== commentId));
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast({ variant: "destructive", title: "Failed to delete comment" });
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        hideCloseButton
        className="max-w-5xl h-[90vh] p-0 overflow-hidden flex flex-col md:flex-row gap-0 border-none bg-background sm:rounded-lg"
      >
        {/* Hidden titles for accessibility */}
        <DialogTitle className="sr-only">Image Details</DialogTitle>
        <DialogDescription className="sr-only">View full size image and comments</DialogDescription>

        {/* Close Button - absolute */}
        <DialogClose className="absolute right-4 top-4 z-50 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 focus:outline-none md:hidden">
          <X className="h-4 w-4" />
        </DialogClose>

        {/* LEFT: Image Area */}
        <div className="flex-1 bg-black flex items-center justify-center relative min-h-[40vh]">
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <img
              src={initialUrl || ""}
              alt="Expanded view"
              className="max-h-full max-w-full object-contain"
            />
          </div>
        </div>

        {/* RIGHT: Sidebar (Comments & Actions) */}
        {isInteractive && (
          <div className="w-full md:w-[400px] flex flex-col bg-background border-l border-border h-[50vh] md:h-full">

            {/* Header: User Info */}
            <div className="p-4 border-b flex items-center justify-between shrink-0">
                 <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                        <AvatarImage src={uploadedBy?.avatar_url || undefined} />
                        <AvatarFallback>{uploadedBy?.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold">{uploadedBy?.username || "Unknown"}</span>
                        {uploadDate && <span className="text-xs text-muted-foreground">{format(new Date(uploadDate), 'MMMM d, yyyy')}</span>}
                    </div>
                 </div>

                 <DialogClose className="hidden md:flex rounded-full hover:bg-muted p-2">
                     <X className="h-5 w-5" />
                 </DialogClose>
            </div>

            {/* Stats */}
            <div className="px-4 py-2 border-b flex items-center justify-start gap-4 shrink-0 bg-muted/20">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`flex items-center gap-1.5 px-2 ${isLiked ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground'}`}
                    onClick={handleLike}
                  >
                    <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                    <span className="font-semibold">{likesCount}</span>
                  </Button>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MessageCircle className="w-5 h-5" />
                    <span className="font-semibold">{comments.length}</span>
                  </div>
            </div>

            {/* Comments List - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  No comments yet. Be the first to say something!
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 group">
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarImage src={comment.user.avatar_url || undefined} />
                      <AvatarFallback>{comment.user.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-semibold">{comment.user.username}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90 break-words">{comment.content}</p>
                    </div>
                    {user && user.id === comment.user.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity -mt-1"
                        onClick={() => handleDeleteComment(comment.id)}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))
              )}
              <div ref={commentEndRef} />
            </div>

            {/* Footer: Add Comment */}
            <div className="p-4 border-t mt-auto bg-background shrink-0">
              <form onSubmit={handleAddComment} className="flex gap-2">
                <Input
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1"
                  disabled={isSubmitting}
                />
                <Button type="submit" size="icon" disabled={!newComment.trim() || isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </form>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
