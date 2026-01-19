import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Trophy } from "lucide-react";

interface PodiumMember {
  id: string;
  name: string;
  avatar: string | null;
  value: number | string;
  metadata?: string; // e.g. "Spielberg" for Completist
}

interface PodiumProps {
  members: PodiumMember[];
  unit?: string;
  reverse?: boolean; // if true, lowest value is best? No, podium usually assumes ordered 1, 2, 3
  icon?: React.ReactNode;
  title: string;
  description: string;
}

export function Podium({ members, unit, icon, title, description }: PodiumProps) {
  if (!members || members.length === 0) return null;

  // Ensure we have up to 3 members
  const gold = members[0];
  const silver = members[1];
  const bronze = members[2];

  return (
    <div className="flex flex-col bg-card/30 rounded-xl p-4 border border-white/5 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6 z-10">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          {icon || <Trophy className="w-4 h-4" />}
        </div>
        <div>
           <h3 className="font-bold text-sm leading-tight">{title}</h3>
           <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{description}</p>
        </div>
      </div>

      {/* Podium Structure */}
      <div className="flex items-end justify-center w-full h-36 md:h-44 px-2 mt-auto z-10 gap-2 md:gap-4">

        {/* Silver (Left) */}
        <div className="flex flex-col items-center flex-1 h-full justify-end">
             {silver && <PodiumStep member={silver} rank={2} color="bg-gray-300" unit={unit} barHeight="h-10 md:h-14" />}
        </div>

        {/* Gold (Center) */}
        <div className="flex flex-col items-center flex-1 z-20 -mx-1 h-full justify-end">
             {gold && <PodiumStep member={gold} rank={1} color="bg-yellow-400" unit={unit} barHeight="h-16 md:h-20" isWinner />}
        </div>

        {/* Bronze (Right) */}
        <div className="flex flex-col items-center flex-1 h-full justify-end">
             {bronze && <PodiumStep member={bronze} rank={3} color="bg-amber-700" unit={unit} barHeight="h-6 md:h-10" />}
        </div>

      </div>

      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10" />
    </div>
  );
}

function PodiumStep({ member, rank, color, unit, barHeight, isWinner }: { member: PodiumMember, rank: number, color: string, unit?: string, barHeight: string, isWinner?: boolean }) {
    return (
        <div className="flex flex-col items-center w-full">
            {/* Avatar */}
            <div className={cn("relative mb-2 transition-transform duration-500", isWinner ? "scale-100" : "scale-90 opacity-80")}>
                <Avatar className={cn("border-2", isWinner ? "w-16 h-16 border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]" : "w-12 h-12 border-transparent")}>
                    <AvatarImage src={member.avatar || undefined} />
                    <AvatarFallback>{member.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className={cn("absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-black border border-white", color)}>
                    {rank}
                </div>
            </div>

            {/* Bar */}
            <div className={cn("w-full relative group transition-all duration-700 ease-out bg-secondary", barHeight)}>
                 {/* Minimalist: No gradient overlay */}
            </div>

            {/* Value */}
            <div className="mt-1 text-center">
                <div className="text-xs font-bold text-foreground truncate max-w-[4rem] mx-auto">{member.name}</div>
                <div className="text-[10px] font-mono text-muted-foreground">
                    {typeof member.value === 'number' && Number.isInteger(member.value) ? member.value :
                     typeof member.value === 'number' ? member.value.toFixed(1) : member.value}
                    {unit && <span className="ml-0.5 opacity-50">{unit}</span>}
                </div>
                 {member.metadata && (
                    <div className="text-[9px] text-primary truncate max-w-[4rem] opacity-80">{member.metadata}</div>
                )}
            </div>
        </div>
    )
}
