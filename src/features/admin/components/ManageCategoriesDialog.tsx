import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useCategoriesByAward,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from "@/features/awards/hooks/useAwards";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface ManageCategoriesDialogProps {
  awardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageCategoriesDialog({
  awardId,
  open,
  onOpenChange,
}: ManageCategoriesDialogProps) {
  const { data: categories, isLoading } = useCategoriesByAward(awardId);
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleAdd = () => {
    if (!newName.trim()) return;
    createCategory.mutate(
      { award_id: awardId, name: newName.trim() },
      {
        onSuccess: () => {
          toast.success("Category added");
          setNewName("");
        },
        onError: () => toast.error("Failed to add category"),
      },
    );
  };

  const handleRename = (categoryId: string) => {
    if (!editName.trim()) return;
    updateCategory.mutate(
      { categoryId, payload: { name: editName.trim() } },
      {
        onSuccess: () => {
          toast.success("Category renamed");
          setEditingId(null);
        },
        onError: () => toast.error("Failed to rename category"),
      },
    );
  };

  const handleToggleActive = (categoryId: string, current: boolean) => {
    updateCategory.mutate(
      { categoryId, payload: { is_active: !current } },
      {
        onSuccess: () => toast.success(current ? "Category archived" : "Category restored"),
        onError: () => toast.error("Failed to update category"),
      },
    );
  };

  const handleDelete = (categoryId: string) => {
    deleteCategory.mutate(categoryId, {
      onSuccess: () => toast.success("Category deleted"),
      onError: () => toast.error("Failed to delete. It may have recipients assigned."),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new */}
          <div className="flex gap-2">
            <Input
              placeholder="New category name…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={createCategory.isPending || !newName.trim()}
            >
              {createCategory.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* List */}
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-text-secondary" />
            </div>
          ) : (categories ?? []).length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-4">
              No categories yet. Add "Main Award" if this award has no sub-divisions.
            </p>
          ) : (
            <div className="space-y-2">
              {(categories ?? []).map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-2 rounded-sm border border-border-default p-2"
                >
                  {editingId === cat.id ? (
                    <Input
                      className="flex-1 h-8 text-sm"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(cat.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <button
                      type="button"
                      className="flex-1 text-left text-sm font-medium hover:underline underline-offset-4"
                      onClick={() => {
                        setEditingId(cat.id);
                        setEditName(cat.name);
                      }}
                    >
                      {cat.name}
                    </button>
                  )}

                  {editingId === cat.id ? (
                    <Button size="sm" variant="ghost" onClick={() => handleRename(cat.id)}>
                      Save
                    </Button>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5">
                        <Label className="text-xs text-text-secondary">Active</Label>
                        <Switch
                          checked={cat.isActive}
                          onCheckedChange={() => handleToggleActive(cat.id, cat.isActive)}
                          className="scale-75"
                        />
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-feedback-destructive"
                        onClick={() => handleDelete(cat.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
