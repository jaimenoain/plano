import { MutualAffinityUser } from "@/types/cine-sync";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface MutualAffinityRowProps {
    users: MutualAffinityUser[];
}

export function MutualAffinityRow({ users }: MutualAffinityRowProps) {
    if (!users || users.length === 0) {
        return null;
    }

    return (
        <div className="w-full py-4 border-b border-border/40 bg-card/30">
            <div className="px-4 mb-3">
                 <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    High Affinity with both of you
                </h3>
            </div>

            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex w-max space-x-4 px-4 pb-4">
                    {users.map((user) => (
                        <Link
                            key={user.id}
                            to={`/profile/${user.id}`}
                            className="group flex flex-col items-center gap-2 w-20"
                        >
                            <div className="relative">
                                <Avatar className="h-14 w-14 border-2 border-transparent group-hover:border-primary/50 transition-colors">
                                    <AvatarImage src={user.avatar_url || undefined} alt={user.username || "User"} />
                                    <AvatarFallback className="bg-secondary text-secondary-foreground">{user.username?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
                                </Avatar>
                                <div className={cn(
                                    "absolute -bottom-2 -right-1 flex items-center justify-center rounded-full text-[10px] font-bold h-6 w-8 border-2 border-background shadow-sm",
                                    getScoreColor(user.combined_score)
                                )}>
                                    {Math.round(user.combined_score * 100)}%
                                </div>
                            </div>
                            <span className="text-xs text-center truncate w-full text-muted-foreground group-hover:text-foreground transition-colors">
                                {user.username}
                            </span>
                        </Link>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>
    );
}

function getScoreColor(score: number) {
    if (score >= 0.7) return "bg-green-500 text-white border-green-600";
    if (score >= 0.4) return "bg-zinc-500 text-white border-zinc-600";
    return "bg-red-500 text-white border-red-600";
}
