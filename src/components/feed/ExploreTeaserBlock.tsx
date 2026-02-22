import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Loader2 } from "lucide-react";
import { useDiscoveryFeed } from "@/hooks/useDiscoveryFeed";
import { getBuildingImageUrl } from "@/utils/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ExploreTeaserBlockProps {
  className?: string;
}

export function ExploreTeaserBlock({ className }: ExploreTeaserBlockProps) {
  // Fetch default discovery feed (no filters)
  const { data, isLoading } = useDiscoveryFeed({});

  // Get the first 4 items from the first page
  const buildings = data?.pages[0]?.slice(0, 4) || [];

  if (isLoading) {
    return (
      <div className={cn("py-8 flex items-center justify-center", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!buildings.length) {
    return null;
  }

  return (
    <div className={cn("py-6 space-y-4 w-full max-w-full min-w-0", className)}>
      <div className="flex items-center justify-between px-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Trending Architecture</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Discover popular gems around the world
          </p>
        </div>
        <Button variant="ghost" size="sm" className="hidden sm:flex" asChild>
          <Link to="/explore">
            View All <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto px-4 pb-4 snap-x snap-mandatory no-scrollbar -mx-4 md:mx-0 scroll-pl-4">
        {buildings.map((building) => (
          <Link
            key={building.id}
            to={`/building/${building.id}/${building.slug || 'details'}`}
            className="snap-start shrink-0 w-[280px] group relative aspect-[4/3] rounded-xl overflow-hidden bg-muted border border-border/50 shadow-sm hover:shadow-md transition-all"
          >
             {/* Image */}
             <div className="absolute inset-0">
               {building.main_image_url ? (
                 <img
                   src={getBuildingImageUrl(building.main_image_url)}
                   alt={building.name}
                   className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                 />
               ) : (
                 <div className="w-full h-full bg-secondary flex items-center justify-center text-muted-foreground">
                   No Image
                 </div>
               )}
               {/* Gradient Overlay */}
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 transition-opacity group-hover:opacity-90" />
             </div>

             {/* Content */}
             <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
               <h3 className="font-bold text-lg leading-tight mb-1 line-clamp-2 drop-shadow-md">
                 {building.name}
               </h3>
               <div className="flex items-center gap-1 text-sm text-gray-200 font-medium drop-shadow-md">
                 <MapPin className="w-3.5 h-3.5 shrink-0 text-white/80" />
                 <span className="truncate">
                   {building.city || building.country || "Unknown Location"}
                 </span>
               </div>
             </div>
          </Link>
        ))}

        {/* "View All" Card */}
        <Link
           to="/explore"
           className="snap-start shrink-0 w-[140px] aspect-[4/3] rounded-xl overflow-hidden bg-muted/30 border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 hover:bg-muted/50 hover:border-primary/50 transition-all group/view-all"
        >
            <div className="h-12 w-12 rounded-full bg-background flex items-center justify-center shadow-sm group-hover/view-all:scale-110 transition-transform">
                <ArrowRight className="w-5 h-5 text-foreground" />
            </div>
            <span className="font-medium text-sm text-muted-foreground group-hover/view-all:text-foreground transition-colors">
              Explore All
            </span>
        </Link>
      </div>

       <div className="px-4 sm:hidden">
            <Button variant="outline" className="w-full rounded-full" asChild>
                <Link to="/explore">
                    Explore more architectural gems <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
            </Button>
       </div>
    </div>
  );
}
