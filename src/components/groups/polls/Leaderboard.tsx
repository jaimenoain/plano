import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Award } from "lucide-react";

interface LeaderboardProps {
    poll: any;
}

export function Leaderboard({ poll }: LeaderboardProps) {
    if (!poll.questions || !poll.votes) return null;

    // 1. Identify correct options
    const correctOptions = new Set<string>();
    poll.questions.forEach((q: any) => {
        if (q.options) {
            q.options.forEach((o: any) => {
                if (o.is_correct) {
                    correctOptions.add(o.id);
                }
            });
        }
    });

    // 2. Calculate scores
    const userScores: Record<string, { score: number, profile: any }> = {};

    poll.votes.forEach((v: any) => {
        if (v.option_id && correctOptions.has(v.option_id)) {
            if (!userScores[v.user_id]) {
                userScores[v.user_id] = { score: 0, profile: v.profiles };
            }
            userScores[v.user_id].score++;
        } else if (!userScores[v.user_id] && v.profiles) {
             // Ensure user is in list even with 0 points if they voted
             userScores[v.user_id] = { score: 0, profile: v.profiles };
        }
    });

    // 3. Convert to array and sort
    const rankedUsers = Object.values(userScores).sort((a, b) => b.score - a.score);

    // Get max possible score
    const maxScore = poll.questions.length; // Assuming 1 correct answer per question generally, or at least 1 point per Q

    return (
        <Card className="w-full max-w-2xl mx-auto border-none shadow-none bg-transparent">
            <CardHeader className="text-center pb-8">
                <CardTitle className="text-4xl font-bold flex flex-col items-center gap-4">
                    <Trophy className="w-20 h-20 text-yellow-400 animate-bounce" />
                    <span>Leaderboard</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {rankedUsers.map((item, index) => {
                    let rankIcon = null;
                    let rankClass = "bg-zinc-800/50";
                    let textClass = "text-white";

                    if (index === 0) {
                        rankIcon = <Trophy className="w-6 h-6 text-yellow-400" />;
                        rankClass = "bg-yellow-500/20 border-yellow-500/50";
                        textClass = "text-yellow-100 font-bold";
                    } else if (index === 1) {
                        rankIcon = <Medal className="w-6 h-6 text-zinc-300" />;
                        rankClass = "bg-zinc-400/20 border-zinc-400/50";
                        textClass = "text-zinc-100 font-semibold";
                    } else if (index === 2) {
                        rankIcon = <Award className="w-6 h-6 text-amber-600" />;
                        rankClass = "bg-amber-600/20 border-amber-600/50";
                        textClass = "text-amber-100 font-semibold";
                    }

                    return (
                        <div
                            key={index}
                            className={`flex items-center p-4 rounded-xl border ${rankClass} transition-all hover:scale-[1.02]`}
                        >
                            <div className="flex-none w-12 text-2xl font-mono font-bold opacity-50 flex justify-center">
                                {index + 1}
                            </div>
                            <Avatar className="h-12 w-12 border-2 border-white/10 mr-4">
                                <AvatarImage src={item.profile?.avatar_url} />
                                <AvatarFallback>{item.profile?.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <div className={`text-xl ${textClass}`}>{item.profile?.username}</div>
                            </div>
                            <div className="flex-none text-right">
                                <div className="text-2xl font-bold">{item.score} <span className="text-sm font-normal text-muted-foreground">/ {maxScore}</span></div>
                            </div>
                            {rankIcon && <div className="ml-4">{rankIcon}</div>}
                        </div>
                    );
                })}

                {rankedUsers.length === 0 && (
                    <div className="text-center text-muted-foreground p-8">
                        No results to display.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
