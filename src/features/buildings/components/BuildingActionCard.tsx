import {
  Bookmark,
  Check,
  ChevronDown,
  Circle,
  EyeOff,
  Loader2,
  Plus,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CollectionSelector } from "@/features/collections";
import { PendingPhotosQueue } from "./PendingPhotosQueue";
import { PersonalRatingButton } from "./PersonalRatingButton";
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

      {/* Status */}
      <div className="space-y-2">
        <label className="text-[11px] font-medium uppercase tracking-widest text-text-disabled">
          My Status
        </label>
        {userStatus === "ignored" ? (
          <div className="flex items-center gap-2 h-10 px-3 border border-border-default bg-surface-muted text-sm font-medium text-text-disabled">
            <EyeOff className="h-4 w-4 shrink-0" />
            <span>Hidden</span>
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="accent"
                className="w-full justify-between h-10 px-3 text-sm font-medium"
              >
                <div className="flex items-center gap-2">
                  {userStatus === "visited" ? (
                    <Check className="h-4 w-4 text-feedback-success" />
                  ) : userStatus === "pending" ? (
                    <Bookmark className="h-4 w-4 text-text-primary fill-current" />
                  ) : (
                    <Circle className="h-4 w-4 text-text-disabled" />
                  )}
                  {userStatus === "visited"
                    ? "Visited"
                    : userStatus === "pending"
                      ? "Saved"
                      : "Add to list"}
                </div>
                <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[220px] p-2 rounded-none">
              <DropdownMenuItem
                className="rounded-none py-2.5"
                onSelect={() => void onStatusChange("visited")}
              >
                <Check className="mr-3 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-bold text-xs uppercase tracking-wider">Visited</p>
                  <p className="text-[10px] text-text-secondary">I've seen this in person</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="rounded-none py-2.5"
                onSelect={() => void onStatusChange("pending")}
              >
                <Bookmark className="mr-3 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-bold text-xs uppercase tracking-wider">Wishlist</p>
                  <p className="text-[10px] text-text-secondary">I want to visit this</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="rounded-none py-2.5"
                onSelect={() => void onStatusChange("ignored")}
              >
                <EyeOff className="mr-3 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-bold text-xs uppercase tracking-wider">Hide</p>
                  <p className="text-[10px] text-text-secondary">Don&apos;t show in my feed</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {userStatus === "ignored" ? (
        <div className="space-y-3">
          <p className="text-xs text-text-secondary leading-relaxed">
            This building is hidden. It won&apos;t appear on the map or be suggested to you.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-9 text-[10px] font-bold uppercase tracking-wider"
            onClick={() => void onStatusChange("ignored")}
          >
            Unhide
          </Button>
        </div>
      ) : (
      <>

      {/* Rating */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium uppercase tracking-widest text-text-disabled">
            My Rating
          </label>
          {myRating > 0 && (
            <span className="font-mono text-[10px] tracking-[0.08em] text-text-disabled">
              {myRating}/3
            </span>
          )}
        </div>
        <PersonalRatingButton
          variant="inline"
          buildingId={building.id}
          initialRating={myRating}
          onRate={onRate}
        />
      </div>

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
