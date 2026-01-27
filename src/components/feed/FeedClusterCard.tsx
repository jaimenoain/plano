import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { FeedReview } from "@/types/feed";
import { getBuildingImageUrl } from "@/utils/image";

interface FeedClusterCardProps {
  entries: FeedReview[];
  user: {
    username: string | null;
    avatar_url: string | null;
  };
  location?: string;
  timestamp: string | Date;
}

export function FeedClusterCard({
  entries,
  user,
  location,
  timestamp
}: FeedClusterCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (user.username) {
        navigate(`/profile/${user.username}`);
    }
  };

  const username = user.username || "Unknown User";
  const userInitial = username.charAt(0).toUpperCase();
  const avatarUrl = user.avatar_url || undefined;

  const count = entries.length;
  const uniqueBuildingIds = new Set(entries.map(e => e.building.id));
  const uniqueCount = uniqueBuildingIds.size;

  // Construct Title
  // "Ezgaa saved 12 buildings in Paris" or "Ezgaa saved 12 buildings"
  // "saved" -> Passive action.
  // Use bold for count and location? "Ezgaa saved **12 buildings** in **Paris**"?
  // Requirement: "Ezgaa saved 12 buildings in **Paris**" (bold location).
  // "Brand Accent... yellow strictly for high-priority... or to highlight numerical data"
  // Maybe highlight the number in yellow? "Ezgaa saved <span class="text-primary">12 buildings</span>..."

  const images = entries
    .map(e => getBuildingImageUrl(e.building.main_image_url))
    .filter(Boolean)
    // De-duplicate images if same building appears multiple times (unlikely in cluster but possible)
    .filter((url, index, self) => self.indexOf(url) === index)
    .slice(0, 4);

  return (
    <article
      onClick={handleClick}
      className="group relative flex flex-col w-full bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer mb-6"
    >
      {/* Header */}
      <div className="p-4 flex items-center gap-3 border-b border-border/40">
        <Avatar className="h-10 w-10 border border-border/50">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{userInitial}</AvatarFallback>
        </Avatar>
        <div className="text-sm md:text-base text-foreground leading-snug">
          <p>
            <span className="font-semibold text-foreground">{username}</span>
            <span className="text-muted-foreground"> saved </span>
            <span className="font-bold text-foreground">{uniqueCount} buildings</span>
            {location && (
                <>
                    <span className="text-muted-foreground"> in </span>
                    <span className="font-bold text-foreground">{location}</span>
                </>
            )}
          </p>
          <span className="text-muted-foreground text-xs block mt-0.5">{formatDistanceToNow(new Date(timestamp)).replace("about ", "")} ago</span>
        </div>
      </div>

      {/* Visual Preview (Collage/Grid) */}
      <div className="w-full bg-secondary aspect-[4/3] relative">
          {images.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                  No preview available
              </div>
          ) : images.length === 1 ? (
              <img src={images[0]} className="w-full h-full object-cover" alt="Cluster preview" />
          ) : (
              <div className={`grid h-full w-full gap-0.5 ${images.length === 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'}`}>
                  {images.map((url, i) => (
                      <div key={i} className={`relative w-full h-full overflow-hidden ${
                          images.length === 3 && i === 0 ? 'row-span-2' : ''
                      }`}>
                          <img src={url} className="w-full h-full object-cover" alt={`Building ${i}`} />
                          {/* If we have more than 4, show overlay on the last one */}
                          {i === 3 && uniqueCount > 4 && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                  <span className="text-white font-bold text-lg">+{uniqueCount - 3}</span>
                              </div>
                          )}
                      </div>
                  ))}
              </div>
          )}
      </div>

      {/* No Footer - Direct Navigation */}
    </article>
  );
}
