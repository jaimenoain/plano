import { useState } from "react";
import { Heart, MessageCircle, Circle, Image as ImageIcon, Bookmark } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/utils";
import { FeedReview } from "@/types/feed";
import { getBuildingImageUrl } from "@/utils/image";
import { getBuildingUrl } from "@/utils/url";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { SuggestedContentBlock } from "./SuggestedContentBlock";
import { FollowButton } from "@/components/FollowButton";

function getCityFromAddress(address: string | null | undefined): string {
  if (!address) return "";
  const parts = address.split(',').map(p => p.trim());
  if (parts.length >= 2) {
      return parts[parts.length - 2];
  }
  return parts[0];
}

interface ReviewCardProps {
  entry: FeedReview;
  onLike?: (reviewId: string) => void;
  onImageLike?: (reviewId: string, imageId: string) => void;
  onComment?: (reviewId: string) => void;
  isDetailView?: boolean;
  hideUser?: boolean;
  hideBuildingInfo?: boolean;
  imagePosition?: 'left' | 'right';
  variant?: 'default' | 'compact';
  showCommunityImages?: boolean;
}

export function ReviewCard({ 
  entry,
  onLike,
  onImageLike,
  onComment, 
  isDetailView = false, 
  hideUser = false,
  hideBuildingInfo = false,
  imagePosition = 'left',
  variant = 'default',
  showCommunityImages = true
}: ReviewCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
   
  // FIXED: Safety Check - Prevent crash if building data is missing
  if (!entry.building) return null;

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    if (!entry.building?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from("user_buildings").upsert({
          user_id: user.id,
          building_id: entry.building.id,
          status: 'pending',
          edited_at: new Date().toISOString()
      }, { onConflict: 'user_id, building_id' });

      if (error) throw error;

      toast({ title: "Saved to your list" });
    } catch (error) {
      console.error("Save failed", error);
      toast({ variant: "destructive", title: "Failed to save" });
    } finally {
      setIsSaving(false);
    }
  };

  const posterUrl = getBuildingImageUrl(entry.building.main_image_url);

  const handleCardClick = (e: React.MouseEvent) => {
    if (isDetailView) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('.video-container')) return;

    if (entry.building.id) {
        navigate(getBuildingUrl(entry.building.id, entry.building.slug, entry.building.short_id));
    } else {
        navigate(`/review/${entry.id}`);
    }
  };

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onComment) {
        onComment(entry.id);
    } else {
        if (entry.building.id) {
            navigate(getBuildingUrl(entry.building.id, entry.building.slug, entry.building.short_id));
        } else {
            navigate(`/review/${entry.id}`);
        }
    }
  };

  // Safe user access
  const username = entry.user?.username || "Unknown User";
  const avatarUrl = entry.user?.avatar_url || undefined;
  const userInitial = username.charAt(0).toUpperCase();

  // Title Logic
  const mainTitle = entry.building.name;

  // Metadata Logic: Architect • Year, fallback to Address
  const architects = entry.building.architects;
  const year_completed = entry.building.year_completed;

  // Helper to extract names from potentially mixed type
  const architectNames = architects ? architects.map((a: any) => typeof a === 'string' ? a : a.name) : [];

  let subTitle = entry.building.address;

  if (variant === 'compact') {
      const parts = [];
      if (architectNames.length > 0) {
          parts.push(architectNames.slice(0, 2).join(", "));
      }
      if (year_completed) {
          parts.push(year_completed);
      }

      if (parts.length > 0) {
          subTitle = parts.join(" • ");
      } else {
          subTitle = entry.building.address;
      }
  } else {
      const architectsList = architectNames.slice(0, 2).join(", ");

      if (architectsList) {
          subTitle = architectsList;
          if (year_completed) {
              subTitle += ` • ${year_completed}`;
          }
      } else if (year_completed) {
          subTitle = `${year_completed}`;
          if (entry.building.address) {
              subTitle += ` • ${entry.building.address}`;
          }
      }
  }

  // Construct Mixed Media List
  interface MediaItem {
    id: string;
    type: 'video' | 'image';
    url: string;
    poster?: string;
  }

  const mediaItems: MediaItem[] = [];
  
  // 1. Video (First priority)
  if (entry.video_url) {
      mediaItems.push({
          id: `video-${entry.id}`,
          type: 'video',
          url: entry.video_url,
          poster: (entry.images && entry.images.length > 0) ? entry.images[0].url : posterUrl || undefined
      });
  }

  // 2. Images
  if (entry.images && entry.images.length > 0) {
      entry.images.forEach(img => {
          mediaItems.push({
              id: img.id,
              type: 'image',
              url: img.url
          });
      });
  }

  const hasMedia = !hideBuildingInfo && (mediaItems.length > 0 || !!posterUrl);
  const isCompact = variant === 'compact';

  const flexDirection = imagePosition === 'right' ? 'md:flex-row' : 'md:flex-row-reverse';

  // --- 1. DETAIL VIEW (List View) ---
  if (isDetailView) {
    return (
      <article className="px-4 py-4 hairline">
        {!hideUser ? (
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-secondary text-foreground text-sm">
                {userInitial}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {username}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(entry.edited_at || entry.created_at), { addSuffix: true }).replace("about ", "")}
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-3">
             <p className="text-xs text-muted-foreground">
               {formatDistanceToNow(new Date(entry.edited_at || entry.created_at), { addSuffix: true }).replace("about ", "")}
             </p>
          </div>
        )}

        <div className="flex gap-3">
          {!hideBuildingInfo && (
            mediaItems.length > 0 && mediaItems[0].type === 'video' ? (
                <div className="w-32 h-24 bg-black rounded-sm flex-shrink-0 video-container">
                    <VideoPlayer
                        src={mediaItems[0].url}
                        poster={mediaItems[0].poster}
                        className="w-full h-full"
                        autoPlayOnVisible={false}
                        muted={true}
                        objectFit="cover"
                    />
                </div>
            ) : mediaItems.length > 0 ? (
                <img
                    src={mediaItems[0].url}
                    alt={entry.building.name}
                    className="w-32 h-24 object-cover rounded-sm flex-shrink-0"
                />
            ) : posterUrl ? (
              <img
                src={posterUrl}
                alt={entry.building.name}
                className="w-32 h-24 object-cover rounded-sm flex-shrink-0"
              />
            ) : (
              <div className="w-32 h-24 bg-secondary rounded-sm flex-shrink-0 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">No image</span>
              </div>
            )
          )}

          <div className="flex-1 min-w-0">
            {!hideBuildingInfo && (
              <div className="mb-2">
                <h3 className="text-base font-semibold text-foreground truncate">
                  {mainTitle}
                </h3>
                {subTitle && (
                  <p className="text-xs text-muted-foreground truncate">{subTitle}</p>
                )}
              </div>
            )}
             
            {entry.rating && (
              <div className="flex items-center gap-1 mb-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Circle
                    key={i}
                    className={`w-3 h-3 ${
                      i < entry.rating!
                        ? "fill-[#595959] text-[#595959]"
                        : "fill-transparent text-muted-foreground/20"
                    }`}
                  />
                ))}
              </div>
            )}

            {entry.content && (
              <p className="text-sm text-muted-foreground mb-2 break-words">
                {entry.content}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 mt-3 pt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike?.(entry.id);
              window.dispatchEvent(new CustomEvent('pwa-interaction'));
            }}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
          >
            <Heart
              className={`h-4 w-4 ${
                entry.is_liked ? "fill-primary text-primary" : ""
              }`}
            />
            <span className="text-xs">{entry.likes_count}</span>
          </button>
          <button
            onClick={handleCommentClick}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs">{entry.comments_count}</span>
          </button>
        </div>
      </article>
    );
  }

  // Define components for render
  const city = getCityFromAddress(entry.building.address);
  const action = entry.status === 'pending' ? 'saved' : 'visited';

  const Header = !hideUser && (
        <div className={`p-3 md:p-4 flex items-center gap-3 border-b border-border/40`}>
          <Avatar className="h-10 w-10 border border-border/50 shrink-0">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback>{userInitial}</AvatarFallback>
          </Avatar>
          <div className="text-sm md:text-base text-foreground leading-snug min-w-0 max-w-full flex-1 break-words">
            <div className="flex flex-col gap-0.5 md:block">
                {/* Row 1: User + Follow */}
                <div className="flex items-center gap-2 min-w-0 md:inline md:gap-0">
                    <span className="font-semibold truncate md:text-clip">{username}</span>
                    {entry.is_suggested && entry.user_id && (
                      <span className="md:inline-block md:ml-2">
                          <FollowButton
                            userId={entry.user_id}
                            hideIfFollowing
                            className="h-5 text-[10px] px-2"
                            variant="secondary"
                          />
                      </span>
                    )}
                </div>

                {/* Row 2: Action + Building */}
                <div className="flex items-center gap-1 min-w-0 md:inline md:gap-0">
                    <span className="text-muted-foreground/60 font-normal md:ml-1 shrink-0"> {action} </span>
                    <span className="font-semibold text-foreground truncate block md:inline md:w-auto md:max-w-none min-w-0 flex-1 md:flex-none">{mainTitle}</span>
                    {city && <span className="text-muted-foreground hidden md:inline"> in {city}</span>}
                </div>

                {/* Row 3: Rating + Time */}
                <div className="flex items-center gap-1 min-w-0 md:inline md:gap-0">
                    {entry.rating && entry.rating > 0 && (
                         <span className="inline-flex items-center gap-0.5 align-middle md:ml-2 shrink-0">
                             {Array.from({ length: 3 }).map((_, i) => (
                                <Circle
                                   key={i}
                                   className={`w-3.5 h-3.5 ${i < entry.rating! ? "fill-[#595959] text-[#595959]" : "fill-transparent text-muted-foreground/30"}`}
                                />
                             ))}
                         </span>
                    )}
                    <span className="text-muted-foreground text-xs md:ml-2 shrink min-w-0 truncate">
                      {!(entry.rating && entry.rating > 0) && <span className="hidden md:inline">• </span>}
                      {formatDistanceToNow(new Date(entry.edited_at || entry.created_at)).replace("about ", "")} ago
                    </span>
                </div>
            </div>
          </div>
        </div>
  );

  const Media = !hideBuildingInfo && (
        mediaItems.length > 0 ? (
          isCompact && mediaItems.length > 1 ? (
             // COMPACT GRID LAYOUT for MEDIA
             <div className={`relative w-full max-w-full min-w-0 aspect-[4/3] bg-secondary overflow-hidden grid grid-cols-2 gap-0.5`}>
                {mediaItems.slice(0, 4).map((item, index) => (
                    <div key={item.id} className="relative w-full h-full min-w-0 overflow-hidden">
                       <div className="absolute inset-0 w-full h-full">
                         {item.type === 'video' ? (
                            <div className="w-full h-full video-container">
                               <VideoPlayer
                                  src={item.url}
                                  poster={item.poster}
                                  className="w-full h-full"
                                  autoPlayOnVisible={true}
                                  muted={true}
                                  objectFit="cover"
                               />
                            </div>
                         ) : (
                             !failedImages.has(item.id) ? (
                                 <img
                                   src={item.url}
                                   alt="Review photo"
                                   className="w-full h-full object-cover"
                                   onError={() => setFailedImages(prev => new Set(prev).add(item.id))}
                                 />
                             ) : (
                                 <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-secondary/50">
                                   <ImageIcon className="w-4 h-4 opacity-50" />
                                 </div>
                             )
                         )}
                       </div>

                       {/* Overlay for 4th item if more */}
                       {index === 3 && mediaItems.length > 4 && (
                           <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
                               <span className="text-white font-bold text-sm">+{mediaItems.length - 3}</span>
                           </div>
                       )}
                    </div>
                ))}
             </div>
          ) : (
            // OPTION A: Media Gallery (Carousel)
            <div className={`relative w-full max-w-full min-w-0 overflow-hidden bg-secondary ${!isCompact ? 'md:w-[280px] md:shrink-0' : 'aspect-[4/3]'}`}>
               <div className={`flex w-full overflow-x-auto snap-x snap-mandatory no-scrollbar h-full ${!isCompact ? 'md:absolute md:inset-0' : ''}`}>
                  {mediaItems.map((item) => (
                    <div key={item.id} className={`relative flex-none w-full aspect-[4/3] ${!isCompact ? 'md:aspect-auto md:h-full' : ''} snap-center bg-secondary min-w-0 overflow-hidden`}>
                       <div className="absolute inset-0 w-full h-full">
                         {item.type === 'video' ? (
                             <div className="w-full h-full video-container">
                                 <VideoPlayer
                                     src={item.url}
                                     poster={item.poster}
                                     className="w-full h-full"
                                     autoPlayOnVisible={true}
                                     muted={true}
                                     objectFit="cover"
                                 />
                             </div>
                         ) : (
                             !failedImages.has(item.id) ? (
                               <img
                                 src={item.url}
                                 alt="Review photo"
                                 className="w-full h-full object-cover"
                                 onError={() => setFailedImages(prev => new Set(prev).add(item.id))}
                               />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                 <ImageIcon className="w-8 h-8 opacity-50" />
                               </div>
                             )
                         )}
                       </div>
                    </div>
                  ))}
               </div>
               {/* Pagination Dots (if multiple) */}
               {mediaItems.length > 1 && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10 pointer-events-none">
                     {mediaItems.map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/50" />
                     ))}
                  </div>
               )}
            </div>
          )
        ) : (posterUrl && showCommunityImages) ? (
          // OPTION B: Building Poster (Fallback)
          <div className={`relative w-full max-w-full min-w-0 bg-secondary overflow-hidden aspect-[4/3] ${!isCompact ? 'md:aspect-auto md:w-[280px] md:shrink-0' : ''}`}>
            <img
              src={posterUrl}
              alt={mainTitle || ""}
              className={`w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105 ${!isCompact ? 'md:absolute md:inset-0' : ''}`}
            />
          </div>
        ) : null
  );

  const ContentBody = isCompact ? (
      <>
        {/* Building Name (Context) - Only if NOT hidden */}
        {!hideBuildingInfo && (
          <div className="mb-1">
            <h3 className="text-base font-bold text-foreground line-clamp-2 leading-tight">
              {mainTitle}
            </h3>
            {subTitle && (
              <p className="text-xs text-muted-foreground line-clamp-1 truncate">
                {subTitle}
              </p>
            )}
          </div>
        )}

        {/* Review Text: Only show if exists */}
        {entry.content && (
           <p className="text-sm font-medium text-foreground line-clamp-3 leading-relaxed">
             "{entry.content}"
           </p>
        )}
      </>
  ) : (
      <>
        {entry.content && (
           <p className="text-sm text-foreground mb-2 leading-relaxed break-words">
             {entry.content}
           </p>
        )}
      </>
  );

  const Footer = (
        <div className={`flex w-full max-w-full min-w-0 items-center gap-2 md:gap-4 flex-wrap ${isCompact ? 'p-2.5 md:p-4 pt-3 mt-auto border-t border-border/50' : 'mt-auto pt-3 border-t border-border/50'}`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike?.(entry.id);
              // Trigger PWA interaction check on like
              window.dispatchEvent(new CustomEvent('pwa-interaction'));
            }}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors group/like"
          >
            <Heart
              className={`h-4 w-4 transition-transform group-hover/like:scale-110 ${
                entry.is_liked ? "fill-primary text-primary" : ""
              }`}
            />
            <span className="text-xs font-medium">{entry.likes_count}</span>
          </button>
           
          <button
            onClick={handleCommentClick}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors group/comment"
          >
            <MessageCircle className="h-4 w-4 transition-transform group-hover/comment:scale-110" />
            <span className="text-xs font-medium">{entry.comments_count}</span>
          </button>

          {!isCompact && (
             <button
               onClick={handleSave}
               className={`flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors ml-auto ${isSaving ? 'opacity-50' : ''}`}
               disabled={isSaving}
             >
               <Bookmark className="h-4 w-4" />
               <span className="text-xs font-medium">Save</span>
             </button>
          )}
        </div>
  );

  return (
    <SuggestedContentBlock
      isSuggested={entry.is_suggested}
      suggestionReason={entry.suggestion_reason}
    >
      <article
        onClick={handleCardClick}
        // MERGE FIX: Check hasMedia instead of just posterUrl to support gallery-only layouts
        className={`group/card relative flex flex-col ${!isCompact && hasMedia ? `${flexDirection} md:min-h-[220px]` : ''} h-full bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer min-w-0 w-full max-w-full`}
      >
        {isCompact ? (
          // COMPACT LAYOUT: Header -> Text -> Media -> Footer
          <>
              {Header}
              <div className={`flex flex-col flex-1 min-w-0 p-2.5 md:p-4 md:pt-3 gap-2`}>
                  {ContentBody}
              </div>
              {Media}
              {Footer}
          </>
        ) : (
          // DEFAULT LAYOUT: Header -> Media -> (Text + Footer)
          <>
              <div className="flex flex-col flex-1 min-w-0">
                 {Header}
                 <div className="flex flex-col flex-1 p-2.5 md:p-4 md:pt-3 gap-2">
                     {ContentBody}
                     {Footer}
                 </div>
              </div>
              {Media}
          </>
        )}
      </article>
    </SuggestedContentBlock>
  );
}
