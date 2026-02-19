import { FeedReview } from "@/types/feed";
import { SupabaseClient } from "@supabase/supabase-js";

interface HandleDragEndParams {
  activeId: string;
  overId: string | null;
  content: FeedReview[];
  setContent: (value: React.SetStateAction<FeedReview[]>) => void;
  supabase: SupabaseClient<any, "public", any>;
  toast: (props: any) => void;
  setUpdatingItemId?: (id: string | null) => void;
}

export const handleDragEndLogic = async ({
  activeId,
  overId,
  content,
  setContent,
  supabase,
  toast,
  setUpdatingItemId,
}: HandleDragEndParams) => {
  if (!overId) return;
  if (activeId === overId) return;

  // Find the active item
  const activeItem = content.find((item) => item.id === activeId);
  if (!activeItem) return;

  // Determine new rating
  let newRating: number | null = null;

  // Check if over is a column
  if (overId === "saved") newRating = 0;
  else if (overId === "1-point") newRating = 1;
  else if (overId === "2-points") newRating = 2;
  else if (overId === "3-points") newRating = 3;
  else {
    // Over might be another card
    const overItem = content.find((item) => item.id === overId);
    if (overItem) {
      newRating = overItem.rating;
      // If dropped on a saved item (rating null), treat as 0 for consistency
      if (newRating === null) newRating = 0;
    } else {
      // Unknown drop target
      return;
    }
  }

  // Normalize current rating for comparison (treat null as 0)
  const currentRating = activeItem.rating === null ? 0 : activeItem.rating;

  if (currentRating === newRating) return;

  // Proceed with update
  const previousContent = [...content];

  // Optimistic Update
  const optimisticRating = newRating === 0 ? null : newRating;

  setContent((prev) =>
    prev.map((item) =>
      item.id === activeItem.id
        ? {
            ...item,
            rating: optimisticRating,
            edited_at: new Date().toISOString(),
          }
        : item
    )
  );

  if (setUpdatingItemId) {
    setUpdatingItemId(activeItem.id);
  }

  try {
    // Supabase Update
    const dbRating = newRating === 0 || newRating === null ? null : newRating;

    const { error } = await supabase
      .from("user_buildings")
      .update({ rating: dbRating, edited_at: new Date().toISOString() })
      .eq("id", activeItem.id);

    if (error) throw error;

    toast({
      description: "Review updated",
      duration: 2000,
    });
  } catch (error) {
    console.error("Failed to update rating:", error);
    // Revert
    setContent(previousContent);
    toast({
      variant: "destructive",
      title: "Update failed",
      description: "Could not move the card. Please try again.",
    });
  } finally {
    if (setUpdatingItemId) {
      setUpdatingItemId(null);
    }
  }
};
