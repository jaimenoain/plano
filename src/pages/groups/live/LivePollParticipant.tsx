
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Zap, CheckCircle2 } from "lucide-react";
import { VotingForm } from "@/components/groups/polls/VotingForm";
import { PollResults } from "@/components/groups/polls/PollResults";
import { Leaderboard } from "@/components/groups/polls/Leaderboard";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export default function LivePollParticipant() {
  const { pollSlug, slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: poll, isLoading, error, refetch } = useQuery({
    queryKey: ["poll-live", pollSlug],
    queryFn: async () => {
      // Get group id first
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
    }
  });

  useEffect(() => {
      if (!poll?.id) return;

      const channel = supabase
          .channel(`participant-${poll.id}`)
          .on(
              'postgres_changes',
              {
                  event: '*', // Listen for any update (INSERT/UPDATE/DELETE) on questions
                  schema: 'public',
                  table: 'poll_questions',
                  filter: `poll_id=eq.${poll.id}`
              },
              (payload) => {
                  console.log('Poll question state changed:', payload);
                  refetch();
              }
          )
          .on(
              'postgres_changes',
              {
                  event: '*', // Listen for any vote change
                  schema: 'public',
                  table: 'poll_votes',
                  filter: `poll_id=eq.${poll.id}`
              },
              () => {
                  refetch();
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
                refetch();
            }
          )
          .subscribe();

      return () => {
          supabase.removeChannel(channel);
      };
  }, [poll?.id, refetch]);

  if (isLoading) return <div className="flex items-center justify-center h-screen bg-black text-white"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  if (error || !poll) return <div className="flex items-center justify-center h-screen bg-black text-white">Poll not found</div>;

  const activeQuestion = poll.questions.find((q: any) => q.is_live_active);

  // Header component
  const header = (
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center bg-black/20 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="font-mono text-sm uppercase tracking-widest text-white/80">Live Event</span>
          </div>
          <Button variant="ghost" size="sm" className="text-white/50 hover:text-white" onClick={() => navigate(`/groups/${slug}/polls`)}>
              Exit
          </Button>
      </div>
  );

  // State D: Session Closed
  if (poll.status === 'closed') {
      return (
          <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
              {header}
              <h1 className="text-4xl font-bold mb-4">Event Ended</h1>
              <p className="text-xl text-white/80">Thanks for participating!</p>
              <Button className="mt-8" onClick={() => navigate(`/groups/${slug}/polls`)}>
                  Back to Polls
              </Button>
          </div>
      );
  }

  // State E: Leaderboard
  if (poll.status === 'leaderboard') {
      return (
          <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 animate-in fade-in">
              {header}
              <div className="w-full max-w-lg mt-12 mb-12">
                   <Leaderboard poll={poll} />
                   <p className="text-center text-zinc-500 mt-8 animate-pulse">Waiting for host to end event...</p>
              </div>
          </div>
      );
  }

  // State A: Waiting
  if (!activeQuestion) {
      return (
          <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-black text-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
              {header}
              <Zap className="h-20 w-20 text-yellow-400 mb-6 animate-pulse" />
              <h1 className="text-4xl font-bold mb-4">{poll.title}</h1>
              <p className="text-xl text-white/80">Waiting for host to start...</p>
              <p className="text-sm text-white/50 mt-8">Sit tight!</p>
          </div>
      );
  }

  // State C: Results (if revealed)
  if (activeQuestion.is_revealed) {
       return (
          <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 animate-in zoom-in-95 duration-300">
               {header}
               <div className="w-full max-w-lg space-y-6 mt-12 mb-12">
                   <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">{activeQuestion.question_text}</h2>
                   <Card className="bg-zinc-900 border-zinc-800 text-white">
                       <CardContent className="pt-6">
                            <PollResults poll={{...poll, questions: [activeQuestion]}} />
                       </CardContent>
                   </Card>
                   <p className="text-center text-zinc-500 animate-pulse">Waiting for next question...</p>
               </div>
          </div>
       );
  }

  // State B: Voting
  // Check if user has voted on this question
  const hasVotedOnCurrent = poll.votes.some((v: any) => v.question_id === activeQuestion.id && v.user_id === user?.id);

  return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 animate-in slide-in-from-bottom-10 duration-500">
           {header}
           <div className="w-full max-w-lg mt-12 mb-12">
               <div className="mb-8 text-center">
                   <h2 className="text-2xl font-bold mb-4">{activeQuestion.question_text}</h2>
                   <div className="h-1 w-20 bg-primary mx-auto rounded-full"/>
               </div>

               {hasVotedOnCurrent ? (
                    <div className="text-center p-10 bg-zinc-900/50 rounded-xl border border-zinc-800 animate-in fade-in zoom-in-95 duration-300">
                        <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-primary/80" />
                        <h3 className="text-xl font-semibold mb-2">Vote Recorded</h3>
                        <p className="text-zinc-400">Waiting for results to be revealed...</p>
                    </div>
               ) : (
                   <Card className="bg-zinc-900 border-zinc-800">
                       <CardContent className="pt-6">
                            <VotingForm
                                poll={{...poll, questions: [activeQuestion]}} // Pass only active question to isolate context
                                onVoteSuccess={() => refetch()}
                            />
                       </CardContent>
                   </Card>
               )}
           </div>
      </div>
  );
}
