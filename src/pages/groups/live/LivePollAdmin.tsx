
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Play, StopCircle, ArrowRight, Eye, MonitorPlay, CheckCircle2, XCircle, Trophy } from "lucide-react";
import { PollResults } from "@/components/groups/polls/PollResults";
import { Badge } from "@/components/ui/badge";
import { Leaderboard } from "@/components/groups/polls/Leaderboard";

export default function LivePollAdmin() {
  const { pollSlug, slug } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [autoReveal, setAutoReveal] = useState(true);

  // We need to fetch the poll ID first based on the slug to set up subscriptions correctly
  // Or we can just query by slug and get the ID.
  const { data: poll, isLoading, error, refetch } = useQuery({
    queryKey: ["poll-admin", pollSlug],
    queryFn: async () => {
      // Need group_id to ensure uniqueness if we use slug
      const { data: group } = await supabase.from('groups').select('id').eq('slug', slug).single();

      const { data, error } = await supabase
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
          )
        `)
        .eq("slug", pollSlug)
        .eq("group_id", group?.id)
        .single();

      if (error) throw error;

      // Sort questions
      if (data.questions) {
        data.questions.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
      }
      return data;
    },
  });

  // Realtime updates for votes
  useEffect(() => {
    if (!poll?.id) return;

    const channel = supabase
      .channel(`admin-live-${poll.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'poll_votes',
          filter: `poll_id=eq.${poll.id}`
        },
        () => {
            refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [poll?.id, refetch]);

  const updateQuestionState = useMutation({
    mutationFn: async ({ questionId, updates }: { questionId?: string, updates: { is_live_active?: boolean; is_revealed?: boolean } }) => {
        // If updates contains is_live_active = true, we must set all other questions in this poll to false
        if (updates.is_live_active && poll?.id) {
             const { error: resetError } = await supabase
                .from("poll_questions")
                .update({ is_live_active: false })
                .eq("poll_id", poll.id);
             if (resetError) throw resetError;
        }

        if (questionId) {
             const { error } = await supabase
                .from("poll_questions")
                .update(updates)
                .eq("id", questionId);
             if (error) throw error;
        }
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["poll-admin", pollSlug] });
        toast.success("Poll state updated");
    },
    onError: (err) => {
        toast.error("Failed to update poll state: " + err.message);
    }
  });

  const updatePollStatus = useMutation({
    mutationFn: async (status: string) => {
        if (!poll?.id) return;

        // If entering leaderboard or closing, disable all questions
        if (status === 'leaderboard' || status === 'closed') {
             await supabase
                .from("poll_questions")
                .update({ is_live_active: false })
                .eq("poll_id", poll.id);
        }

        const { error } = await supabase
            .from("polls")
            .update({ status })
            .eq("id", poll.id);
        if (error) throw error;
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["poll-admin", pollSlug] });
        toast.success("Poll status updated");
    },
    onError: (err) => {
        toast.error("Failed to update status: " + err.message);
    }
  });

  const closePollMutation = useMutation({
      mutationFn: async () => {
           if (!poll?.id) return;
           // Set all questions to inactive
           const { error: qError } = await supabase
              .from("poll_questions")
              .update({ is_live_active: false })
              .eq("poll_id", poll.id);
           if (qError) throw qError;

           // Set poll status to closed
           const { error: pError } = await supabase
              .from("polls")
              .update({ status: 'closed' })
              .eq("id", poll.id);
           if (pError) throw pError;
      },
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["poll-admin", pollSlug] });
          toast.success("Session ended");
      },
      onError: (err) => {
          toast.error("Failed to close session: " + err.message);
      }
  });

  if (isLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-8 w-8" /></div>;
  if (error || !poll) return <div className="p-8 text-center text-red-500">Error loading poll</div>;

  const activeQuestionIndex = poll.questions.findIndex((q: any) => q.is_live_active);
  const activeQuestion = activeQuestionIndex !== -1 ? poll.questions[activeQuestionIndex] : null;

  const handleStartSession = () => {
    if (poll.questions.length > 0) {
        // Start with Q1
        updateQuestionState.mutate({
            questionId: poll.questions[0].id,
            updates: { is_live_active: true, is_revealed: false }
        });
    }
  };

  const handleAdvance = () => {
      // Logic depends on current state and autoReveal setting

      // Case 1: No active question (Start)
      if (!activeQuestion) {
          handleStartSession();
          return;
      }

      // Case 2: Active question is NOT revealed, and we want to reveal it (Auto Reveal ON)
      if (activeQuestion && !activeQuestion.is_revealed && autoReveal) {
          handleRevealResults();
          return;
      }

      // Case 3: Move to next question (Either because revealed, or Auto Reveal is OFF)
      // Logic: If revealed OR (not revealed AND autoReveal OFF) -> Next
      const nextIndex = activeQuestionIndex + 1;
      if (nextIndex < poll.questions.length) {
          updateQuestionState.mutate({
              questionId: poll.questions[nextIndex].id,
              updates: { is_live_active: true, is_revealed: false } // Reset reveal state for next q
          });
      } else {
          // End of questions
          if (poll.type === 'quiz' && poll.status !== 'leaderboard') {
              updatePollStatus.mutate('leaderboard');
          } else {
              toast.info("This was the last question. You can now end the session.");
          }
      }
  };

  const handleRevealResults = () => {
      if (activeQuestion) {
          updateQuestionState.mutate({
              questionId: activeQuestion.id,
              updates: { is_revealed: true }
          });
      }
  };

  const handleEndSession = () => {
      if (window.confirm("Are you sure you want to end the session? This will close the poll for all users.")) {
          closePollMutation.mutate();
      }
  };

  // Determine Main Action Button Label & Function
  let mainActionLabel = "Start Session";
  let mainActionIcon = <Play className="mr-2 h-5 w-5" />;
  let mainActionDisabled = false;

  if (activeQuestion) {
      if (!activeQuestion.is_revealed && autoReveal) {
          mainActionLabel = "Reveal Results";
          mainActionIcon = <Eye className="mr-2 h-5 w-5" />;
      } else {
          // Ready for next question
          if (activeQuestionIndex < poll.questions.length - 1) {
              mainActionLabel = "Next Question";
              mainActionIcon = <ArrowRight className="mr-2 h-5 w-5" />;
          } else {
              if (poll.type === 'quiz') {
                  mainActionLabel = "Show Leaderboard";
                  mainActionIcon = <Trophy className="mr-2 h-5 w-5" />;
              } else {
                  mainActionLabel = "Finish (No more questions)";
                  mainActionIcon = <CheckCircle2 className="mr-2 h-5 w-5" />;
                  mainActionDisabled = true; // Use End Session button instead
              }
          }
      }
  } else if (poll.status === 'leaderboard') {
      mainActionLabel = "End Session";
      mainActionIcon = <StopCircle className="mr-2 h-5 w-5" />;
      mainActionDisabled = true;
  }

  return (
    <div className="min-h-screen bg-background p-6">
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        {poll.title}
                        <Badge variant={poll.status === 'live' ? 'default' : 'secondary'}>
                            {poll.status.toUpperCase()}
                        </Badge>
                    </h1>
                    <p className="text-muted-foreground mt-1">Admin Cockpit</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        onClick={() => window.open(`/groups/${slug}/live/${pollSlug}/projector`, '_blank')}
                    >
                        <MonitorPlay className="mr-2 h-4 w-4" /> Open Projector
                    </Button>
                    <Button variant="outline" onClick={() => navigate(`/groups/${slug}/polls`)}>Exit</Button>
                </div>
            </div>

            {/* Main Control Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Controls */}
                <Card className="lg:col-span-2 border-primary/20 shadow-lg">
                    <CardHeader className="bg-muted/30 pb-4">
                        <CardTitle className="flex justify-between items-center text-xl">
                            <span>Live Control</span>
                            <div className="flex items-center space-x-2 text-sm font-normal">
                                <Switch id="auto-reveal" checked={autoReveal} onCheckedChange={setAutoReveal} />
                                <Label htmlFor="auto-reveal">Reveal results after each question</Label>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">

                        {/* Status Indicator */}
                        <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border">
                            <div className="space-y-1">
                                <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Current State</div>
                                <div className="text-2xl font-bold">
                                    {activeQuestion
                                        ? `Q${activeQuestionIndex + 1}: ${activeQuestion.is_revealed ? 'Results Revealed' : 'Voting Active'}`
                                        : (poll.status === 'closed' ? 'Session Ended' : poll.status === 'leaderboard' ? 'Leaderboard' : 'Waiting to Start')
                                    }
                                </div>
                            </div>
                            {activeQuestion && (
                                <div className="text-right">
                                    <div className="text-3xl font-mono font-bold text-primary">
                                        {poll.votes.filter((v: any) => v.question_id === activeQuestion.id).length}
                                    </div>
                                    <div className="text-xs text-muted-foreground">VOTES</div>
                                </div>
                            )}
                        </div>

                        {/* Primary Action Button */}
                        <Button
                            size="lg"
                            className="w-full h-16 text-xl shadow-xl transition-all hover:scale-[1.01]"
                            onClick={handleAdvance}
                            disabled={mainActionDisabled || poll.status === 'closed'}
                        >
                            {mainActionIcon} {mainActionLabel}
                        </Button>

                        {/* Secondary Actions */}
                        <div className="grid grid-cols-1 gap-4">
                            <Button
                                variant="destructive"
                                onClick={handleEndSession}
                                disabled={poll.status === 'closed'}
                            >
                                <XCircle className="mr-2 h-4 w-4" /> End Session
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Right Column: Question List */}
                <Card className="h-full flex flex-col">
                    <CardHeader>
                        <CardTitle>Questions ({poll.questions.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto max-h-[500px] space-y-2 pr-2">
                        {poll.questions.map((q: any, idx: number) => {
                             const isActive = q.id === activeQuestion?.id;
                             const isPast = idx < activeQuestionIndex || (poll.status === 'closed');
                             const isFuture = idx > activeQuestionIndex && !isActive;

                             return (
                                <div
                                   key={q.id}
                                   className={`p-3 rounded-lg border text-sm transition-colors cursor-pointer
                                       ${isActive ? 'border-primary bg-primary/10 shadow-sm' : ''}
                                       ${isPast ? 'opacity-60 bg-muted' : ''}
                                       ${isFuture ? 'bg-card' : ''}
                                   `}
                                   onClick={() => {
                                       if (window.confirm(`Jump to Question ${idx + 1}?`)) {
                                           updateQuestionState.mutate({
                                               questionId: q.id,
                                               updates: { is_live_active: true, is_revealed: false }
                                           });
                                       }
                                   }}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`font-bold ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>Q{idx + 1}</span>
                                        <div className="flex gap-1">
                                            {isActive && <Badge variant="default" className="bg-green-600 h-5 px-1.5 text-[10px]">LIVE</Badge>}
                                            {q.is_revealed && <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">DONE</Badge>}
                                        </div>
                                    </div>
                                    <div className="line-clamp-2 font-medium">{q.question_text}</div>
                                </div>
                             );
                        })}
                    </CardContent>
                </Card>
            </div>

            {/* Live Preview Section */}
            <Card>
                 <CardHeader>
                     <CardTitle>Live Results Preview</CardTitle>
                 </CardHeader>
                 <CardContent>
                     {poll.status === 'leaderboard' ? (
                         <Leaderboard poll={poll} />
                     ) : (
                         <PollResults poll={poll} isAdmin={true} largeAvatars={true} />
                     )}
                 </CardContent>
            </Card>
        </div>
    </div>
  );
}
