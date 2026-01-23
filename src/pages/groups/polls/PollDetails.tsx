import { useEffect, useState } from "react";
import { useParams, Link, useOutletContext, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VotingForm } from "@/components/groups/polls/VotingForm";
import { PollResults } from "@/components/groups/polls/PollResults";
import { PollDialog } from "@/components/groups/polls/PollDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  ExternalLink, 
  Edit2, 
  ArrowLeft, 
  BarChart2, 
  XCircle, 
  PlayCircle, 
  Building2,
  HelpCircle, 
  MoreHorizontal,
  CheckCircle2,
  Radio
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn, isValidUUID } from "@/lib/utils";

export default function PollDetails() {
  const { pollSlug, slug } = useParams();
  const { group, isAdmin } = useOutletContext<{ group: any; isAdmin: boolean }>();
  const groupSlug = group?.slug || slug;

  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch poll data
  const { data: poll, isLoading, error } = useQuery({
    queryKey: ["poll", pollSlug],
    queryFn: async () => {
      let query = supabase
        .from("polls")
        .select(`
          *,
          questions:poll_questions(
            *,
            options:poll_options(*)
          ),
          votes:poll_votes(
            *,
            profiles:user_id(avatar_url, username)
          ),
          session:group_sessions(id, status)
        `)
        .eq("group_id", group.id);

      if (pollSlug && isValidUUID(pollSlug)) {
        query = query.or(`slug.eq.${pollSlug},id.eq.${pollSlug}`);
      } else {
        query = query.eq("slug", pollSlug);
      }

      const { data, error } = await query.single();

      if (error) throw error;

      // Sort questions
      data.questions = data.questions.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));

      return data;
    },
    enabled: !!pollSlug && !!group?.id
  });

  // State for view (vote vs results)
  const [view, setView] = useState<'results' | 'vote'>('vote');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (poll && user && !initialized) {
        const hasVoted = poll.votes?.some((v: any) => v.user_id === user.id);
        const isClosed = poll.status === 'closed';
        if (hasVoted || isClosed) {
            setView('results');
        }
        setInitialized(true);
    }
  }, [poll, user, initialized]);

  // Realtime subscription for updates
  useEffect(() => {
    if (!poll?.id) return;

    const channel = supabase
      .channel(`poll-details-${poll.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'poll_questions',
          filter: `poll_id=eq.${poll.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["poll", pollSlug] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'polls',
          filter: `id=eq.${poll.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["poll", pollSlug] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [poll?.id, pollSlug, queryClient]);


  if (isLoading) return <Skeleton className="h-[400px] w-full" />;
  if (error || !poll) return <div className="text-center py-10">Poll not found</div>;

  const hasVoted = poll.votes?.some((v: any) => v.user_id === user?.id);
  const isClosed = poll.status === 'closed';
  const isLive = poll.status === 'live';
  const isActive = poll.status === 'open';
  const isPublished = poll.status === 'published';
  // const canVote = !hasVoted && !isClosed && !isLive; // Unused
  const activeQuestion = poll.questions?.find((q: any) => q.is_live_active);

  const getPollTypeHeader = (type: string) => {
    switch (type) {
      case 'quiz':
        return (
          <div className="flex items-center gap-2 text-sm font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1">
            <HelpCircle className="w-4 h-4" />
            <span>Trivia</span>
          </div>
        );
      case 'building_selection':
        return (
          <div className="flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>Decision</span>
          </div>
        );
      case 'general':
      default:
        return (
          <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">
            <BarChart2 className="w-4 h-4" />
            <span>Vote</span>
          </div>
        );
    }
  };

  const handlePollUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ["poll", pollSlug] });
    queryClient.invalidateQueries({ queryKey: ["polls", group.id] });
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
        const { error } = await supabase
            .from('polls')
            .update({ status: newStatus })
            .eq('id', poll.id);

        if(error) throw error;

        toast({ 
            title: "Success", 
            description: newStatus === 'open' ? "Poll is now accepting votes." : "Poll has been closed." 
        });
        handlePollUpdated();
    } catch (e: any) {
        toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            onClick={() => {
                if (poll.session?.status === 'closed') {
                    navigate(`/groups/${groupSlug}`);
                } else {
                    navigate(`/groups/${groupSlug}/polls`);
                }
            }}
        >
            <ArrowLeft className="h-4 w-4" />
            <span>{poll.session?.status === 'closed' ? "Back to Field Trip" : "Back to Polls"}</span>
        </div>

        {/* REFACTORED HEADER */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b pb-6">
            
            {/* Identity Zone */}
            <div className="space-y-2 flex-1">
                {getPollTypeHeader(poll.type)}
                <div className="flex items-center flex-wrap gap-3">
                    <h1 className="text-3xl font-bold tracking-tight">{poll.title}</h1>
                    
                    {/* Status Badges are now anchored to the Title */}
                    {isClosed && <Badge variant="secondary">Closed</Badge>}
                    {isActive && <Badge variant="default" className="bg-green-600 hover:bg-green-700">Active</Badge>}
                    {isLive && <Badge variant="destructive" className="animate-pulse">LIVE</Badge>}
                </div>
                {poll.description && <p className="text-muted-foreground text-lg max-w-2xl">{poll.description}</p>}
            </div>

            {/* Actions Zone */}
            <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
                {/* Primary Button Logic */}
                {isLive && (
                     <Button variant="default" asChild className="animate-pulse">
                         <Link to={`/groups/${groupSlug}/live/${poll.slug}`} target="_blank">
                             Join Live Event
                         </Link>
                     </Button>
                )}
                
                {/* Toggle View Button (Only if not live and not already voted) */}
                {!isLive && !hasVoted && (
                    <Button 
                        variant={view === 'results' ? "outline" : "default"}
                        onClick={() => setView(view === 'results' ? 'vote' : 'results')}
                    >
                        {view === 'results' ? (
                             <><Edit2 className="w-4 h-4 mr-2" /> Vote</>
                        ) : (
                             <><BarChart2 className="w-4 h-4 mr-2" /> Results</>
                        )}
                    </Button>
                )}

                {/* Admin Actions */}
                {isAdmin && (
                    <>
                        {/* Edit Poll */}
                        <PollDialog
                            pollToEdit={poll}
                            onPollCreated={handlePollUpdated}
                            onPollDeleted={() => navigate(`/groups/${groupSlug}/polls`)}
                            trigger={
                                <Button variant="outline" size="sm">
                                    <Edit2 className="w-4 h-4 mr-2" /> Edit
                                </Button>
                            }
                        />

                        {/* Status Actions - Extracted from Dropdown */}
                        {isPublished && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange('open')}
                                className="text-green-600 border-green-200 hover:bg-green-50"
                            >
                                <PlayCircle className="mr-2 h-4 w-4" /> Open Voting
                            </Button>
                        )}

                        {!isClosed && !isPublished && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    if(window.confirm("Close poll?")) handleStatusChange('closed');
                                }}
                                className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                            >
                                <XCircle className="mr-2 h-4 w-4" /> Close
                            </Button>
                        )}

                        {isClosed && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange('open')}
                            >
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Re-open
                            </Button>
                        )}

                        {/* Extra Menu for less common actions */}
                        {(isLive) && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                        <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuLabel>Admin Options</DropdownMenuLabel>
                                    <DropdownMenuSeparator />

                                    {/* Live Control */}
                                    {isLive && (
                                        <DropdownMenuItem asChild>
                                            <Link to={`/groups/${groupSlug}/live/${poll.slug}/admin`} className="cursor-pointer">
                                                <ExternalLink className="mr-2 h-4 w-4" /> Live Control Panel
                                            </Link>
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </>
                )}
            </div>
        </div>

        {/* Content Area */}
        <div className="pt-2">
            {isLive ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-6 text-center border rounded-lg bg-muted/10">
                    <Radio className={cn("w-16 h-16 text-destructive", activeQuestion ? "animate-pulse" : "opacity-50")} />
                    <div className="space-y-2">
                        <h3 className="font-bold text-2xl">
                             {activeQuestion ? "Live Event in Progress" : "Waiting for host to start..."}
                        </h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            This poll is being conducted live. Join the event to see questions and vote in real-time!
                        </p>
                    </div>
                     {hasVoted && <p className="text-sm text-muted-foreground">You have submitted votes, but can still join to spectate.</p>}
                </div>
            ) : view === 'results' ? (
                 <div className="space-y-6">
                     <PollResults poll={poll} hasVoted={hasVoted} isAdmin={isAdmin} />
                 </div>
             ) : (
                 <div className="space-y-6">
                     <VotingForm poll={poll} onVoteSuccess={() => setView('results')} />
                 </div>
             )}
        </div>
    </div>
  );
}
