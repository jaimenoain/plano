import { useMemo, useState } from "react";
import { Bar, BarChart, XAxis, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Activity, Clock, Search, Star, Target, Trophy, Zap, PenTool, Brain, Shuffle, Video, CalendarClock } from "lucide-react";
import { Podium } from "./stats/Podium";
import { MonthlyDashboard } from "./stats/MonthlyDashboard";
import { RatingDistribution } from "./stats/RatingDistribution";
import { Leaderboards } from "./stats/Leaderboards";
import { TasteWeb } from "./stats/TasteWeb";
import { CompatibilityMatrix } from "./stats/CompatibilityMatrix";
import { useAuth } from "@/hooks/useAuth";

interface GroupStatsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cachedStats: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  members: any[];
}

// Define chart configuration for shadcn/ui charts
const chartConfig = {
  value: {
    label: "Value",
    color: "hsl(var(--primary))",
  },
  rating: {
    label: "Rating",
    color: "hsl(var(--primary))",
  },
};

export function GroupStats({ cachedStats, members }: GroupStatsProps) {
  const [scope, setScope] = useState<"session" | "global">("session");

  // If no cached stats are available yet
  if (!cachedStats || (!cachedStats.global && !cachedStats.session)) {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
            <div className="bg-muted p-4 rounded-full">
                <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
                <h3 className="text-lg font-medium">Stats Calculation in Progress</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-1">
                    Group statistics are calculated in the background. Please interact with the group (e.g. rate a building) to trigger an update, or check back later.
                </p>
            </div>
        </div>
    );
  }

  const currentStats = scope === "session" ? cachedStats.session : cachedStats.global;
  const thisMonthStats = currentStats?.thisMonth || cachedStats.thisMonth;

  if (!currentStats) {
       return (
        <div className="p-8 text-center text-muted-foreground">
            No stats available for {scope} scope.
             <div className="flex justify-center mt-4">
                 <button
                     onClick={() => setScope(scope === "session" ? "global" : "session")}
                     className="text-primary underline text-sm"
                 >
                     Switch to {scope === "session" ? "Global" : "Session"}
                 </button>
             </div>
        </div>
       );
  }

  const { vibeMetrics, superlatives, compatibility, contentDNA, hiddenGems, distributions, leaderboards } = currentStats;

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">

      {/* 1. THE SCOPE TOGGLE */}
      <div className="flex flex-col items-center justify-center space-y-2 sticky top-14 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 border-b border-white/5">
        <div className="bg-muted/50 p-1 rounded-full flex relative">
           <button
             onClick={() => setScope("session")}
             className={`px-6 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 ${scope === 'session' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
           >
             Session Canon
           </button>
           <button
             onClick={() => setScope("global")}
             className={`px-6 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 ${scope === 'global' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
           >
             Full History
           </button>
        </div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
          {scope === "session" ? "Official Selections Only" : "All Member Activity"}
        </p>
      </div>

      {/* 1.5 OVERALL METRICS */}
      {vibeMetrics && (
        <div className="grid grid-cols-3 gap-2 md:gap-4 text-center">
            <div className="bg-muted/20 p-4 rounded-xl border border-white/5">
                <div className="text-2xl md:text-3xl font-black">{cachedStats.sessionCount || 0}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Sessions</div>
            </div>
            <div className="bg-muted/20 p-4 rounded-xl border border-white/5">
                <div className="text-2xl md:text-3xl font-black">{vibeMetrics.uniqueFilmCount}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Buildings</div>
            </div>
            <div className="bg-muted/20 p-4 rounded-xl border border-white/5">
                <div className="text-2xl md:text-3xl font-black">{vibeMetrics.ratingCount}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">Ratings</div>
            </div>
        </div>
      )}

      {/* 0. THIS MONTH DASHBOARD (Moved inside scope) */}
      {thisMonthStats && <MonthlyDashboard stats={thisMonthStats} />}

      {vibeMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Snob Index */}
          <Card className="border-none shadow-sm bg-accent/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4" /> Snob Index
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {vibeMetrics.snobDiff > 0 ? "+" : ""}{vibeMetrics.snobDiff.toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                vs. Public Average
                <span className="block opacity-70">
                  (Us: {vibeMetrics.avgRating.toFixed(1)} vs Public: {vibeMetrics.avgTmdb?.toFixed(1) || 0})
                </span>
              </p>
            </CardContent>
          </Card>

          {/* Time Sink -> Building Count (Legacy mapping) */}
          <Card className="border-none shadow-sm bg-accent/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Trophy className="h-4 w-4" /> Collection Size
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {vibeMetrics.uniqueFilmCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Unique buildings explored
              </p>
            </CardContent>
          </Card>

          {/* Polarization */}
          <Card className="border-none shadow-sm bg-accent/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" /> Polarization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {vibeMetrics.stdDev.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Standard Deviation
                <span className="block opacity-70">
                  {vibeMetrics.stdDev < 1 ? "Consensus" : vibeMetrics.stdDev > 2 ? "Divisive" : "Healthy Debate"}
                </span>
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. HALL OF FAME (PODIUMS) */}
      <div className="space-y-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Trophy className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-[0.2em]">Hall of Fame</h3>
              <Trophy className="w-4 h-4" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {superlatives && (
                <>
                <Podium
                    title="The Optimist"
                    description="Highest average rating"
                    icon={<Star className="h-4 w-4 text-yellow-500" />}
                    members={superlatives.optimist}
                />
                <Podium
                    title="The Hater"
                    description="Lowest average rating"
                    icon={<Zap className="h-4 w-4 text-red-500" />}
                    members={superlatives.hater}
                />
                <Podium
                    title={scope === 'session' ? "The Participant" : "The Explorer"}
                    description={scope === 'session' ? "Most session buildings visited" : "Most buildings rated globally"}
                    icon={<Video className="h-4 w-4 text-primary" />}
                    members={superlatives.prolific}
                    unit="logs"
                />
                <Podium
                    title="The Wordsmith"
                    description="Longest average reviews"
                    icon={<PenTool className="h-4 w-4 text-blue-500" />}
                    members={superlatives.wordsmith}
                    unit="chars"
                />
                <Podium
                    title="The Novelist"
                    description="Most words written total"
                    icon={<Brain className="h-4 w-4 text-purple-500" />}
                    members={superlatives.novelist}
                    unit="words"
                />
                {/* New Awards */}
                <Podium
                    title="The Contrarian"
                    description="Greatest deviation from group avg"
                    icon={<Shuffle className="h-4 w-4 text-orange-500" />}
                    members={superlatives.contrarian}
                    unit="diff"
                />
                <Podium
                    title="The Time Traveler"
                    description="Oldest buildings visited (avg gap)"
                    icon={<CalendarClock className="h-4 w-4 text-teal-500" />}
                    members={superlatives.timeTraveler}
                    unit="yrs"
                />
                {superlatives.completist && (
                     <Podium
                        title="Architect Devotee"
                        description="Most buildings by single architect"
                        icon={<Video className="h-4 w-4 text-pink-500" />}
                        members={superlatives.completist}
                        unit="bldgs"
                    />
                )}
                {scope === 'session' && superlatives.quickestDraw && (
                    <Podium
                        title="Quickest Draw"
                        description="Fastest to rate after session"
                        icon={<Clock className="h-4 w-4 text-green-500" />}
                        members={superlatives.quickestDraw}
                        unit="hrs"
                    />
                )}
                </>
            )}
          </div>
      </div>

      {/* 3. TASTE COMPATIBILITY */}
      {compatibility && (
          <div className="space-y-8 pt-8 border-t border-dashed">
            <h3 className="text-sm font-semibold px-1 text-muted-foreground uppercase tracking-wider text-center">Taste Compatibility</h3>

            {/* The Taste Web */}
            <TasteWeb allPairs={compatibility.allPairs} members={members} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <TasteCompatibility stats={compatibility} />
                 <CompatibilityMatrix allPairs={compatibility.allPairs} members={members} />
            </div>
          </div>
      )}

      {/* 4. CONTENT DNA & DISTRIBUTIONS */}
      {contentDNA && (
          <div className="space-y-4 pt-8 border-t border-dashed">
            <h3 className="text-sm font-semibold px-1 text-muted-foreground uppercase tracking-wider text-center">Deep Data</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <GenreRadar data={contentDNA.genreRadar} memberData={contentDNA.memberRadar} />
              {distributions && distributions.ratings && (
                  <RatingDistribution data={distributions.ratings} />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <EraDistribution data={contentDNA.eraDistribution} />
            </div>

            {leaderboards && (
                 <Leaderboards directors={leaderboards.directors} actors={leaderboards.actors} />
            )}

            {scope === "global" && hiddenGems && <HiddenGems gems={hiddenGems} members={members} />}
          </div>
      )}

    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function GenreRadar({ data, memberData }: { data: any[], memberData?: any }) {
  const { user } = useAuth();

  const chartData = useMemo(() => {
      if (!data) return [];
      // Combine group data with user data if available
      return data.map(item => {
          // Find user specific value if exists
          let userValue = null;
          if (user && memberData && memberData[user.id]) {
             // memberData[user.id] is an array of objects {subject, value}
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
             const found = memberData[user.id].find((x: any) => x.subject === item.subject);
             if (found) userValue = found.value;
          }
          return {
              ...item,
              userValue
          };
      });
  }, [data, memberData, user]);

  if (!data || data.length === 0) return null;

  return (
    <Card className="border-none shadow-sm bg-accent/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Style DNA</CardTitle>
        <CardDescription>Group Average vs. You</CardDescription>
      </CardHeader>
      <CardContent className="h-[250px] w-full">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
              <PolarGrid stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0, 10]} hide />

              {/* Group Radar */}
              <Radar
                name="Group Avg"
                dataKey="value"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
              />

              {/* User Radar (if available) */}
              <Radar
                name="Me"
                dataKey="userValue"
                stroke="hsl(var(--secondary))"
                fill="hsl(var(--secondary))"
                fillOpacity={0.1}
                strokeDasharray="4 4"
              />

              <ChartTooltip content={<ChartTooltipContent />} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EraDistribution({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;

  return (
    <Card className="border-none shadow-sm bg-accent/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Era Distribution & Ratings</CardTitle>
      </CardHeader>
      <CardContent className="h-[250px] w-full flex flex-col gap-4">
        {/* Count Chart */}
        <div className="h-1/2 w-full">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                 <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                 <ChartTooltip content={<ChartTooltipContent />} />
                 <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Rating Chart */}
        <div className="h-1/2 w-full border-t border-dashed pt-2">
           <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                 <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} hide />
                 <YAxis domain={[0, 10]} hide />
                 <ChartTooltip content={<ChartTooltipContent />} />
                 <Bar dataKey="avgRating" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} name="Avg Rating" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HiddenGems({ gems, members }: { gems: any[], members: any[] }) {
  if (!gems || gems.length === 0) return null;

  return (
    <Card className="border-none shadow-sm bg-indigo-500/10 border-indigo-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-indigo-400">
          <Zap className="h-4 w-4" /> Hidden Gems
        </CardTitle>
        <CardDescription>Buildings loved by multiple members but never visited in sessions.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {gems.map((gem: any) => (
             <div key={gem.title} className="flex items-center justify-between gap-3 bg-background/50 p-2 rounded-lg">
               <div className="flex items-center gap-3">
                 {gem.poster && <img src={gem.poster} className="w-10 h-14 object-cover rounded" alt={gem.title} />}
                 <div>
                   <div className="font-bold text-sm">{gem.title}</div>
                   <div className="text-xs text-muted-foreground">{gem.count} members rated highly</div>
                 </div>
               </div>

               {/* Facepile */}
               <div className="flex -space-x-2 mr-2">
                  { }
                  {gem.fans.slice(0, 4).map((uid: string) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const m = members.find((mem: any) => mem.user.id === uid);
                    return (
                      <Avatar key={uid} className="h-6 w-6 border border-background">
                         <AvatarImage src={m?.user?.avatar_url} />
                         <AvatarFallback className="text-[8px]">{m?.user?.username?.[0]}</AvatarFallback>
                      </Avatar>
                    );
                  })}
               </div>
             </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TasteCompatibility({ stats }: { stats: any }) {
  if (!stats.soulmates && !stats.nemesis) {
    return <div className="text-xs text-muted-foreground italic">Not enough overlapping ratings to calculate compatibility.</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {stats.soulmates && (
        <CompatibilityCard
          label="Architectural Soulmates"
          desc="Highest taste correlation"
          score={stats.soulmates.score}
          m1={stats.soulmates.m1}
          m2={stats.soulmates.m2}
          color="text-green-500"
        />
      )}
      {stats.nemesis && (
        <CompatibilityCard
          label="The Nemesis"
          desc="Lowest taste correlation"
          score={stats.nemesis.score}
          m1={stats.nemesis.m1}
          m2={stats.nemesis.m2}
          color="text-red-500"
        />
      )}
      {stats.loneWolf && (
        <div className="flex items-center justify-between bg-accent/5 p-3 rounded-xl">
          <div>
            <div className="text-sm font-bold flex items-center gap-2">
               🐺 The Lone Wolf
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Least correlated with group</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">
               avg corr: {stats.loneWolf.score.toFixed(2)}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold">{stats.loneWolf.m?.user?.username}</span>
              <Avatar className="h-8 w-8">
                  <AvatarImage src={stats.loneWolf.m?.user?.avatar_url} />
                  <AvatarFallback>{stats.loneWolf.m?.user?.username?.[0]}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CompatibilityCard({ label, desc, score, m1, m2, color }: any) {
  return (
    <div className="flex items-center justify-between bg-accent/5 p-3 rounded-xl border-l-4 border-l-transparent hover:border-l-primary transition-all">
      <div>
        <div className={`text-sm font-bold flex items-center gap-2`}>
           {label}
        </div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{desc}</div>
      </div>

      <div className="flex items-center gap-3">
        <div className={`text-lg font-black ${color}`}>
          {(score * 100).toFixed(0)}%
        </div>
        <div className="flex items-center gap-2">
            <div className="flex flex-col items-end">
                <span className="text-[10px] text-muted-foreground">{m1?.user?.username}</span>
                <span className="text-[10px] text-muted-foreground">{m2?.user?.username}</span>
            </div>
            <div className="flex -space-x-3">
            <Avatar className="h-8 w-8 border-2 border-background z-10">
                <AvatarImage src={m1?.user?.avatar_url} />
                <AvatarFallback>{m1?.user?.username?.[0]}</AvatarFallback>
            </Avatar>
            <Avatar className="h-8 w-8 border-2 border-background z-0">
                <AvatarImage src={m2?.user?.avatar_url} />
                <AvatarFallback>{m2?.user?.username?.[0]}</AvatarFallback>
            </Avatar>
            </div>
        </div>
      </div>
    </div>
  );
}
