import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Star, Edit, Trash2, Heart, MessageSquare, Send, Pencil, CalendarPlus, Notebook, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { RatingSpectrum } from "@/components/RatingSpectrum";
import { PersonalRatingButton } from "@/components/PersonalRatingButton";
import { SessionRatingChart } from "@/components/groups/SessionRatingChart";
import { slugify, createGoogleCalendarUrl } from "@/lib/utils";
import { GENRE_MAP } from "@/lib/constants";
import { PollCard } from "@/components/groups/polls/PollCard";

function ResourceItem({ resource }: { resource: { title: string, url: string, description?: string } }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = resource.description && resource.description.length > 120;

  return (
    <div className="flex flex-col justify-center p-3 rounded-lg border bg-card hover:border-primary/50 hover:bg-muted/50 transition-all group/resource">
      <a
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start justify-between gap-2 cursor-pointer"
      >
        <div className="font-medium text-sm group-hover/resource:text-primary transition-colors line-clamp-1">
          {resource.title || "Link"}
        </div>
        <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0 mt-1 opacity-50" />
      </a>
      {resource.description && (
        <div className="mt-0.5">
          <div className={`text-xs text-muted-foreground ${!isExpanded ? 'line-clamp-3' : ''}`}>
            {resource.description}
          </div>
          {isLong && (
            <button
              type="button"
              className="show-more-btn text-[10px] font-medium text-primary hover:underline mt-1 focus:outline-none"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface SessionCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  group: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any;
  isAdmin: boolean;
  slug: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visibleLogs: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalRankingData: any[];
  showGroupStats: boolean;
  onUpdateStats?: () => void;
  showHostNotesIcon?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  poll?: any;
}

export function SessionCard({
  session,
  group,
  user,
  isAdmin,
  slug,
  visibleLogs,
  globalRankingData,
  showGroupStats,
  onUpdateStats,
  showHostNotesIcon = true,
  poll
}: SessionCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isResourcesExpanded, setIsResourcesExpanded] = useState(false);
  const [commentsLimit, setCommentsLimit] = useState(3);
  const [commentInput, setCommentInput] = useState("");

  const sDate = new Date(session.session_date);
  const isPast = new Date() > sDate;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sessionDate = new Date(sDate);
  sessionDate.setHours(0, 0, 0, 0);
  const isAfterToday = sessionDate > today;

  const hasHistory = globalRankingData?.length > 0;

  const getVisibleBuildingStats = (buildingId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const logs = visibleLogs?.filter((l: any) => String(l.building_id) === String(buildingId)) || [];
    if (!logs.length) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const avg = logs.reduce((acc: number, val: any) => acc + val.rating, 0) / logs.length;
    return { avg, count: logs.length, logs };
  };

  // Check if any building in the session has more than 1 rating from the group
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hasEnoughRatings = session.buildings?.some((f: any) => {
    const stats = getVisibleBuildingStats(f.building.id);
    return stats && stats.count > 1;
  });


  const likers = session.likes || session.likes_data || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const commentsData = session.comments_data || session.comments_list?.sort((a: any, b: any) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  ) || [];

  const hasComments = commentsData.length > 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isLiked = session.is_liked !== undefined ? session.is_liked : likers.some((l: any) => l.user_id === user?.id);
  const likesCount = session.likes_count !== undefined ? session.likes_count : likers.length;
  const commentsCount = session.comments_count !== undefined ? session.comments_count : commentsData.length;

  const deleteSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase.from("group_sessions").delete().eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-sessions"] });
      toast({ title: "Session deleted successfully" });
    }
  });

  const toggleLikeSession = useMutation({
    mutationFn: async ({ sessionId, isLiked }: { sessionId: string, isLiked: boolean }) => {
      if (isLiked) {
        await supabase.from("session_likes").delete().eq("session_id", sessionId).eq("user_id", user?.id);
      } else {
        await supabase.from("session_likes").insert({ session_id: sessionId, user_id: user?.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["session-details", session.id] });
    }
  });

  const postComment = useMutation({
    mutationFn: async ({ sessionId, content }: { sessionId: string, content: string }) => {
      if (!user) throw new Error("You must be logged in to comment");
      const { error } = await supabase.from("session_comments").insert({
        session_id: sessionId,
        user_id: user.id,
        content: content
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["session-details", session.id] });
      setCommentInput("");
    }
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from("session_comments").delete().eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["group-sessions"] });
        queryClient.invalidateQueries({ queryKey: ["session-details", session.id] });
    }
  });

  const rateBuilding = useMutation({
    mutationFn: async ({ buildingId, rating }: { buildingId: string, rating: number }) => {
      if (!user) throw new Error("Must be logged in");
      const { data: existingLogs } = await supabase.from("user_buildings").select("id").eq("user_id", user.id).eq("building_id", buildingId);
      if (existingLogs?.[0]) {
         const { error } = await supabase.from("user_buildings").update({ rating }).eq("id", existingLogs[0].id);
         if (error) throw error;
      } else {
         const { error } = await supabase.from("user_buildings").insert({ user_id: user.id, building_id: buildingId, rating, visited_at: new Date().toISOString() });
         if (error) throw error;
      }
    },
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["group-logs-visible"] });
       if (onUpdateStats) onUpdateStats();
       toast({ title: "Rating saved" });
    }
  });

  const handleDeleteSession = (sessionId: string) => {
    if (window.confirm("Are you sure?")) deleteSession.mutate(sessionId);
  };

  const handleAddToCalendar = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buildingList = (session.buildings || []).map((f: any) =>
      `${f.is_main ? '[Main] ' : ''}${f.building.name}`
    ).join('\n');

    const sessionUrl = `${window.location.origin}/groups/${slug}/sessions/${slugify(session.title || "session")}/${session.id}`;

    const description = [
      session.description,
      '',
      'Buildings:',
      buildingList,
      '',
      `Link: ${sessionUrl}`
    ].filter(Boolean).join('\n');

    const url = createGoogleCalendarUrl({
      title: session.title || "Architecture Session",
      description,
      startTime: sDate,
    });

    window.open(url, '_blank');
  };

  return (
    <article
      className="group relative flex flex-col sm:flex-row bg-card border border-border/50 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
    >
      <div className={`
        flex sm:flex-col items-center justify-center sm:justify-start sm:pt-8 sm:w-32 p-4 sm:p-0 gap-3 sm:gap-0
        ${isPast ? "bg-muted/50 text-muted-foreground" : "bg-primary/5 text-primary"}
        border-b sm:border-b-0 sm:border-r border-border/50
      `}>
        {/* Mobile: Day + Stacked Info */}
        <div className="flex sm:hidden items-center gap-2">
            <span className="text-3xl font-black">{sDate.getDate()}</span>
            <div className="flex flex-col text-xs uppercase tracking-widest opacity-70">
                <span>{sDate.toLocaleString('default', { month: 'short' })}</span>
                <span className="font-normal normal-case">{sDate.toLocaleString('default', { weekday: 'short' })}</span>
            </div>
        </div>

        {/* Desktop: Standard Vertical */}
        <div className="hidden sm:flex flex-col items-center">
            <span className="text-xs font-bold uppercase tracking-widest opacity-70">
                {sDate.toLocaleString('default', { month: 'short' })}
            </span>
            <span className="text-3xl sm:text-4xl font-black">
                {sDate.getDate()}
            </span>
            <span className="text-xs opacity-70 sm:mt-1">
                {sDate.toLocaleString('default', { weekday: 'short' })}
            </span>
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="p-5 pb-3 flex justify-between items-start gap-4">
          <div>
            {/* Cycle Badge */}
            {session.cycle && (
                <div
                    className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                    onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/groups/${slug}/cycles/${session.cycle.id}`);
                    }}
                >
                    {session.cycle.title}
                </div>
            )}

            <div
              className="cursor-pointer hover:text-primary transition-colors flex items-center gap-2"
              onClick={() => navigate(`/groups/${slug}/sessions/${slugify(session.title || "session")}/${session.id}`)}
            >
              <h3 className="text-xl font-bold leading-tight">
                {session.title || "Movie Night"}
                {isAdmin && session.host_notes && showHostNotesIcon && (
                  <Notebook className="w-4 h-4 text-yellow-600 inline ml-2 relative -top-0.5" />
                )}
              </h3>
              {session.status === 'draft' && (
                <Badge variant="outline" className="text-xs uppercase tracking-wider border-dashed">
                  Draft
                </Badge>
              )}
            </div>
            {session.description && (
              <p className="text-muted-foreground text-sm mt-1">{session.description}</p>
            )}

            {/* Resources Section */}
            {session.resources && Array.isArray(session.resources) && session.resources.length > 0 && (
              <div className="mt-3">
                {(() => {
                  const resources = session.resources as { title: string, url: string, description?: string }[];
                  const count = resources.length;
                  const shouldShowButton = count >= 3;

                  if (shouldShowButton && !isResourcesExpanded) {
                    return (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-2"
                        onClick={() => setIsResourcesExpanded(true)}
                      >
                        <span className="font-bold text-primary">Show {count} resources</span>
                      </Button>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {resources.map((res, idx) => (
                        <ResourceItem key={idx} resource={res} />
                      ))}
                      {shouldShowButton && isResourcesExpanded && (
                        <div className="col-span-full">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] text-muted-foreground w-full mt-1"
                            onClick={() => setIsResourcesExpanded(false)}
                          >
                            Hide resources
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={handleAddToCalendar}
              title="Add to Google Calendar"
            >
              <CalendarPlus className="h-4 w-4" />
            </Button>
            {isAdmin && (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => navigate(`/groups/${slug}/session/${session.id}/edit`)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteSession(session.id)}>
                   <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Embedded Poll */}
        {poll && (
          <div className="px-5 pb-3">
            <div className="h-40">
              <PollCard
                  poll={{...poll, session: { title: session.title }}}
                  groupSlug={slug}
                  isAdmin={isAdmin}
              />
            </div>
          </div>
        )}

        <div className="divide-y divide-border/40 flex-1">
          {[...(session.buildings || [])]
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .sort((a: any, b: any) => (a.is_main === b.is_main ? 0 : a.is_main ? -1 : 1))
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map(({ building, is_main }: any) => {
              const localStats = getVisibleBuildingStats(building.id);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const myLog = localStats?.logs.find((l: any) => l.user.id === user?.id);

              return (
                <div
                  key={building.id}
                  className="group/item hover:bg-muted/20 cursor-pointer transition-colors relative"
                  onClick={() => navigate(`/building/${building.id}`)}
                >
                  <div className={`flex gap-5 p-5 ${showGroupStats ? "pb-2" : ""}`}>
                    <div className="relative shrink-0 w-20 h-28 rounded-md overflow-hidden border bg-muted shadow-sm">
                      <img src={building.main_image_url || '/placeholder.png'} className="w-full h-full object-cover" alt={building.name} />
                    </div>
                    <div className="flex-1 flex flex-col justify-center min-w-0 py-1">
                      <div className="mb-2 flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-lg leading-tight">{building.name}</h4>
                            {is_main && (
                              <Badge className="h-5 px-1.5 text-[10px] bg-blue-600 text-white rounded">Main</Badge>
                            )}
                          </div>
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          {myLog?.rating ? (
                            <Button variant="default" size="sm" className="h-9 px-3 bg-primary/10 border-primary/20 border" onClick={() => navigate(`/post?buildingId=${building.id}&title=${encodeURIComponent(building.name || "")}`)}>
                              <div className="flex items-center gap-1.5">
                                <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                                <span className="text-white font-bold text-base">{myLog.rating}</span>
                                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                              </div>
                            </Button>
                          ) : (
                            <PersonalRatingButton filmId={building.id} initialRating={null} onRate={(bid, rating) => rateBuilding.mutate({ buildingId: bid, rating })} isPending={rateBuilding.isPending} />
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        {building.year_completed && <span>{building.year_completed}</span>}
                        <div className="basis-full h-0 sm:hidden"></div>
                        {building.architects && building.architects.map((a: string) => <Badge key={a} variant="outline" className="text-xs h-5 px-1.5 font-normal">{a}</Badge>)}
                      </div>
                    </div>
                  </div>

                  {showGroupStats && (
                    <div className="px-5 pb-5 sm:pl-[6.25rem] sm:-mt-2">
                      {localStats ? (
                        <div className="mt-2">
                          <div className="flex justify-end items-end">
                            {localStats.avg > 0 && (
                              <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                <span>Avg:</span>
                                <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                                <span className="text-foreground">{localStats.avg.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                          {/* <RatingSpectrum logs={localStats.logs} /> */}

                          {/* Members' Reviews */}
                          <div className="mt-6 space-y-4">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {localStats.logs.filter((l: any) => l.content).map((log: any) => (
                              <div key={log.user.id} className="flex gap-3">
                                <Avatar className="w-8 h-8 shrink-0 mt-0.5 border border-border/50">
                                  <AvatarImage src={log.user.avatar_url} />
                                  <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                                    {log.user.username?.[0] || "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="space-y-1">
                                  <div className="font-bold text-sm leading-none pt-1">
                                    {log.user.username || "User"}
                                  </div>
                                  <div className="text-sm text-muted-foreground leading-relaxed">
                                    {log.content}
                                    {/* Tags */}
                                    {log.tags && Array.isArray(log.tags) && log.tags.length > 0 && (
                                      <span className="mx-1.5 opacity-60 text-sm">
                                        {log.tags.map((t: string) => `#${t}`).join(" ")}
                                      </span>
                                    )}
                                    {/* Rating */}
                                    <span className="inline-flex items-center gap-0.5 text-yellow-500 font-bold ml-1.5 text-sm">
                                      ★{log.rating}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 text-right text-xs text-muted-foreground italic">
                          Not yet rated
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
          })}
        </div>

        {/* Chart Section */}
        {hasHistory && showGroupStats && !isAfterToday && hasEnoughRatings && (
           <SessionRatingChart
             sessionBuildings={session.buildings}
             globalRankingData={globalRankingData}
           />
        )}

        {/* Session Footer */}
        <div className="bg-muted/10 p-4 border-t border-border/40">
          <div className={`flex items-center gap-4 ${hasComments ? "mb-4" : "mb-2"}`}>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 gap-1.5 px-2 ${isLiked ? "text-red-500 hover:text-red-600 bg-red-500/10" : "text-muted-foreground"}`}
                onClick={() => toggleLikeSession.mutate({ sessionId: session.id, isLiked })}
              >
                <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                <span className="text-xs font-medium">{likesCount}</span>
              </Button>

              <div className="flex items-center gap-1.5 text-muted-foreground h-8">
                <MessageSquare className="h-4 w-4" />
                <span className="text-xs font-medium">{commentsCount}</span>
              </div>
            </div>

            <div className="flex -space-x-2">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {likers.slice(0, 5).map((like: any) => (
                <Avatar key={like.user.id} className="h-6 w-6 border-2 border-background">
                  <AvatarImage src={like.user.avatar_url} />
                  <AvatarFallback className="text-[9px]">{like.user.username?.[0] || "?"}</AvatarFallback>
                </Avatar>
              ))}
            </div>
          </div>

          <div className={`pt-2 ${hasComments ? "space-y-4" : ""}`}>
            {hasComments && (
              <div className="space-y-3 pl-2 max-h-60 overflow-y-auto pr-2">
                {commentsCount > commentsLimit && (
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs text-muted-foreground mb-2" onClick={() => setCommentsLimit(prev => prev + 5)}>
                    Show previous comments
                  </Button>
                )}
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {commentsData.slice(-commentsLimit).map((comment: any) => (
                  <div key={comment.id} className="flex gap-3 text-sm group/comment">
                    <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                      <AvatarImage src={comment.user.avatar_url} />
                      <AvatarFallback className="text-[9px]">{comment.user.username?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-xs">{comment.user.username}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true }).replace("about ", "")}
                        </span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed text-xs">{comment.content}</p>
                    </div>
                    {(isAdmin || comment.user.id === user?.id) && (
                      <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover/comment:opacity-100" onClick={() => deleteComment.mutate(comment.id)}>
                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Add a comment..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') postComment.mutate({ sessionId: session.id, content: commentInput }); }}
                className="h-8 text-xs bg-background"
              />
              <Button size="icon" className="h-8 w-8 shrink-0" onClick={() => postComment.mutate({ sessionId: session.id, content: commentInput })} disabled={!commentInput.trim()}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

      </div>
    </article>
  );
}
