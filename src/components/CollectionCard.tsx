import { Link } from "react-router-dom";
import { Lock, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useDraggable } from "@dnd-kit/core";

export interface CollectionCardProps {
  collection: {
      id: string;
      name: string;
      slug: string;
      is_public: boolean;
      collection_items: { count: number }[];
      owner?: { username: string | null };
  };
  username?: string | null;
  className?: string;
  isDragEnabled?: boolean;
}

export function CollectionCard({ collection, username, className, isDragEnabled = false }: CollectionCardProps) {
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
        "block flex-shrink-0 w-[180px] group select-none outline-none",
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
          <Card className="h-[100px] hover:border-primary/50 transition-colors overflow-hidden relative">
              <CardContent className="p-4 h-full flex flex-col justify-between pointer-events-none">
            <div className="flex justify-between items-start">
                <h4 className="font-medium text-sm line-clamp-2 leading-tight group-hover:text-primary transition-colors pr-4 whitespace-normal">
                    {collection.name}
                </h4>
                {collection.is_public ? (
                    <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                ) : (
                    <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                )}
            </div>
            <div className="flex items-center justify-between mt-auto">
                <span className="text-xs text-muted-foreground font-medium">
                    {collection.collection_items?.[0]?.count || 0} places
                </span>
            </div>
            </CardContent>
        </Card>
      </Link>
    </div>
  );
}
