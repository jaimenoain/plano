import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, PenTool, TrendingUp, User } from "lucide-react";

interface MonthlyStats {
  contributor: {
    member: any;
    value: number;
  };
  reviewer: {
    member: any;
    value: number;
  };
  trending: {
    title: string;
    poster_path: string | null;
    count: number;
  };
}

export function MonthlyDashboard({ stats }: { stats: MonthlyStats }) {
  if (!stats) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                This Month
            </h2>
            <p className="text-xs text-muted-foreground">Live stats for {new Date().toLocaleString('default', { month: 'long' })}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Contributor */}
        {stats.contributor && stats.contributor.member && (
             <StatCard
                label="Top Contributor"
                icon={<Zap className="w-3 h-3 text-yellow-500" />}
                value={stats.contributor.value}
                subtext="logs logged"
                member={stats.contributor.member}
                color="bg-yellow-500/10 border-yellow-500/20"
             />
        )}

        {/* Reviewer */}
        {stats.reviewer && stats.reviewer.member && (
             <StatCard
                label="Top Reviewer"
                icon={<PenTool className="w-3 h-3 text-blue-500" />}
                value={stats.reviewer.value.toLocaleString()}
                subtext="words written"
                member={stats.reviewer.member}
                color="bg-blue-500/10 border-blue-500/20"
             />
        )}

         {/* Trending */}
        {stats.trending && stats.trending.title && (
            <Card className="bg-card/50 border-white/5 overflow-hidden relative group">
                {stats.trending.poster_path && (
                    <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity">
                         <img src={`https://image.tmdb.org/t/p/w200${stats.trending.poster_path}`} className="w-full h-full object-cover" />
                         <div className="absolute inset-0 bg-gradient-to-l from-background to-transparent" />
                    </div>
                )}
                <CardContent className="p-4 relative z-10 flex flex-col justify-between h-full">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-md bg-red-500/20 text-red-500">
                             <TrendingUp className="w-3 h-3" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trending</span>
                    </div>
                    <div>
                         <div className="font-bold truncate pr-2">{stats.trending.title}</div>
                         <div className="text-xs text-muted-foreground">{stats.trending.count} members watched</div>
                    </div>
                </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, icon, value, subtext, member, color }: any) {
    return (
        <Card className={`border-l-4 ${color} bg-card/50 shadow-sm`}>
            <CardContent className="p-3 flex items-center justify-between">
                <div>
                     <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                            {icon} {label}
                        </span>
                     </div>
                     <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8 border border-white/10">
                            <AvatarImage src={member.avatar_url} />
                            <AvatarFallback>{member.username?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                             <div className="text-sm font-bold leading-none">{member.username}</div>
                             <div className="text-[10px] text-muted-foreground mt-0.5">
                                 <span className="font-mono font-semibold text-foreground">{value}</span> {subtext}
                             </div>
                        </div>
                     </div>
                </div>
            </CardContent>
        </Card>
    )
}
