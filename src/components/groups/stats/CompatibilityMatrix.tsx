import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface CompatibilityMatrixProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allPairs: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    members: any[];
}

export function CompatibilityMatrix({ allPairs, members }: CompatibilityMatrixProps) {
    if (!members || members.length < 2) return null;

    // Create a matrix map for easy lookup: matrix[u1][u2] = score
    const matrix: Record<string, Record<string, number>> = {};

    // Initialize matrix
    members.forEach(m1 => {
        matrix[m1.user.id] = {};
        members.forEach(m2 => {
            if (m1.user.id === m2.user.id) {
                matrix[m1.user.id][m2.user.id] = 1.0; // Self affinity is 1
            } else {
                matrix[m1.user.id][m2.user.id] = 0; // Default
            }
        });
    });

    // Fill with data
    if (allPairs && Array.isArray(allPairs)) {
        allPairs.forEach(p => {
            if (matrix[p.u1] && matrix[p.u2]) { // Ensure members still exist
                matrix[p.u1][p.u2] = p.score;
                matrix[p.u2][p.u1] = p.score; // Symmetric
            }
        });
    }

    // Helper to get color
    const getColor = (score: number, isSelf: boolean) => {
        if (isSelf) return "bg-muted"; // Diagonal

        // 0.7 - 1.0: High Match (Green)
        if (score >= 0.9) return "bg-green-600";
        if (score >= 0.8) return "bg-green-500";
        if (score >= 0.7) return "bg-green-400";

        // 0.4 - 0.7: Neutral (Gray/Muted)
        if (score >= 0.6) return "bg-gray-400";
        if (score >= 0.5) return "bg-gray-300";
        if (score >= 0.4) return "bg-gray-200 dark:bg-gray-800";

        // 0.0 - 0.4: Low Match (Red)
        if (score >= 0.3) return "bg-red-300";
        if (score >= 0.2) return "bg-red-400";
        return "bg-red-500";
    };

    return (
        <Card className="border-none shadow-sm bg-accent/5 overflow-x-auto">
            <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium">Similarity Grid</CardTitle>
                <CardDescription>Heatmap of affinity scores</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="min-w-[300px]">
                    {/* Header Row */}
                    <div className="flex mb-2">
                        <div className="w-8 h-8 mr-1 flex-shrink-0" /> {/* Spacer */}
                        {members.map(m => (
                            <div key={m.user.id} className="w-8 h-8 mr-1 flex-shrink-0 flex items-center justify-center">
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <div className="cursor-help">
                                            <Avatar className="w-6 h-6">
                                                <AvatarImage src={m.user.avatar_url} />
                                                <AvatarFallback className="text-[8px]">{m.user.username?.[0]}</AvatarFallback>
                                            </Avatar>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                        <p className="text-xs font-semibold">{m.user.username}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        ))}
                    </div>

                    {/* Rows */}
                    {members.map(rowMember => (
                        <div key={rowMember.user.id} className="flex mb-1">
                             {/* Row Label */}
                             <div className="w-8 h-8 mr-1 flex-shrink-0 flex items-center justify-center">
                                <Tooltip delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <div className="cursor-help">
                                            <Avatar className="w-6 h-6">
                                                <AvatarImage src={rowMember.user.avatar_url} />
                                                <AvatarFallback className="text-[8px]">{rowMember.user.username?.[0]}</AvatarFallback>
                                            </Avatar>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                        <p className="text-xs font-semibold">{rowMember.user.username}</p>
                                    </TooltipContent>
                                </Tooltip>
                             </div>

                             {/* Cells */}
                             {members.map(colMember => {
                                 const isSelf = rowMember.user.id === colMember.user.id;
                                 const score = matrix[rowMember.user.id][colMember.user.id];
                                 const colorClass = getColor(score, isSelf);

                                 // Check if actually correlated (exists in allPairs or self)
                                 const hasData = isSelf || (allPairs && Array.isArray(allPairs) && allPairs.some(p => (p.u1 === rowMember.user.id && p.u2 === colMember.user.id) || (p.u1 === colMember.user.id && p.u2 === rowMember.user.id)));

                                 return (
                                     <Tooltip key={colMember.user.id} delayDuration={0}>
                                         <TooltipTrigger asChild>
                                            <div
                                                className={`w-8 h-8 mr-1 flex-shrink-0 rounded ${hasData ? colorClass : "bg-muted/10"} transition-all hover:scale-110 cursor-help`}
                                            />
                                         </TooltipTrigger>
                                         <TooltipContent>
                                             <div className="text-xs">
                                                 <p className="font-bold">{rowMember.user.username} + {colMember.user.username}</p>
                                                 {isSelf ? "Self Love" : hasData ? `Affinity: ${(score * 100).toFixed(0)}%` : "Not enough shared data"}
                                             </div>
                                         </TooltipContent>
                                     </Tooltip>
                                 );
                             })}
                        </div>
                    ))}
                </div>

                <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded"></div> High Match</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-300 rounded"></div> Neutral</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded"></div> Low Match</div>
                </div>
            </CardContent>
        </Card>
    );
}
