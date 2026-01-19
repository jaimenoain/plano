import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PlayCircle, ExternalLink, ChevronRight, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface Provider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
}

interface AvailabilityData {
  stream: Provider[];
  rent: Provider[];
  buy: Provider[];
}

interface FilmAvailabilityProps {
  availability: AvailabilityData | null;
  loading: boolean;
  countryCode: string;
  subscribedPlatforms?: string[] | null;
  mode?: "full" | "hero" | "summary"; // Added mode prop
  onExpand?: () => void; // For hero/summary mode to open details
}

export function FilmAvailability({
    availability,
    loading,
    countryCode,
    subscribedPlatforms,
    mode = "full",
    onExpand
}: FilmAvailabilityProps) {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("cineforum-hide-platform-warning");
    // Show warning if not dismissed AND platforms are missing (null or empty array)
    if (!dismissed && (subscribedPlatforms === null || (Array.isArray(subscribedPlatforms) && subscribedPlatforms.length === 0))) {
      setShowWarning(true);
    }
  }, [subscribedPlatforms]);

  if (loading) {
      return mode === "full" ?
        <div className="animate-pulse h-24 bg-muted/20 rounded-xl" /> :
        <div className="animate-pulse h-6 w-32 bg-muted/20 rounded" />;
  }

  if (!availability) return null;

  const { stream, rent, buy } = availability;

  // Categorize Stream Providers
  const myStream = stream?.filter(p => subscribedPlatforms?.includes(p.provider_name));
  const otherStream = stream?.filter(p => !subscribedPlatforms?.includes(p.provider_name));

  const hasMyStream = myStream && myStream.length > 0;
  const hasOtherStream = otherStream && otherStream.length > 0;
  const hasRent = rent && rent.length > 0;
  const hasBuy = buy && buy.length > 0;

  if (!hasMyStream && !hasOtherStream && !hasRent && !hasBuy) {
      return null;
  }

  const handleDismissSession = () => setShowWarning(false);
  const handleDismissForever = () => {
       localStorage.setItem("cineforum-hide-platform-warning", "true");
       setShowWarning(false);
  };

  // --- HERO MODE (Utility Line - White Text) ---
  if (mode === "hero") {
      if (hasMyStream) {
          // Show first matched provider prominently
          const topProvider = myStream[0];
          return (
              <div
                className="flex items-center gap-2 py-1 cursor-pointer group hover:bg-white/5 rounded-lg transition-colors"
                onClick={onExpand}
              >
                  <img
                    src={`https://image.tmdb.org/t/p/original${topProvider.logo_path}`}
                    className="w-6 h-6 rounded shadow-sm"
                    alt={topProvider.provider_name}
                  />
                  <span className="text-sm font-medium text-white group-hover:text-primary transition-colors">
                      Stream on {topProvider.provider_name}
                  </span>
                  {myStream.length > 1 && (
                      <span className="text-xs text-muted-foreground">
                          + {myStream.length - 1} more
                      </span>
                  )}
              </div>
          );
      } else {
          // Summary Link
          const streamCount = (otherStream?.length || 0);

          if (streamCount > 0) {
              return (
                  <div
                    className="flex items-center gap-1.5 py-1 cursor-pointer group"
                    onClick={onExpand}
                  >
                      <PlayCircle className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
                          Available on {streamCount} services
                      </span>
                      <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
              );
          } else {
              return (
                  <div
                    className="flex items-center gap-1.5 py-1 cursor-pointer group"
                    onClick={onExpand}
                  >
                      <PlayCircle className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
                          Available to rent or buy
                      </span>
                      <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
              );
          }
      }
  }

  // --- SUMMARY MODE (Utility Line - Adaptive Text) ---
  if (mode === "summary") {
      if (hasMyStream) {
          // Show first matched provider prominently
          const topProvider = myStream[0];
          return (
              <div
                className="flex items-center gap-2 py-1 cursor-pointer group hover:bg-muted/50 rounded-lg transition-colors"
                onClick={onExpand}
              >
                  <img
                    src={`https://image.tmdb.org/t/p/original${topProvider.logo_path}`}
                    className="w-6 h-6 rounded shadow-sm"
                    alt={topProvider.provider_name}
                  />
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      Stream on {topProvider.provider_name}
                  </span>
                  {myStream.length > 1 && (
                      <span className="text-xs text-muted-foreground">
                          + {myStream.length - 1} more
                      </span>
                  )}
              </div>
          );
      } else {
          // Summary Link
          const streamCount = (otherStream?.length || 0);

          if (streamCount > 0) {
              return (
                  <div
                    className="flex items-center gap-1.5 py-1 cursor-pointer group"
                    onClick={onExpand}
                  >
                      <PlayCircle className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
                          Available on {streamCount} services
                      </span>
                      <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
              );
          } else {
              return (
                  <div
                    className="flex items-center gap-1.5 py-1 cursor-pointer group"
                    onClick={onExpand}
                  >
                      <PlayCircle className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
                          Available to rent or buy
                      </span>
                      <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
              );
          }
      }
  }

  // --- FULL MODE ---
  return (
    <TooltipProvider delayDuration={0}>
      <div className="p-4 rounded-xl bg-muted/20 border space-y-4">
        <div className="flex items-center gap-2">
          <PlayCircle className="text-primary w-5 h-5" />
          <h4 className="font-semibold">Where to Watch <span className="text-muted-foreground text-xs font-normal">({countryCode})</span></h4>
        </div>

        {showWarning && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-sm space-y-2 animate-in fade-in slide-in-from-top-2">
                 <div className="flex gap-2">
                     <Settings className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                     <p className="text-foreground/90 leading-tight">Tell us what services you are subscribed to so we can give you custom info.</p>
                 </div>
                 <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center pl-6">
                    <Link to="/settings" className="font-bold text-primary hover:underline">Go to Settings</Link>
                    <div className="flex gap-3 ml-auto text-xs text-muted-foreground">
                        <button onClick={handleDismissSession} className="hover:text-foreground transition-colors">Remind me later</button>
                        <button onClick={handleDismissForever} className="hover:text-foreground transition-colors">Don't show again</button>
                    </div>
                 </div>
              </div>
        )}

        <div className="flex flex-col gap-4">

          {/* Priority: My Subscriptions */}
          {hasMyStream && (
               <div className="space-y-2">
                   <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary uppercase tracking-wider">On your services</span>
                      <Badge variant="default" className="text-[10px] h-4 px-1">Best Option</Badge>
                   </div>
                   <div className="flex flex-wrap gap-2">
                       {myStream.map(p => <ProviderLogo key={p.provider_id} provider={p} highlight />)}
                   </div>
              </div>
          )}

          {/* Other Stream */}
          {hasOtherStream && (
              <div className="space-y-2">
                   <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      {hasMyStream ? "Also Streaming On" : "Stream"}
                   </span>
                   <div className="flex flex-wrap gap-2">
                       {otherStream.map(p => <ProviderLogo key={p.provider_id} provider={p} />)}
                   </div>
              </div>
          )}

          {(hasRent || hasBuy) && (
              <div className="space-y-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Rent / Buy</span>
                  <div className="flex flex-wrap gap-2">
                      {hasRent && (
                          <div className="flex items-center gap-2">
                               <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-muted-foreground">Rent</Badge>
                               {rent.map(p => <ProviderLogo key={p.provider_id} provider={p} className="w-8 h-8" />)}
                          </div>
                      )}
                      {hasBuy && (
                          <div className="flex items-center gap-2 mt-1">
                               <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-muted-foreground">Buy</Badge>
                               {buy.map(p => <ProviderLogo key={p.provider_id} provider={p} className="w-8 h-8" />)}
                          </div>
                      )}
                  </div>
              </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

function ProviderLogo({ provider, className = "w-10 h-10", highlight = false }: { provider: Provider, className?: string, highlight?: boolean }) {
    return (
        <Tooltip>
            <TooltipTrigger>
                <img
                    src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                    className={`${className} rounded-md shadow-sm transition-all hover:scale-105 ${highlight ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                    alt={provider.provider_name}
                />
            </TooltipTrigger>
            <TooltipContent>
                <p>{provider.provider_name}</p>
            </TooltipContent>
        </Tooltip>
    )
}
