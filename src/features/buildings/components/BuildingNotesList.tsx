import { useNavigate } from "react-router";
import { Pencil } from "lucide-react";
import { getBuildingImageUrl } from "@/utils/image";
import { NotePhotoGrid } from "./NotePhotoGrid";
import type { DisplayImage } from "../hooks/buildingCommunityData";

export type UserPost = {
  id: string;
  title: string | null;
  body: string | null;
  created_at: string;
  updated_at: string;
  images: { id: string; storage_path: string }[];
};

interface BuildingNotesListProps {
  buildingId: string;
  userPosts: UserPost[];
  /** Display identity for the note author (the current user) in the lightbox. */
  author: { username: string; avatar_url: string | null };
  onSelectImage: (img: DisplayImage) => void;
}

/** The sidebar "My Notes" card list: date header, photo grid, body preview. */
export function BuildingNotesList({
  buildingId,
  userPosts,
  author,
  onSelectImage,
}: BuildingNotesListProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-3">
      {userPosts.map((post, idx) => {
        const preview = post.body?.trim()
          ? post.body.length > 100 ? post.body.slice(0, 100) + "…" : post.body
          : null;
        const dateStr = new Date(post.updated_at || post.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
        const thumbs = post.images.slice(0, 4);

        const handleNoteImageClick = (img: typeof post.images[0]) => {
          const url = getBuildingImageUrl(img.storage_path);
          if (!url) return;

          onSelectImage({
            id: img.id,
            url: url,
            type: "image",
            likes_count: 0,
            created_at: post.created_at,
            user: author,
            caption: post.title || post.body || null,
          });
        };

        return (
          <div
            key={post.id}
            className="border border-border-default bg-surface-muted/30 group/note overflow-hidden transition-all duration-200 hover:border-border-strong hover:bg-surface-muted/50 cursor-pointer"
            onClick={() => void navigate(`/building/${buildingId}/note/${post.id}/edit`)}
          >
            {/* Card header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border-default bg-surface-muted/20">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-bold text-text-secondary tracking-tight uppercase">
                  {dateStr}
                </span>
                {userPosts.length > 1 && (
                  <span className="text-[9px] font-medium text-text-disabled bg-surface-default/50 px-1 border border-border-default/50">
                    {idx + 1}/{userPosts.length}
                  </span>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void navigate(`/building/${buildingId}/note/${post.id}/edit`);
                }}
                className="shrink-0 p-1.5 rounded-none hover:bg-surface-default transition-colors opacity-40 group-hover/note:opacity-100"
                title="Edit this note"
              >
                <Pencil className="h-3 w-3 text-text-primary" />
              </button>
            </div>

            {/* Dynamic Photo Grid */}
            <NotePhotoGrid
              images={thumbs}
              totalCount={post.images.length}
              onImageClick={handleNoteImageClick}
            />

            {/* Body */}
            <div className="px-3.5 py-3">
              {post.title?.trim() && (
                <p className="text-xs font-bold text-text-primary leading-snug mb-1.5">{post.title}</p>
              )}
              {preview ? (
                <p className="text-[11px] text-text-secondary leading-relaxed line-clamp-3">
                  {preview}
                </p>
              ) : (
                !post.title?.trim() && (
                  <p className="text-[11px] text-text-disabled italic font-serif">Empty note</p>
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
