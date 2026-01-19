import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Share2, Edit2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CollectionsRowProps {
  tags: string[];
  selectedTag: string | null;
  onTagSelect: (tag: string | null) => void;
  onShare: () => void;
  onManageTags?: () => void;
  isOwnProfile: boolean;
}

export function CollectionsRow({ tags, selectedTag, onTagSelect, onShare, onManageTags, isOwnProfile }: CollectionsRowProps) {
  if (tags.length === 0) return null;

  return (
    <div className="flex items-center gap-2 w-full px-4 mb-4">
      <div className="bg-secondary/20 p-1.5 rounded-full mr-1">
          <Tag className="h-4 w-4 text-muted-foreground" />
      </div>
      <ScrollArea className="flex-1 whitespace-nowrap pb-2">
        <div className="flex space-x-2">
          <Badge
            variant={selectedTag === null ? "default" : "secondary"}
            className="cursor-pointer text-sm py-1 px-3 hover:bg-primary/20 transition-colors"
            onClick={() => onTagSelect(null)}
          >
            All
          </Badge>
          {tags.map(tag => (
            <Badge
              key={tag}
              variant={selectedTag === tag ? "default" : "secondary"}
              className="cursor-pointer text-sm py-1 px-3 hover:bg-primary/20 transition-colors"
              onClick={() => onTagSelect(selectedTag === tag ? null : tag)}
            >
              {tag}
            </Badge>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>

      <Button variant="ghost" size="icon" onClick={onShare} className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground bg-secondary/10 hover:bg-secondary/30 rounded-full" title="Share Profile">
        <Share2 className="h-4 w-4" />
      </Button>

      {isOwnProfile && onManageTags && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground bg-secondary/10 hover:bg-secondary/30 rounded-full"
          onClick={onManageTags}
          title="Manage Tags"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
