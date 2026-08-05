import { Loader2, Plus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CollectionSelector } from "@/features/collections";
import { PendingPhotosQueue } from "./PendingPhotosQueue";
import { MyBuildingStatusBlock } from "./MyBuildingStatusBlock";
import { BuildingNotesList, type UserPost } from "./BuildingNotesList";
import type { DisplayImage } from "../hooks/buildingCommunityData";
import type { BuildingDetails } from "../pages/BuildingDetails";

type UserStatus = "visited" | "pending" | "ignored" | null;

interface BuildingActionCardProps {
  building: BuildingDetails;
  currentUser: { id: string; email?: string } | null;
  profile: { username?: string | null; avatar_url?: string | null } | null;
  userStatus: UserStatus;
  onStatusChange: (status: "visited" | "pending" | "ignored") => Promise<void> | void;
  myRating: number;
  onRate: (buildingId: string, rating: number) => Promise<void> | void;
  onNewNote: () => void;
  userPosts: UserPost[];
  note: string;
  setNote: (value: string) => void;
  activePostId: string | null;
  noteEditorOpen: boolean;
  setNoteEditorOpen: (open: boolean) => void;
  pendingImages: { id: string; preview: string }[];
  isSavingNote: boolean;
  onRemovePendingImage: (id: string) => void;
  onClearPendingImages: () => void;
  onSaveNote: () => Promise<void> | void;
  onOpenNotePhotoPicker: () => void;
  showCollections: boolean;
  setShowCollections: (open: boolean) => void;
  selectedCollectionIds: string[];
  setSelectedCollectionIds: (ids: string[]) => void;
  onSelectImage: (img: DisplayImage) => void;
}

/**
 * Sidebar action card: my status / my rating / note + collection shortcuts,
 * the existing-notes list, the inline note editor and the collection selector.
 * Extracted from the BuildingDetails page. The photo file input stays mounted
 * in the page (shared with Media-tab shortcuts); this card only triggers it.
 */
export function BuildingActionCard({
  building,
  currentUser,
  profile,
  userStatus,
  onStatusChange,
  myRating,
  onRate,
  onNewNote,
  userPosts,
  note,
  setNote,
  activePostId,
  noteEditorOpen,
  setNoteEditorOpen,
  pendingImages,
  isSavingNote,
  onRemovePendingImage,
  onClearPendingImages,
  onSaveNote,
  onOpenNotePhotoPicker,
  showCollections,
  setShowCollections,
  selectedCollectionIds,
  setSelectedCollectionIds,
  onSelectImage,
}: BuildingActionCardProps) {
  return (
    <section className="space-y-5 pb-1 border-t border-border-default pt-9 lg:border-t-0 lg:pt-0">

      {/* Status + mark — one shared block, identical in the map drawer */}
      <MyBuildingStatusBlock
        buildingId={building.id}
        status={userStatus}
        rating={myRating}
        onStatusChange={onStatusChange}
        onRate={onRate}
      />

      {userStatus === "ignored" ? null : (
      <>
      {/* Secondary actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onNewNote}
          className="h-9 text-[10px] font-bold uppercase tracking-wider border border-border-default bg-transparent hover:bg-surface-muted"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Note
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowCollections(!showCollections)}
          className="h-9 text-[10px] font-bold uppercase tracking-wider border border-border-default bg-transparent hover:bg-surface-muted"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Collection
        </Button>
      </div>

      {/* Existing notes list */}
      <AnimatePresence>
        {!noteEditorOpen && userPosts.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden pt-1"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium uppercase tracking-widest text-text-disabled">
                My Notes
              </span>
              {userPosts.length > 1 && (
                <span className="text-[10px] font-bold text-text-disabled bg-surface-muted px-1.5 py-0.5 rounded-full">
                  {userPosts.length}
                </span>
              )}
            </div>
            <BuildingNotesList
              buildingId={building.id}
              userPosts={userPosts}
              author={{
                username: profile?.username || currentUser?.email || "Me",
                avatar_url: profile?.avatar_url || null,
              }}
              onSelectImage={onSelectImage}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Note editor */}
      <AnimatePresence>
        {noteEditorOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-3 pt-4 border-t border-border-default"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-disabled">
                {activePostId ? "Editing note" : "New note"}
              </span>
              {userPosts.length > 0 && !activePostId && (
                <span className="text-[10px] text-text-disabled">
                  {userPosts.length} existing note{userPosts.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note or review..."
              className="min-h-[100px] text-sm resize-none"
            />
            <PendingPhotosQueue
              pendingImages={pendingImages}
              isSavingNote={isSavingNote}
              onRemove={onRemovePendingImage}
              onSave={() => void onSaveNote()}
            />
            <div className="flex items-center justify-between gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={onOpenNotePhotoPicker}
                disabled={isSavingNote}
                className="text-xs font-medium text-text-secondary hover:text-text-primary"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {pendingImages.length > 0 ? "Add more photos" : "Add photos"}
              </Button>
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onClearPendingImages();
                    setNoteEditorOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => void onSaveNote()}
                  disabled={isSavingNote}
                >
                  {isSavingNote && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  Save
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collection selector */}
      <AnimatePresence>
        {showCollections && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border-default pt-4"
          >
            <CollectionSelector
              userId={currentUser?.id ?? ""}
              selectedCollectionIds={selectedCollectionIds}
              onChange={setSelectedCollectionIds}
            />
          </motion.div>
        )}
      </AnimatePresence>

      </>
      )}

    </section>
  );
}
