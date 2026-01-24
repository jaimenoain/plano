import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Heart, X, Bookmark, PartyPopper, Play, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import ReactPlayer from 'react-player';
import { BuildingFriendsActivity } from "./BuildingFriendsActivity";
import { upsertUserBuilding } from "@/utils/supabaseFallback";

interface CardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  question: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  freshBuildingData?: any;
  onSwipe: (direction: "left" | "right") => void;
  isFront: boolean;
  groupId: string;
}

function SwipeCard({ question, freshBuildingData, onSwipe, isFront, groupId }: CardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  // Visual cues for swipe
  const likeOpacity = useTransform(x, [10, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-10, -100], [0, 1]);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 100) {
      onSwipe("right");
    } else if (info.offset.x < -100) {
      onSwipe("left");
    }
  };

  const buildingData = freshBuildingData || question.media_data || {};
  const trailerUrl = question.media_url?.includes('youtube') ? question.media_url : null;
  const buildingId = buildingData.id || buildingData.building_id || question.building_id; // Check all locations just in case

  return (
    <motion.div
      style={{ x, rotate, opacity, zIndex: isFront ? 1 : 0 }}
      drag={isFront ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      className="absolute top-0 left-0 w-full h-full max-w-md md:max-w-lg lg:max-w-xl bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 cursor-grab active:cursor-grabbing origin-bottom"
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-full h-full overflow-y-auto no-scrollbar scroll-smooth">

        {/* Media Section */}
        <div className="relative h-[60vh] w-full shrink-0">
          <div className="absolute inset-0 bg-zinc-900">
            {trailerUrl ? (
              <div className="w-full h-full pointer-events-none">
                  <ReactPlayer
                    url={trailerUrl}
                    playing={isFront}
                    muted={true}
                    loop={true}
                    width="100%"
                    height="100%"
                    config={{
                        youtube: {
                            playerVars: { showinfo: 0, controls: 0, modestbranding: 1, disablekb: 1 }
                        }
                    }}
                    className="scale-[1.35]" // Zoom in slightly to cover black bars
                  />
              </div>
            ) : (
              <img
                src={buildingData.main_image_url || question.media_url || '/placeholder.png'}
                alt={question.question_text}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black" />
          </div>

          {/* Swipe Indicators */}
          <motion.div style={{ opacity: likeOpacity }} className="absolute top-8 left-8 border-4 border-green-500 text-green-500 rounded-xl px-4 py-2 font-bold text-2xl md:text-4xl -rotate-12 z-10 bg-black/20 backdrop-blur-sm pointer-events-none whitespace-nowrap">
            MUST VISIT
          </motion.div>
          <motion.div style={{ opacity: nopeOpacity }} className="absolute top-8 right-8 border-4 border-red-500 text-red-500 rounded-xl px-4 py-2 font-bold text-4xl rotate-12 z-10 bg-black/20 backdrop-blur-sm pointer-events-none">
            SKIP
          </motion.div>
        </div>

        {/* Content Section */}
        <div className="relative bg-black px-6 pb-32 -mt-20 pt-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-md leading-tight mb-2">
              {question.question_text}
            </h2>
            <div className="flex flex-wrap gap-2 text-sm md:text-base text-white/80 font-medium mb-4">
              {buildingData.year_completed && <span>{buildingData.year_completed}</span>}
              {buildingData.architects && buildingData.architects.length > 0 && (
                  <span>• {buildingData.architects[0]}</span>
              )}
            </div>
            {buildingData.description && (
              <p className="text-sm md:text-base text-white/70 leading-relaxed">
                  {buildingData.description}
              </p>
            )}

            {/* Friends Activity */}
            {buildingId && <BuildingFriendsActivity buildingId={buildingId} groupId={groupId} />}
        </div>
      </div>
    </motion.div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function WinnerCard({ question, freshBuildingData }: { question: any, freshBuildingData?: any }) {
    const buildingData = freshBuildingData || question.media_data || {};
    const navigate = useNavigate();

    const buildingId = buildingData.id || buildingData.building_id || question.building_id;

    return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-6 animate-in zoom-in duration-500">
             <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {/* CSS Confetti placeholder or generic effect */}
                  <div className="absolute top-0 left-1/4 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                  <div className="absolute top-10 right-1/4 w-3 h-3 bg-blue-500 rounded-full animate-bounce" />
                  <div className="absolute bottom-1/4 left-1/3 w-4 h-4 bg-green-500 rounded-full animate-pulse" />
             </div>

             <PartyPopper className="h-24 w-24 text-yellow-400 mb-6 animate-bounce" />
             <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2 text-center">CONSENSUS REACHED!</h1>
             <p className="text-2xl text-white/80 mb-8 font-light text-center">Everyone wants to visit this.</p>

             <div className="w-full max-w-xs aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border-4 border-yellow-400 mb-8 relative">
                 <img
                    src={buildingData.main_image_url || question.media_url || '/placeholder.png'}
                    alt={question.question_text}
                    className="w-full h-full object-cover"
                 />
                 <div className="absolute bottom-0 left-0 w-full p-4 bg-black/60 backdrop-blur-sm">
                     <h3 className="text-xl font-bold text-white text-center">{question.question_text}</h3>
                 </div>
             </div>

             <div className="flex flex-col gap-4 w-full max-w-sm">
                 <Button
                   className="w-full bg-white text-black hover:bg-white/90 text-lg py-6 rounded-full font-bold shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                   onClick={() => buildingId && navigate(`/building/${buildingId}`)}
                 >
                    <Play className="mr-2 h-5 w-5 fill-black" />
                    View Details
                 </Button>

                 <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 rounded-full">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Share
                 </Button>
             </div>
        </div>
    );
}

export default function RapidReview() {
  const { pollSlug, slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [activeUsers, setActiveUsers] = useState<number>(0);
  const [matchedQuestionId, setMatchedQuestionId] = useState<string | null>(null);

  // Fetch poll data
  const { data: poll, isLoading, error } = useQuery({
    queryKey: ["poll-tinder", pollSlug],
    queryFn: async () => {
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
            option:poll_options(*)
          )
        `)
        .eq("slug", pollSlug)
        .eq("group_id", group?.id)
        .single();

      if (error) throw error;

      if (data.questions) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.questions.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
      }
      return data;
    },
    refetchOnWindowFocus: false
  });

  // Extract building IDs from poll questions
  const buildingIds = useMemo(() => {
    if (!poll?.questions) return [];
    return poll.questions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((q: any) => q.media_data?.building_id || q.building_id)
      .filter(Boolean);
  }, [poll]);

  // Fetch fresh building data
  const { data: buildingsMap } = useQuery({
    queryKey: ["poll-buildings-fresh", poll?.id],
    queryFn: async () => {
      if (!buildingIds.length) return {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await supabase.from('buildings').select('*').in('id', buildingIds) as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map: Record<string, any> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data?.forEach((b: any) => map[b.id] = b);
      return map;
    },
    enabled: buildingIds.length > 0
  });

  // Initialize State (Skip already voted)
  useEffect(() => {
    if (poll && user) {
        // Find the first question user hasn't voted on
        const votedQuestionIds = new Set(
            poll.votes
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .filter((v: any) => v.user_id === user.id)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((v: any) => v.question_id)
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const firstUnvotedIndex = poll.questions.findIndex((q: any) => !votedQuestionIds.has(q.id));
        if (firstUnvotedIndex !== -1) {
            setCurrentCardIndex(firstUnvotedIndex);
        } else if (poll.questions.length > 0) {
            // User voted on everything
            setCurrentCardIndex(poll.questions.length);
        }
    }
  }, [poll, user]);

  // Handle Realtime Presence & Votes
  useEffect(() => {
    if (!poll?.id || !user) return;

    const channel = supabase.channel(`tinder-${poll.id}`);

    // Presence
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // Flatten the state to get all presence objects
        const allPresences = Object.values(state).flat() as { user_id: string }[];
        // Count unique user IDs
        const uniqueUsers = new Set(allPresences.map(p => p.user_id));
        setActiveUsers(uniqueUsers.size);
      })
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'poll_votes', filter: `poll_id=eq.${poll.id}` }, (_payload) => {
          // Invalidate query to fetch new votes
          queryClient.invalidateQueries({ queryKey: ["poll-tinder", pollSlug] });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [poll?.id, user, queryClient, pollSlug]);

  // Match Logic
  useEffect(() => {
    if (!poll || !poll.votes || activeUsers === 0) return;

    // Check each question for a match
    // A match is when 'Yes' votes >= Active Users
    const votesByQuestion: Record<string, string[]> = {}; // question_id -> list of user_ids who voted YES
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    poll.votes.forEach((v: any) => {
        const isYes = v.option?.option_text === 'Yes' || v.custom_answer === 'Yes';
        if (isYes) {
            if (!votesByQuestion[v.question_id]) votesByQuestion[v.question_id] = [];
            votesByQuestion[v.question_id].push(v.user_id);
        }
    });

    // Find a winner
    for (const qId in votesByQuestion) {
        const yesVoters = new Set(votesByQuestion[qId]);
        if (yesVoters.size >= activeUsers && activeUsers > 0) {
            // MATCH FOUND!
            setMatchedQuestionId(qId);
            break;
        }
    }

  }, [poll, activeUsers]);

  const handleSwipe = async (direction: "left" | "right") => {
      // Optimistic update: move to next card immediately
      const question = poll?.questions[currentCardIndex];
      setCurrentCardIndex(prev => prev + 1);

      if (!question || !user || !poll) return;

      const optionText = direction === "right" ? "Yes" : "No";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const option = question.options.find((o: any) => o.option_text === optionText);

      try {
          // Record Vote
          await supabase.from("poll_votes").insert({
              poll_id: poll.id,
              question_id: question.id,
              user_id: user.id,
              option_id: option?.id,
              custom_answer: optionText
          });
      } catch (err) {
          console.error("Vote failed", err);
          toast.error("Failed to save vote");
      }
  };

  const handleBookmark = async () => {
      const question = poll?.questions[currentCardIndex];
      if (!question || !user) return;

      const buildingId = question.media_data?.building_id || question.building_id;
      if (!buildingId) {
          toast.error("Cannot bookmark: missing ID");
          return;
      }

      toast.success("Added to your bucket list");

      try {
          await upsertUserBuilding({
              user_id: user.id,
              building_id: buildingId,
              status: 'pending'
          });
      } catch (e) {
          console.error(e);
          toast.error("Already in bucket list or error occurred.");
      }
  };

  if (isLoading) return <div className="flex items-center justify-center h-screen bg-black text-white"><Loader2 className="animate-spin h-12 w-12 text-primary" /></div>;
  if (error || !poll) return <div className="flex items-center justify-center h-screen bg-black text-white text-2xl">Review not found</div>;

  const cards = poll.questions || [];
  const currentCard = cards[currentCardIndex];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchedQuestion = matchedQuestionId ? poll.questions.find((q: any) => q.id === matchedQuestionId) : null;

  if (matchedQuestion) {
      const matchedBuildingId = matchedQuestion.media_data?.building_id || matchedQuestion.building_id;
      const matchedFreshData = buildingsMap?.[matchedBuildingId];
      return <WinnerCard question={matchedQuestion} freshBuildingData={matchedFreshData} />;
  }

  const currentBuildingId = currentCard?.media_data?.building_id || currentCard?.building_id;
  const currentFreshData = buildingsMap?.[currentBuildingId];

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col overflow-hidden relative">
       {/* Header */}
       <div className="absolute top-0 left-0 w-full z-20 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
          <Button variant="ghost" size="icon" className="text-white/80 hover:text-white pointer-events-auto" onClick={() => navigate(`/groups/${slug}/watchlist`)}>
             <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="flex flex-col items-center">
             <div className="text-[10px] font-bold tracking-widest text-white/50 uppercase mb-0.5">RAPID REVIEW</div>
             <div className="font-semibold text-lg drop-shadow-md text-white/90">
                {poll.title}
             </div>
             <div className="flex items-center gap-2 text-xs text-green-400 font-mono bg-green-400/10 px-2 py-0.5 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                {activeUsers} Online
             </div>
          </div>
          <div className="w-10" />
       </div>

       {/* Deck Area */}
       <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
           <AnimatePresence>
               {currentCard && (
                   <SwipeCard
                      key={currentCard.id}
                      question={currentCard}
                      freshBuildingData={currentFreshData}
                      onSwipe={handleSwipe}
                      isFront={true}
                      groupId={poll.group_id}
                   />
               )}
           </AnimatePresence>

           {/* Empty State */}
           {!currentCard && (
               <div className="text-center animate-in zoom-in duration-500">
                   <PartyPopper className="h-20 w-20 mx-auto text-yellow-400 mb-6" />
                   <h2 className="text-3xl font-bold mb-4">Review Complete!</h2>
                   <p className="text-muted-foreground text-lg mb-8">Waiting for a match...</p>
                   <div className="flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-white/20" />
                   </div>
               </div>
           )}
       </div>

       {/* Controls (Bottom) */}
       {currentCard && (
           <div className="absolute bottom-10 left-0 w-full flex justify-center items-center gap-8 z-20">
               <Button
                 variant="outline"
                 size="icon"
                 className="h-16 w-16 rounded-full border-2 border-red-500 text-red-500 bg-black/50 hover:bg-red-500 hover:text-white transition-all hover:scale-110"
                 onClick={() => handleSwipe("left")}
               >
                   <X className="h-8 w-8" />
               </Button>

               <Button
                 variant="outline"
                 size="icon"
                 className="h-12 w-12 rounded-full border-white/20 text-white/60 bg-black/50 hover:bg-white/20 hover:text-white transition-all hover:scale-105"
                 onClick={handleBookmark}
               >
                   <Bookmark className="h-5 w-5" />
               </Button>

               <Button
                 variant="outline"
                 size="icon"
                 className="h-16 w-16 rounded-full border-2 border-green-500 text-green-500 bg-black/50 hover:bg-green-500 hover:text-white transition-all hover:scale-110"
                 onClick={() => handleSwipe("right")}
               >
                   <Heart className="h-8 w-8 fill-current" />
               </Button>
           </div>
       )}
    </div>
  );
}
