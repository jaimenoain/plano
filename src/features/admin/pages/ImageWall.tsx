import { useState, useEffect } from "react";
import type { MetaFunction } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageHeader, AdminEmptyState } from "@/features/admin/components/admin-ui";

type ProfileImageRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "username" | "avatar_url" | "created_at"
>;

interface ImageItem {
  id: string; // The ID of the record (building or profile)
  url: string;
  type: 'building' | 'profile';
  name: string;
  date: string;
  uniqueKey: string;
}

export const meta: MetaFunction = () => [{ title: "Image Wall | Plano" }];

export default function ImageWall() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    setLoading(true);
    try {
      // Fetch recent profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, created_at")
        .not("avatar_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);

      const combined: ImageItem[] = [];

      if (profiles) {
        (profiles as ProfileImageRow[]).forEach((p) => {
           if (!p.avatar_url) return;
           combined.push({
             id: p.id,
             url: p.avatar_url,
             type: 'profile',
             name: p.username || 'User',
             date: p.created_at,
             uniqueKey: `profile:${p.id}`
           });
        });
      }

      // Sort combined by date desc
      combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setImages(combined);
    } catch (_error) {
toast.error("Failed to load images");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (key: string) => {
    const newSelected = new Set(selectedKeys);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedKeys(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedKeys.size === 0) return;
    if (!window.confirm(`Delete ${selectedKeys.size} images? This cannot be undone.`)) return;

    try {
        const itemsToDelete = images.filter(img => selectedKeys.has(img.uniqueKey));

        // Group by type
        const profileIds = itemsToDelete.filter(i => i.type === 'profile').map(i => i.id);

        if (profileIds.length > 0) {
             const { error } = await supabase
                .from('profiles')
                .update({ avatar_url: null })
                .in('id', profileIds);
            if (error) throw error;
        }

        toast.success("Images deleted successfully");

        // Remove from local state
        setImages(prev => prev.filter(img => !selectedKeys.has(img.uniqueKey)));
        setSelectedKeys(new Set());

    } catch (_error) {
toast.error("Failed to delete images");
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Media"
        title="Image Wall"
        description="Recent profile avatars. Select tiles to clear avatar URLs in bulk."
        actions={
          <>
            <Button variant="outline" className="rounded-sm" onClick={fetchImages} disabled={loading}>
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
            {selectedKeys.size > 0 ? (
              <Button variant="destructive" className="rounded-sm" onClick={handleDeleteSelected}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete ({selectedKeys.size})
              </Button>
            ) : null}
          </>
        }
      />

      {loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-sm" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <AdminEmptyState title="No images found" description="Profile avatars will appear here when users upload them." />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          {images.map((img) => (
            <div
              key={img.uniqueKey}
              role="button"
              tabIndex={0}
              className={cn(
                "group relative aspect-square cursor-pointer overflow-hidden rounded-sm border border-border-default transition-colors",
                selectedKeys.has(img.uniqueKey)
                  ? "border-text-primary ring-2 ring-text-primary"
                  : "hover:border-border-strong",
              )}
              onClick={() => toggleSelect(img.uniqueKey)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleSelect(img.uniqueKey);
                }
              }}
            >
              <img src={img.url} alt={img.name} className="h-full w-full object-cover" loading="lazy" />

              <div className="absolute inset-0 flex flex-col justify-end bg-surface-inverse/50 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="truncate text-xs font-medium text-text-inverse">{img.name}</div>
                <div className="text-2xs capitalize text-text-inverse/70">{img.type}</div>
              </div>

              <div className="absolute right-2 top-2">
                <Checkbox
                  checked={selectedKeys.has(img.uniqueKey)}
                  onCheckedChange={() => toggleSelect(img.uniqueKey)}
                  onClick={(e) => e.stopPropagation()}
                  className="border-border-default bg-surface-default data-[state=checked]:border-text-primary data-[state=checked]:bg-text-primary data-[state=checked]:text-surface-default"
                  aria-label={`Select ${img.name}`}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
