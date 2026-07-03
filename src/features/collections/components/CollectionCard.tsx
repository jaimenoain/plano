import { Link } from "react-router";
import { Lock, Globe, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useDraggable } from "@dnd-kit/core";

export interface CollectionCardProps {
  collection: {
      id: string;
      name: string;
      slug: string;
      is_public: boolean;
      isFavorite?: boolean;
      collection_items: { count: number }[];
      owner?: { username: string | null };
  };
  username?: string | null;
  className?: string;
  isDragEnabled?: boolean;
  /** `profile` — full-width editorial tile for profile / folder grids; `compact` — fixed-width strip (default). */
  variant?: "compact" | "profile";
}

export function CollectionCard({ collection, username, className, isDragEnabled = false, variant = "compact" }: CollectionCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `collection-${collection.id}`,
    data: { type: "collection", collection },
    disabled: !isDragEnabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      {...listeners}
      className={cn(
        "block shrink-0 group select-none outline-hidden",
        variant === "profile" ? "w-full" : "w-[180px]",
        isDragEnabled ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        className
      )}
    >
      <Link
          to={`/${collection.owner?.username || username || 'user'}/map/${collection.slug}`}
          className="block"
          // Prevent default link behavior while dragging to avoid accidental navigation
          onClick={(e) => { if (isDragging) e.preventDefault(); }}
      >
          <Card
            className={cn(
              "relative overflow-hidden rounded-none bg-surface-card shadow-none",
              variant === "profile"
                ? "min-h-[120px] h-auto border border-border-default transition-colors hover:border-border-strong"
                : cn("h-[100px]", collection.isFavorite && "border-b-2 border-text-primary"),
            )}
          >
              <CardContent
                className={cn(
                  "h-full flex flex-col justify-between pointer-events-none",
                  variant === "profile" ? "p-5" : "p-4"
                )}
              >
            <div className="flex justify-between items-start gap-2">
                <h4
                  className={cn(
                    "line-clamp-2 leading-tight whitespace-normal text-text-primary",
                    variant === "profile"
                      ? "text-base font-semibold tracking-tight pr-2"
                      : "font-medium text-sm pr-4"
                  )}
                >
                    {collection.name}
                </h4>
                {collection.isFavorite ? (
                    <Star className="h-3 w-3 text-feedback-warning shrink-0 fill-feedback-warning stroke-feedback-warning" />
                ) : collection.is_public ? (
                    <Globe className="h-3 w-3 text-text-secondary shrink-0" />
                ) : (
                    <Lock className="h-3 w-3 text-text-secondary shrink-0" />
                )}
            </div>
            <div className="flex items-center justify-between mt-auto">
                <span className="text-xs text-text-secondary font-medium">
                    {collection.collection_items?.[0]?.count || 0} places
                </span>
                {collection.isFavorite && collection.owner?.username && (
                  <span className="text-[10px] text-text-secondary">
                      by {collection.owner.username}
                  </span>
                )}
            </div>
            </CardContent>
        </Card>
      </Link>
    </div>
  );
}
