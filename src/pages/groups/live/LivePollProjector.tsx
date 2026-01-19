
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Zap, MonitorPlay } from "lucide-react";
import { PollResults } from "@/components/groups/polls/PollResults";
import { Leaderboard } from "@/components/groups/polls/Leaderboard";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import QRCode from "react-qr-code";

export default function LivePollProjector() {
  const { pollSlug, slug } = useParams();

  const { data: poll, isLoading, error, refetch } = useQuery({
    queryKey: ["poll-projector", pollSlug],
    queryFn: async () => {
      const { data: group } = await supabase.from('groups').select('id').eq('slug', slug).single();

      const { data, error } = await supabase
        .from("polls")
        .select(`
          *,
          group:groups(slug),
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

  // Subscribe to realtime updates
  useEffect(() => {
    if (!poll?.id) return;

    const channel = supabase
      .channel(`projector-${poll.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'poll_questions',
          filter: `poll_id=eq.${poll.id}`
        },
        () => {
          refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all vote events
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

  if (isLoading) return <div className="flex items-center justify-center h-screen bg-black text-white"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;
  if (error || !poll) return <div className="flex items-center justify-center h-screen bg-black text-white text-2xl">Poll not found</div>;

  const activeQuestion = poll.questions.find((q: any) => q.is_live_active);
  const isRevealed = activeQuestion?.is_revealed;
  // Use group slug for cleaner URL, fallback to ID if missing (though it shouldn't be)
  const groupSlug = poll.group?.slug || poll.group_id;
  const joinUrl = `${window.location.origin}/groups/${groupSlug}/live/${pollSlug}`;

  // Session Ended State
  if (poll.status === 'closed') {
      return (
        <div className="h-screen w-screen bg-black text-white flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-1000 overflow-hidden">
            <h1 className="text-6xl font-bold mb-6 tracking-tight">Session Ended</h1>
            <p className="text-3xl text-white/80 font-light">Thanks for participating!</p>
        </div>
      );
  }

  // Leaderboard State
  if (poll.status === 'leaderboard') {
      return (
          <div className="h-screen w-screen bg-black text-white flex flex-col items-center justify-center p-8 animate-in zoom-in-95 duration-700">
               <Leaderboard poll={poll} />
          </div>
      );
  }

  // Waiting State
  if (!activeQuestion) {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-indigo-950 to-black text-white flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-1000 overflow-hidden">
        <Zap className="h-24 w-24 text-yellow-400 mb-8 animate-pulse" />
        <h1 className="text-6xl font-bold mb-6 tracking-tight">{poll.title}</h1>
        <p className="text-3xl text-white/80 font-light mb-12">Get ready! The session will start soon.</p>

        <div className="flex flex-col items-center gap-6 bg-white/5 p-8 rounded-3xl backdrop-blur-sm border border-white/10">
            <div className="bg-white p-4 rounded-xl">
                <QRCode value={joinUrl} size={256} />
            </div>
            <div className="text-xl text-white/60 font-mono">
                Scan to join
            </div>
        </div>
      </div>
    );
  }

  // Calculate vote count for active question
  const voteCount = poll.votes.filter((v: any) => v.question_id === activeQuestion.id).length;

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-none flex justify-between items-center p-6 border-b border-white/10 bg-black z-10">
        <h2 className="text-3xl font-light text-white/60 truncate max-w-2xl">{poll.title}</h2>
        <div className="flex items-center gap-4">
           <div className="px-6 py-2 bg-indigo-600 rounded-full font-bold text-xl animate-pulse shadow-[0_0_15px_rgba(79,70,229,0.5)]">
              LIVE
           </div>
        </div>
      </div>

      {/* Content Area - Flex 1 to take remaining space */}
      <div className="flex-1 w-full flex flex-col relative overflow-hidden">

         {/* Question Text - Fixed height area at top */}
         <div className="flex-none w-full p-6 flex flex-col items-center justify-center min-h-[10%] max-h-[35%] gap-4">
             {activeQuestion.media_url && (
                <div className="w-full flex justify-center max-h-[25vh]">
                   {activeQuestion.media_type === 'video' ? (
                      <video src={activeQuestion.media_url} controls autoPlay muted className="h-full rounded-xl shadow-2xl" />
                   ) : activeQuestion.media_url.includes('youtube') ? (
                       <iframe
                           src={activeQuestion.media_url.replace('watch?v=', 'embed/')}
                           className="aspect-video h-full rounded-xl shadow-2xl"
                           allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                           allowFullScreen
                       />
                   ) : (
                      <img src={activeQuestion.media_url} className="h-full object-contain rounded-xl shadow-2xl" alt="Question Media" />
                   )}
                </div>
             )}
             <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center leading-tight line-clamp-3">
                {activeQuestion.question_text}
             </h1>
         </div>

         {/* Main Visualization Area */}
         <div className="flex-1 w-full px-8 pb-8 flex items-center justify-center">

             {isRevealed ? (
                /* Results View */
                <div className="w-full max-w-6xl h-full animate-in zoom-in-95 duration-500 flex items-center justify-center">
                   <Card className="bg-zinc-900/90 border-zinc-800 text-white shadow-2xl w-full max-h-full overflow-hidden flex flex-col">
                       <CardContent className="p-6 md:p-8 overflow-y-auto">
                           {/* PollResults handles its own layout, we assume it scales nicely */}
                           <div>
                               <PollResults poll={{...poll, questions: [activeQuestion]}} largeAvatars={true} />
                           </div>
                       </CardContent>
                   </Card>
                </div>
             ) : (
                /* Voting View - Side by Side if possible, or Grid */
                <div className="w-full h-full flex flex-col md:flex-row gap-8 items-center justify-center">

                    {/* Options Grid */}
                    <div className={cn(
                        "grid gap-6 w-full max-w-4xl self-center",
                        activeQuestion.options.length <= 4 ? "grid-cols-2" : "grid-cols-3",
                        // If many options, scale down grid items slightly
                        activeQuestion.options.length > 6 && "grid-cols-4"
                    )}>
                        {activeQuestion.options.map((opt: any, idx: number) => {
                            // If it's an image poll and label is empty or "Image Option", we show image cleanly
                            const hasLabel = opt.option_text && opt.option_text !== "Image Option" && opt.option_text.trim() !== "";

                            return (
                                <div key={opt.id} className="relative group overflow-hidden rounded-2xl border border-white/20 bg-white/5 p-4 flex flex-col items-center justify-center text-center aspect-video transition-all duration-300">
                                    {/* Option Index */}
                                    <div className="absolute top-3 left-3 h-8 w-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-lg z-20 shadow-sm">
                                        {idx + 1}
                                    </div>

                                    {opt.media_url ? (
                                        <div className={cn(
                                            "absolute inset-0 z-0 transition-opacity",
                                            hasLabel ? "opacity-40 group-hover:opacity-60" : "opacity-100"
                                        )}>
                                            <img src={opt.media_url} className="w-full h-full object-cover" alt="Option" />
                                            {hasLabel && <div className="absolute inset-0 bg-black/50" />}
                                        </div>
                                    ) : null}

                                    {hasLabel && (
                                        <span className="relative z-10 text-2xl md:text-3xl font-semibold drop-shadow-lg line-clamp-2">{opt.option_text}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Big Counter - Floating or Side */}
                    <div className="flex-none flex flex-col items-center justify-center min-w-[200px] p-6 bg-zinc-900/50 rounded-3xl border border-white/10 backdrop-blur-md">
                        <div className="text-8xl leading-none font-black text-indigo-400 tabular-nums drop-shadow-[0_0_30px_rgba(129,140,248,0.3)]">
                            {voteCount}
                        </div>
                        <div className="text-xl text-white/50 uppercase tracking-[0.2em] font-light mt-2">Votes In</div>
                    </div>
                </div>
             )}
         </div>
      </div>
    </div>
  );
}
