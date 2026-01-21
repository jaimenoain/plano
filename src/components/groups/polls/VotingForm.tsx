import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { Lock } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function VotingForm({ poll, onVoteSuccess }: { poll: any, onVoteSuccess: () => void }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [selections, setSelections] = useState<Record<string, { optionId: string | null, customText: string | null }>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const queryClient = useQueryClient();

    // Guard Clause: HIDE QUESTIONS if poll is PUBLISHED (Teaser mode)
    if (poll.status === 'published') {
        return (
             <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 border rounded-lg bg-muted/20">
                <div className="p-3 bg-muted rounded-full">
                    <Lock className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                    <h3 className="font-semibold text-xl">Voting Opens Soon</h3>
                    <p className="text-muted-foreground max-w-sm">
                        This poll is currently upcoming. Questions are hidden until voting begins.
                    </p>
                </div>
            </div>
        );
    }

    // Pre-fill selections if user has already voted (for editing)
    useEffect(() => {
        if (poll.votes && user) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const userVotes = poll.votes.filter((v: any) => v.user_id === user.id);
            if (userVotes.length > 0) {
                const initialSelections: Record<string, { optionId: string | null, customText: string | null }> = {};
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                userVotes.forEach((v: any) => {
                    initialSelections[v.question_id] = {
                        optionId: v.option_id,
                        customText: v.custom_answer
                    };
                });
                setSelections(initialSelections);
            }
        }
    }, [poll, user]);

    const handleOptionSelect = (questionId: string, optionId: string) => {
        setSelections(prev => ({
            ...prev,
            [questionId]: { optionId, customText: null }
        }));
    }

    const handleCustomInput = (questionId: string, text: string) => {
        setSelections(prev => ({
            ...prev,
            [questionId]: { optionId: null, customText: text }
        }));
    }

    const handleSubmit = async () => {
        if (!user) return;

        setIsSubmitting(true);
        try {
            const votesToInsert = Object.entries(selections).map(([qId, val]) => ({
                poll_id: poll.id,
                question_id: qId,
                user_id: user.id,
                option_id: val.optionId,
                custom_answer: val.customText
            }));

            // Check if all questions are answered
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const unanswered = poll.questions.filter((q: any) => {
                 const selection = selections[q.id];
                 const hasOption = selection?.optionId;
                 const hasCustom = selection?.customText !== null && selection?.customText !== undefined && selection?.customText.trim() !== "";
                 return !hasOption && !hasCustom;
            });

            if (unanswered.length > 0) {
                 toast({ variant: "destructive", title: "Incomplete", description: "Please answer all questions." });
                 setIsSubmitting(false);
                 return;
            }

            // Delete previous votes first to support editing
            const { error: deleteError } = await supabase
                .from("poll_votes")
                .delete()
                .eq("poll_id", poll.id)
                .eq("user_id", user.id);

            if (deleteError) throw deleteError;

            // Insert new votes
            const { error } = await supabase.from("poll_votes").insert(votesToInsert);
            if (error) throw error;

            await queryClient.invalidateQueries({ queryKey: ["poll", poll.id] });
            // Also invalidate query using slug which is used in PollDetails
            if (poll.slug) {
                await queryClient.invalidateQueries({ queryKey: ["poll", poll.slug] });
            }
            // Also invalidate list queries to update participant counts
            await queryClient.invalidateQueries({ queryKey: ["polls"] });

            toast({ title: "Voted!", description: "Your vote has been recorded." });
            onVoteSuccess();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error", description: err.message });
        } finally {
            setIsSubmitting(false);
        }
    }

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
        if (q.media_type === 'film' && q.media_data) {
             return (
                 <div className="relative w-full h-full min-h-[400px] bg-muted/10 rounded-lg overflow-hidden">
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
        <div className="space-y-12">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {poll.questions.map((q: any) => {
                const hasMedia = (q.media_type && (q.media_url || q.media_data));

                return (
                    <div key={q.id} className="space-y-4">
                        <h4 className="font-semibold text-2xl w-full break-words">{q.question_text}</h4>

                        {/*
                            Constraint width on desktop if:
                            1. No media attachment for the question (layout is single column)
                            2. Response type is visual (image/film) - prevents options from becoming massive
                        */}
                        <div className={cn("grid gap-6", hasMedia ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
                             {/* Options Column - Left */}
                             <div className={cn(
                                 "space-y-3 order-2 md:order-1 h-full",
                                 (!hasMedia && (q.response_type === 'image' || q.response_type === 'film')) && "md:w-1/2"
                             )}>
                                <RadioGroup
                                    value={selections[q.id]?.optionId || (selections[q.id]?.customText !== null ? "custom" : "")}
                                    onValueChange={(val) => {
                                        if (val !== "custom") {
                                            handleOptionSelect(q.id, val);
                                        } else {
                                            setSelections(prev => ({ ...prev, [q.id]: { optionId: null, customText: "" } }));
                                        }
                                    }}
                                    className={cn("grid gap-3 content-start",
                                        (q.response_type === 'image' || q.response_type === 'film' || q.response_type === 'person')
                                            ? (q.options.length <= 4 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-3")
                                            : "grid-cols-1"
                                    )}
                                >
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    {q.options.map((opt: any) => (
                                        <div key={opt.id} className={cn(
                                            "relative flex cursor-pointer rounded-lg border bg-card p-4 shadow-sm focus:outline-none",
                                            selections[q.id]?.optionId === opt.id ? "border-primary ring-1 ring-primary" : "border-border"
                                        )} onClick={() => handleOptionSelect(q.id, opt.id)}>
                                            <RadioGroupItem value={opt.id} id={opt.id} className="sr-only" />

                                            {q.response_type === 'text' && (
                                                <Label htmlFor={opt.id} className="flex-1 cursor-pointer">{opt.option_text}</Label>
                                            )}

                                            {q.response_type === 'image' && (
                                                <div className="w-full space-y-2">
                                                    <div className="aspect-square w-full rounded-md bg-muted overflow-hidden">
                                                        {opt.media_url ? (
                                                            <img src={opt.media_url} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No Image</div>
                                                        )}
                                                    </div>
                                                    {opt.option_text && opt.option_text !== "Image Option" && (
                                                        <div className="text-center text-sm font-medium">{opt.option_text}</div>
                                                    )}
                                                </div>
                                            )}

                                            {q.response_type === 'film' && (
                                                <div className="w-full space-y-2">
                                                    <div className="aspect-[2/3] w-full rounded-md bg-muted overflow-hidden">
                                                         {opt.media_url ? (
                                                            <img src={opt.media_url} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No Poster</div>
                                                        )}
                                                    </div>
                                                    <div className="text-center text-sm font-medium line-clamp-2">{opt.option_text}</div>
                                                </div>
                                            )}

                                            {q.response_type === 'person' && (
                                                <div className="w-full space-y-2">
                                                    <div className="aspect-[2/3] w-full rounded-md bg-muted overflow-hidden">
                                                         {opt.media_url ? (
                                                            <img src={opt.media_url} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No Photo</div>
                                                        )}
                                                    </div>
                                                    <div className="text-center text-sm font-medium line-clamp-2">{opt.option_text}</div>
                                                </div>
                                            )}

                                        </div>
                                    ))}

                                    {q.allow_custom_answer && (
                                        <div className={cn("flex items-center space-x-2 mt-2 p-2", (q.response_type === 'image' || q.response_type === 'film' || q.response_type === 'person') && "col-span-2")}>
                                            <RadioGroupItem value="custom" id={`custom-${q.id}`} />
                                            <Label htmlFor={`custom-${q.id}`}>Other</Label>
                                            <Input
                                                className="h-8 w-full max-w-xs"
                                                placeholder="Type your answer..."
                                                value={selections[q.id]?.customText || ""}
                                                onChange={(e) => handleCustomInput(q.id, e.target.value)}
                                                onFocus={() => {
                                                    setSelections(prev => ({ ...prev, [q.id]: { optionId: null, customText: "" } }));
                                                }}
                                            />
                                        </div>
                                    )}
                                </RadioGroup>
                             </div>

                             {/* Media Column - Right */}
                             {hasMedia && (
                                 <div className="order-1 md:order-2">
                                     {renderMedia(q)}
                                 </div>
                             )}
                        </div>
                    </div>
                );
            })}
            <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
                Vote
            </Button>
        </div>
    )
}
