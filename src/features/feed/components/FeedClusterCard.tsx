import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router";
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
  location: _location,
  timestamp: _timestamp,
}: FeedClusterCardProps) {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;
    if (user.username) {
      navigate(`/profile/${user.username}`);
    }
  };

  const username = user.username || "Unknown User";
  const userInitial = username.charAt(0).toUpperCase();
  const avatarUrl = user.avatar_url || undefined;
  const visible = entries.slice(0, 3);

  return (
    <div onClick={handleClick} className="w-full cursor-pointer">
      {/* User attribution */}
      <div className="flex items-center gap-2.5 mb-4">
        <Avatar className="h-6 w-6 shrink-0">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="text-[10px]">{userInitial}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium text-text-primary">{username}</span>
      </div>

      {/* 3-column photo mosaic */}
      <div className="grid grid-cols-3 gap-[1.5px]">
        {visible.map((entry) => {
          const imgUrl =
            getBuildingImageUrl(entry.building.main_image_url) ??
            getBuildingImageUrl(entry.building.community_preview_url);
          return (
            <div
              key={entry.id}
              className="relative overflow-hidden aspect-square bg-surface-muted"
            >
              {imgUrl && (
                <img
                  src={imgUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-xs font-semibold text-white leading-tight truncate">
                  {entry.building.name}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-white/70 mt-0.5">
                  {entry.building.city}
                </p>
                {(entry.rating ?? 0) > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {Array.from({ length: entry.rating! }).map((_, i) => (
                      <i
                        key={i}
                        className="inline-block w-1.5 h-1.5 rounded-full bg-white not-italic"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
