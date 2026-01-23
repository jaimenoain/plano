import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Scale, Gavel, HeartHandshake } from "lucide-react";

interface GenerosityDuelProps {
  userAvg: number;
  targetAvg: number;
  targetName: string;
  userAvatar: string | null;
  targetAvatar: string | null;
}

export function GenerosityDuel({
  userAvg,
  targetAvg,
  targetName,
  userAvatar,
  targetAvatar,
}: GenerosityDuelProps) {
  const diff = userAvg - targetAvg;
  const absDiff = Math.abs(diff);
  const percentDiff = Math.round(absDiff * 10);

  // Determine positions (clamped 5% - 95%)
  const userPos = Math.min(Math.max(userAvg * 10, 5), 95);
  const targetPos = Math.min(Math.max(targetAvg * 10, 5), 95);

  let verdictTitle = "";
  let verdictDesc = "";
  let Icon = Scale;

  if (absDiff < 0.5) {
    verdictTitle = "Soulmates / Almas Gemelas";
    verdictDesc = "Your rating criteria is practically identical.";
    Icon = HeartHandshake;
  } else if (diff < 0) {
    // User is lower (harsher) than Target
    verdictTitle = "The Judge vs. The Fan";
    verdictDesc = `You are ${percentDiff}% more critical than ${targetName}.`;
    Icon = Gavel;
  } else {
    // User is higher (more generous) than Target
    verdictTitle = "The Enthusiast vs. The Critic";
    verdictDesc = `You are ${percentDiff}% more generous than ${targetName}.`;
    Icon = Scale;
  }

  return (
    <Card className="bg-gradient-to-br from-card to-secondary/10 border-border shadow-sm overflow-visible mt-6">
      <CardContent className="pt-8 pb-6 px-4 md:px-8">

        {/* The Scale */}
        <div className="relative h-12 mb-8">
          {/* Track */}
          <div className="absolute top-1/2 left-0 w-full h-2 bg-secondary/30 rounded-full -translate-y-1/2" />

          {/* Ruler marks (0, 5, 10) */}
          <div className="absolute top-1/2 left-0 w-full flex justify-between px-1 -translate-y-1/2 text-xs text-muted-foreground font-mono select-none pointer-events-none">
             <span>0</span>
             <span>5</span>
             <span>10</span>
          </div>

          {/* Target Avatar (Them) */}
          <div
            className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-500 z-10"
            style={{ left: `${targetPos}%`, transform: 'translate(-50%, -50%)' }}
          >
            <Avatar className="h-10 w-10 border-2 border-background shadow-sm opacity-80 scale-90">
              <AvatarImage src={targetAvatar || undefined} />
              <AvatarFallback>{targetName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="mt-1 bg-secondary text-secondary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
              {targetAvg.toFixed(1)}
            </span>
          </div>

          {/* User Avatar (You) */}
          <div
            className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-500 z-20"
            style={{ left: `${userPos}%`, transform: 'translate(-50%, -50%)' }}
          >
            <Avatar className="h-12 w-12 border-2 border-primary shadow-md ring-2 ring-background">
              <AvatarImage src={userAvatar || undefined} />
              <AvatarFallback>You</AvatarFallback>
            </Avatar>
            <span className="mt-1 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
              {userAvg.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Verdict */}
        <div className="flex items-center gap-4 bg-background/50 p-3 rounded-lg border border-border/50">
          <div className="h-10 w-10 rounded-full bg-secondary/50 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-foreground/80" />
          </div>
          <div>
            <h4 className="font-bold text-foreground text-sm md:text-base">
              {verdictTitle}
            </h4>
            <p className="text-xs md:text-sm text-muted-foreground">
              {verdictDesc}
            </p>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
