
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Radio, HelpCircle, Film, BarChart2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PollCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  poll: any;
  groupSlug: string;
  isAdmin: boolean;
}

export function PollCard({ poll, groupSlug, isAdmin }: PollCardProps) {
  const isClosed = poll.status === 'closed';
  const isLive = poll.status === 'live';
  const isActive = poll.status === 'open';
  const isDraft = poll.status === 'draft';
  const isPublished = poll.status === 'published';

  const getPollTypeContent = (type: string) => {
    switch (type) {
      case 'quiz':
        return (
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider opacity-90">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Trivia</span>
          </div>
        );
      case 'film_selection':
        return (
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider opacity-90">
            <Film className="w-3.5 h-3.5" />
            <span>Decision</span>
          </div>
        );
      case 'general':
      default:
        return (
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider opacity-90">
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Vote</span>
          </div>
        );
    }
  };

  // Badges need to handle both colorful backgrounds (Live/Active/Published) and standard backgrounds (Draft/Closed)
  // When on a colorful background, we can use white with opacity.
  // When on a standard background, we should use standard variants.
  const getStatusBadge = () => {
      if (isLive) return <Badge variant="destructive" className="animate-pulse shadow-sm px-2 py-0.5 text-[10px]">LIVE</Badge>;

      if (isActive) return <Badge className="bg-white/20 text-white hover:bg-white/30 border-none px-2 py-0.5 text-[10px]">Active</Badge>;

      if (isPublished) return <Badge variant="outline" className="border-white/30 text-white px-2 py-0.5 text-[10px]">Upcoming</Badge>;

      // For Draft and Closed (Light/Dark mode backgrounds), use standard variants or explicit colors that work in both
      if (isClosed) return <Badge variant="secondary" className="px-2 py-0.5 text-[10px]">Closed</Badge>;

      if (isDraft) return <Badge variant="outline" className="px-2 py-0.5 text-[10px]">Draft</Badge>;

      return null;
  };

  // Calculate stats
  const questionCount = poll.questions?.length || 0;
  const uniqueVoters = new Set(poll.votes?.map((v: any) => v.user_id)).size;
  const sessionTitle = poll.session?.title;

  // Determine target link
  const hasActiveQuestion = poll.questions?.some((q: any) => q.is_live_active);
  const isLiveNow = isLive && hasActiveQuestion;
  const targetLink = (isLiveNow && !isAdmin)
    ? `/groups/${groupSlug}/live/${poll.slug || poll.id}`
    : `/groups/${groupSlug}/polls/${poll.slug || poll.id}`;

  // Styles based on status
  let cardStyles = "bg-gradient-to-br from-primary/80 to-primary text-primary-foreground border-transparent";
  let contentStyles = "text-primary-foreground/90";
  let borderStyles = "border-white/20"; // Border for the separator line

  if (isLive) {
    cardStyles = "bg-gradient-to-br from-destructive to-destructive/80 text-destructive-foreground border-transparent ring-2 ring-destructive ring-offset-2";
    contentStyles = "text-destructive-foreground/90";
    borderStyles = "border-white/20";
  } else if (isClosed) {
    cardStyles = "bg-muted text-muted-foreground border-border";
    contentStyles = "text-muted-foreground";
    borderStyles = "border-border/10";
  } else if (isDraft) {
    cardStyles = "bg-background border-dashed border-2 border-muted-foreground/30 text-muted-foreground";
    contentStyles = "text-muted-foreground";
    borderStyles = "border-border/10";
  } else if (isPublished) {
     cardStyles = "bg-gradient-to-br from-blue-600 to-blue-500 text-white border-transparent";
     contentStyles = "text-white/90";
     borderStyles = "border-white/20";
  }

  return (
    <Link to={targetLink} className="block transition-all hover:scale-[1.02] active:scale-[0.98] h-full group focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-xl">
        <Card className={cn("h-full flex flex-col shadow-sm hover:shadow-lg transition-shadow overflow-hidden rounded-xl border", cardStyles)}>
            <CardContent className="flex flex-col h-full p-4 sm:p-5">
                <div className="flex justify-between items-start mb-3">
                    {getPollTypeContent(poll.type)}
                    {getStatusBadge()}
                </div>

                <h3 className="text-lg sm:text-xl font-black leading-tight mb-2 line-clamp-2">
                  {poll.title}
                </h3>

                {poll.description && (
                  <p className={cn("text-xs sm:text-sm line-clamp-2 mb-4", contentStyles)}>
                    {poll.description}
                  </p>
                )}

                <div className={cn("mt-auto pt-3 border-t w-full flex items-center justify-between", borderStyles)}>
                    {isPublished ? (
                        <div className="text-xs font-medium opacity-90">
                             {sessionTitle ? `During ${sessionTitle}` : "Opening soon"}
                        </div>
                    ) : isLiveNow ? (
                         <div className="text-xs font-bold flex items-center gap-2 animate-pulse">
                            <span>Join Live Session</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 text-xs opacity-80">
                            <span>{questionCount} Qs</span>
                            {(uniqueVoters > 0 || isAdmin) && (
                                <span className="flex items-center gap-1">
                                    <Radio className="w-3 h-3" />
                                    {uniqueVoters}
                                </span>
                            )}
                        </div>
                    )}

                    {!isLiveNow && !isPublished && (
                       <div className={`flex items-center gap-1 text-xs font-bold uppercase tracking-wider ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                         {isClosed ? 'Results' : 'Vote'} <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                       </div>
                    )}
                </div>
            </CardContent>
        </Card>
    </Link>
  );
}
