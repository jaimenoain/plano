import { UserFolder } from "@/features/collections/types";
import { Link } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Folder, Globe, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";

interface FolderCardProps {
  folder: UserFolder;
  to?: string;
  onClick?: () => void;
  className?: string;
  isDroppable?: boolean;
}

export function FolderCard({ folder, to, onClick, className, isDroppable = false }: FolderCardProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `folder-${folder.id}`,
    data: { type: "folder", folder },
    disabled: !isDroppable,
  });

  const content = (
    <Card
      ref={setNodeRef}
      className={cn(
        "bg-surface-card border border-border-default rounded-sm shadow-none transition-colors hover:border-border-strong",
        isOver && "border-brand-primary ring-2 ring-brand-primary/40"
      )}
    >
      <CardContent className="p-4 h-full flex flex-col justify-between">
        <div className="flex justify-between items-start gap-2">
          <h4 className="font-medium text-sm line-clamp-2 leading-tight text-text-primary flex-1">
            {folder.name}
          </h4>
          {folder.is_public ? (
            <Globe className="h-3 w-3 text-text-secondary shrink-0 mt-0.5" />
          ) : (
            <Lock className="h-3 w-3 text-text-secondary shrink-0 mt-0.5" />
          )}
        </div>

        <div className="flex items-end justify-between mt-3">
          <span className="text-xs text-text-secondary font-medium flex items-center gap-1.5">
            <Folder className="h-3.5 w-3.5" />
            {folder.items_count || 0}
          </span>

          {folder.preview_images && folder.preview_images.length > 0 ? (
            <div className="grid grid-cols-2 gap-0.5 w-8 h-8 rounded-sm overflow-hidden">
              {folder.preview_images.slice(0, 4).map((img, i) => (
                <img key={i} src={img} alt="" className="w-full h-full object-cover" />
              ))}
              {folder.preview_images.length < 4 &&
                Array.from({ length: 4 - folder.preview_images.length }).map((_, i) => (
                  <div key={`placeholder-${i}`} className="bg-surface-muted" />
                ))}
            </div>
          ) : (
            <div className="w-8 h-8 flex items-center justify-center bg-surface-muted/50 rounded-sm text-text-secondary/50">
              <Folder className="h-4 w-4" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const containerClasses = cn("block group select-none w-full", className);

  if (to) {
    return (
      <Link to={to} className={containerClasses} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <div className={containerClasses} onClick={onClick}>
      {content}
    </div>
  );
}
