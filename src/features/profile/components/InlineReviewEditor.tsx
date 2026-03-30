import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InlineReviewEditorProps {
  initialContent: string | null;
  isOwnProfile: boolean;
  onSave: (content: string) => Promise<void> | void;
}

export function InlineReviewEditor({ initialContent, isOwnProfile, onSave }: InlineReviewEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(initialContent || "");
  const [isSaving, setIsSaving] = useState(false);

  // Update content if initialContent changes (e.g. from props)
  useEffect(() => {
    setContent(initialContent || "");
  }, [initialContent]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(content);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setContent(initialContent || "");
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancel();
    }
    // Optional: Allow saving with Ctrl+Enter or Cmd+Enter
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        handleSave();
    }
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 min-w-[200px] py-1">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a review..."
          className="min-h-[80px] text-xs resize-none bg-background z-10 relative"
          autoFocus
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()} // Prevent row click
        />
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              className="h-6 text-xs px-2"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={handleCancel}
              disabled={isSaving}
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center group min-h-[20px] max-w-full">
      <div className="flex-1 min-w-0 truncate">
          {content ? (
            <Tooltip>
                <TooltipTrigger asChild>
                <span className="truncate block cursor-default">{content}</span>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm text-xs z-50">
                <p className="whitespace-normal break-words">{content}</p>
                </TooltipContent>
            </Tooltip>
          ) : (
            isOwnProfile ? (
                <span className="text-muted-foreground/50 italic text-[10px] cursor-pointer hover:text-foreground/80 transition-colors"
                      onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}>
                    Add a review...
                </span>
            ) : (
                "—"
            )
          )}
      </div>

      {isOwnProfile && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hover:bg-muted"
          onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
          title="Edit review"
        >
          <Pencil className="h-3 w-3 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}
