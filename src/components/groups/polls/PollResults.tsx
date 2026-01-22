
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock, CheckCircle2, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface PollResultsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  poll: any;
  hasVoted?: boolean;
  isAdmin?: boolean;
  largeAvatars?: boolean;
}

export function PollResults({ poll, hasVoted, isAdmin = false, largeAvatars = false }: PollResultsProps) {
    const { user } = useAuth();
    // If results are hidden and poll is still open (or published)
    // Note: Published polls shouldn't even show this component as they hide questions,
    // but just in case, we also hide results.
    // Admins can always see results.
    const resultsHidden = !isAdmin && ((poll.status === 'open' && !poll.show_results_before_close) || poll.status === 'published');

    // Explicit override for admins - although logic above handles it, this makes it clearer
    // and ensures if there's any state mismatch, admins get priority.
    if (resultsHidden && !isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 border rounded-lg bg-muted/20">
                <div className="p-3 bg-muted rounded-full">
                    {hasVoted ? (
                         <CheckCircle2 className="w-6 h-6 text-green-600" />
                    ) : (
                         <Lock className="w-6 h-6 text-muted-foreground" />
                    )}
                </div>
                <div className="space-y-1">
                    <h3 className="font-semibold text-lg">{hasVoted ? "Vote Recorded" : "Results Hidden"}</h3>
                    <p className="text-muted-foreground max-w-sm">
                        {poll.status === 'published'
                            ? "Voting has not started yet."
                            : hasVoted
                                ? "Your results were logged correctly! You will be able to see the results as soon as the poll is closed."
                                : "Results will be visible when the poll is closed. Please come back later."
                        }
                    </p>
                </div>
            </div>
        );
    }

    // Calculate score for quiz
    let userScore = 0;
    let totalQuestions = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isQuiz = poll.type === 'quiz' || poll.questions.some((q: any) => q.options.some((o: any) => o.is_correct));

    if (isQuiz && user) {
        totalQuestions = poll.questions.length;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        poll.questions.forEach((q: any) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const userVote = poll.votes.find((v: any) => v.question_id === q.id && v.user_id === user.id);
            if (userVote && userVote.option_id) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const selectedOption = q.options.find((o: any) => o.id === userVote.option_id);
                if (selectedOption && selectedOption.is_correct) {
                    userScore++;
                }
            }
        });
    }

    const getScoreMessage = (score: number, total: number) => {
        if (total === 0) return "";
        const percentage = (score / total) * 100;

        if (percentage === 100) return "Perfect score! 🎉";
        if (percentage >= 80) return "Great job! 🌟";
        if (percentage >= 60) return "Good effort! 👍";
        if (percentage >= 40) return "Not bad! 🤔";
        return "Keep trying! 📚";
    };

    // Helper to get youtube ID from URL
    const getYoutubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderMedia = (q: any) => {
        if (q.media_type === 'image' && q.media_url) {
            return (
                <div className="rounded-lg overflow-hidden max-h-60 w-full bg-muted">
                    <img src={q.media_url} className="w-full h-full object-contain" alt="Question attachment" />
                </div>
            );
        }
        if (q.media_type === 'video' && q.media_url) {
            return (
                <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
                    {getYoutubeId(q.media_url) ? (
                        <iframe
                           width="100%" height="100%"
                           src={`https://www.youtube.com/embed/${getYoutubeId(q.media_url)}?modestbranding=1&rel=0`}
                           frameBorder="0"
                           allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                           allowFullScreen
                        ></iframe>
                    ) : (
                        <a href={q.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center h-full text-white underline">
                            Open Video Link
                        </a>
                    )}
                </div>
            );
        }
        if (q.media_type === 'building' && q.media_data) {
             return (
                 <div className="relative w-full h-full min-h-[300px] md:min-h-[400px] bg-muted/10 rounded-lg overflow-hidden">
                     {q.media_data.main_image_url ? (
                         <img
                            src={q.media_data.main_image_url}
                            className="w-full h-full object-contain"
                            alt={q.media_data.name || "Building Image"}
                         />
                     ) : (
                         <div className="flex items-center justify-center h-full text-muted-foreground">No Image Available</div>
                     )}
                 </div>
             );
        }
        return null;
    };

    return (
        <div className="space-y-6">
            {isQuiz && user && (
                <div className="bg-muted/30 border rounded-lg p-6 flex flex-col items-center text-center space-y-2">
                    <div className="p-3 bg-primary/10 rounded-full mb-2">
                        <Trophy className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold">You scored {userScore}/{totalQuestions}</h3>
                    <p className="text-muted-foreground">
                        {getScoreMessage(userScore, totalQuestions)}
                    </p>
                </div>
            )}

            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {poll.questions.map((q: any) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const qVotes = poll.votes.filter((v: any) => v.question_id === q.id);
                const total = qVotes.length;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const isQuizQuestion = q.options.some((o: any) => o.is_correct);
                const hasMedia = (q.media_type && (q.media_url || q.media_data));

                // Count per option
                const counts: Record<string, number> = {};
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const voters: Record<string, any[]> = {}; // Store voter profiles per option

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                q.options.forEach((o: any) => {
                    counts[o.id] = 0;
                    voters[o.id] = [];
                });

                let customCount = 0;
                const customAnswers: string[] = [];

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                qVotes.forEach((v: any) => {
                    if (v.option_id) {
                        counts[v.option_id] = (counts[v.option_id] || 0) + 1;
                        if (v.profiles) {
                            voters[v.option_id].push(v.profiles);
                        }
                    } else if (v.custom_answer) {
                        customCount++;
                        customAnswers.push(v.custom_answer);
                    }
                });

                // Determine user's vote for this question
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const userVote = user ? poll.votes.find((v: any) => v.question_id === q.id && v.user_id === user.id) : null;
                const userOptionId = userVote?.option_id;

                return (
                    <div key={q.id} className="space-y-4">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">{q.question_text}</h4>

                        <div className={cn("grid gap-6", hasMedia ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
                            {/* Left Column: Results */}
                            <div className="space-y-4 order-2 md:order-1">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {q.options.map((opt: any) => {
                                    const count = counts[opt.id] || 0;
                                    const percentage = total > 0 ? (count / total) * 100 : 0;
                                    const optVoters = voters[opt.id] || [];
                                    const isCorrect = opt.is_correct;
                                    const isUserSelection = userOptionId === opt.id;

                                    // Style logic
                                    let indicatorClass = "";
                                    let textClass = "";

                                    if (isQuizQuestion) {
                                        if (isCorrect) {
                                            indicatorClass = "bg-green-500";
                                            textClass = "text-green-600 dark:text-green-400";
                                        } else if (isUserSelection) {
                                            indicatorClass = "bg-red-500"; // Wrong answer selected by user
                                            textClass = "text-red-600 dark:text-red-400";
                                        }
                                    } else {
                                        // Standard poll
                                        if (isUserSelection) {
                                            indicatorClass = "bg-primary";
                                            textClass = "text-primary font-bold";
                                        }
                                    }

                                    return (
                                        <div key={opt.id} className="flex gap-4 items-end">
                                            {/* Option Image */}
                                            {opt.media_url && (
                                                <div className="w-12 h-16 shrink-0 rounded-md overflow-hidden bg-muted/40 opacity-70 grayscale-[30%]">
                                                    <img
                                                        src={opt.media_url}
                                                        className="w-full h-full object-cover"
                                                        alt="Option"
                                                    />
                                                </div>
                                            )}

                                            <div className="flex-1 space-y-2">
                                                <div className="flex justify-between text-sm items-end">
                                                    <span className={cn("font-medium flex items-center gap-2", textClass)}>
                                                        {opt.option_text}
                                                        {isCorrect && <CheckCircle2 className="w-4 h-4" />}
                                                        {isUserSelection && !isCorrect && isQuizQuestion && <span className="text-xs ml-1">(Your Answer)</span>}
                                                    </span>
                                                    <span className="text-muted-foreground text-xs">{Math.round(percentage)}% ({count})</span>
                                                </div>
                                                <Progress
                                                    value={percentage}
                                                    className="h-3"
                                                    indicatorClassName={cn(indicatorClass)}
                                                />

                                                {/* Avatars */}
                                                {optVoters.length > 0 && (
                                                    <div className={cn("flex py-2 px-1", largeAvatars ? "-space-x-4" : "-space-x-3")}>
                                                    <TooltipProvider delayDuration={0}>
                                                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                        {optVoters.map((profile: any, i: number) => (
                                                            <Tooltip key={i}>
                                                                <TooltipTrigger asChild>
                                                                    <Avatar className={cn(
                                                                        "border-2 border-background cursor-help transition-transform hover:z-10 hover:scale-110",
                                                                        largeAvatars ? "h-14 w-14" : "h-10 w-10",
                                                                        isCorrect && "ring-2 ring-green-500 border-transparent"
                                                                    )}>
                                                                        <AvatarImage src={profile.avatar_url} />
                                                                        <AvatarFallback className={largeAvatars ? "text-lg" : "text-xs"}>
                                                                            {profile.username?.substring(0, 2).toUpperCase()}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p className="text-xs">{profile.username}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        ))}
                                                    </TooltipProvider>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    );
                                })}

                                {q.allow_custom_answer && customCount > 0 && (
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium">Other</span>
                                            <span className="text-muted-foreground">{total > 0 ? Math.round((customCount / total) * 100) : 0}% ({customCount})</span>
                                        </div>
                                        <Progress value={(customCount / total) * 100} className="h-2" />
                                        <div className="text-xs text-muted-foreground pt-1 pl-2 border-l-2 italic">
                                            {[...new Set(customAnswers)].slice(0, 5).join(", ")}
                                            {new Set(customAnswers).size > 5 && ", ..."}
                                        </div>
                                    </div>
                                )}

                                <div className="text-xs text-right text-muted-foreground pt-1">
                                    {total} {total === 1 ? 'vote' : 'votes'}
                                </div>
                            </div>

                             {/* Right Column: Media */}
                             {hasMedia && (
                                  <div className="order-1 md:order-2">
                                       {renderMedia(q)}
                                  </div>
                             )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
