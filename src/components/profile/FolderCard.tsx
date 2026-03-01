import { UserFolder } from "@/types/collection";
import { Link } from "react-router-dom";
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
    <>
      {/* Stacked background layers */}
      <div className="absolute inset-0 bg-card border border-dashed border-primary/20 rounded-lg transform -rotate-2 translate-x-0.5 translate-y-1.5 transition-transform group-hover:-rotate-3 group-hover:translate-x-1 group-hover:translate-y-2 -z-20" />
      <div className="absolute inset-0 bg-card border border-dashed border-primary/20 rounded-lg transform rotate-2 translate-x-1 translate-y-1 transition-transform group-hover:rotate-3 group-hover:translate-x-1.5 group-hover:translate-y-1.5 -z-10" />

      {/* Main Card */}
      <Card
        ref={setNodeRef}
        className={cn(
          "h-[100px] bg-card hover:border-primary/50 transition-all border-dashed border-primary/20 relative overflow-hidden shadow-sm group-hover:shadow-md",
          isOver && "border-primary ring-2 ring-primary/40 bg-secondary/80 scale-105 z-20"
        )}
      >
        <CardContent className="p-3 h-full flex flex-col justify-between relative z-10 pointer-events-none">
          <div className="flex justify-between items-start gap-2">
             <h4 className="font-medium text-sm line-clamp-2 leading-tight group-hover:text-primary transition-colors whitespace-normal flex-1">
               {folder.name}
             </h4>
             {folder.is_public ? (
               <Globe className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
             ) : (
               <Lock className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
             )}
          </div>

          <div className="flex items-end justify-between mt-auto">
             <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
               <Folder className="h-3.5 w-3.5" />
               {folder.items_count || 0}
             </span>

             {/* 2x2 Grid or Placeholder */}
             {folder.preview_images && folder.preview_images.length > 0 ? (
               <div className="grid grid-cols-2 gap-0.5 w-8 h-8 rounded overflow-hidden opacity-80 group-hover:opacity-100 transition-opacity">
                 {folder.preview_images.slice(0, 4).map((img, i) => (
                   <img key={i} src={img} alt="" className="w-full h-full object-cover" />
                 ))}
                 {/* Fill remaining slots if less than 4 (optional, but keeps grid shape) */}
                 {folder.preview_images.length < 4 && Array.from({ length: 4 - folder.preview_images.length }).map((_, i) => (
                    <div key={`placeholder-${i}`} className="bg-muted" />
                 ))}
               </div>
             ) : (
               <div className="w-8 h-8 flex items-center justify-center bg-muted/50 rounded text-muted-foreground/50">
                 <Folder className="h-4 w-4" />
               </div>
             )}
          </div>
        </CardContent>
      </Card>
    </>
  );

  const containerClasses = cn("block group relative select-none w-[180px] isolate", className);

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
