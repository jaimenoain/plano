import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageItem {
  id: string; // The ID of the record (building or profile)
  url: string;
  type: 'building' | 'profile';
  name: string;
  date: string;
  uniqueKey: string;
}

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
      // Fetch recent buildings
      const { data: buildings } = await supabase
        .from("buildings")
        .select("id, name, main_image_url, created_at")
        .not("main_image_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);

      // Fetch recent profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, created_at")
        .not("avatar_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);

      const combined: ImageItem[] = [];

      if (buildings) {
        buildings.forEach((b: any) => {
           combined.push({
             id: b.id,
             url: b.main_image_url,
             type: 'building',
             name: b.name,
             date: b.created_at,
             uniqueKey: `building:${b.id}`
           });
        });
      }

      if (profiles) {
        profiles.forEach((p: any) => {
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
    } catch (error) {
      console.error("Error fetching images:", error);
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
        const buildingIds = itemsToDelete.filter(i => i.type === 'building').map(i => i.id);
        const profileIds = itemsToDelete.filter(i => i.type === 'profile').map(i => i.id);

        if (buildingIds.length > 0) {
            const { error } = await supabase
                .from('buildings')
                .update({ main_image_url: null })
                .in('id', buildingIds);
            if (error) throw error;
        }

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

    } catch (error) {
        console.error(error);
        toast.error("Failed to delete images");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Image Wall</h1>
        <div className="flex gap-2">
            <Button variant="outline" onClick={fetchImages}>
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            {selectedKeys.size > 0 && (
                <Button variant="destructive" onClick={handleDeleteSelected}>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete ({selectedKeys.size})
                </Button>
            )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : images.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">No images found.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {images.map(img => (
                <div
                    key={img.uniqueKey}
                    className={cn(
                        "relative group aspect-square rounded-md overflow-hidden border cursor-pointer transition-all",
                        selectedKeys.has(img.uniqueKey) ? "ring-2 ring-primary border-primary" : "hover:border-primary/50"
                    )}
                    onClick={() => toggleSelect(img.uniqueKey)}
                >
                    <img src={img.url} alt={img.name} className="w-full h-full object-cover" loading="lazy" />

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                        <div className="text-white text-xs font-medium truncate">{img.name}</div>
                        <div className="text-white/70 text-[10px] capitalize">{img.type}</div>
                    </div>

                    <div className="absolute top-2 right-2">
                        <Checkbox
                            checked={selectedKeys.has(img.uniqueKey)}
                            onCheckedChange={() => toggleSelect(img.uniqueKey)}
                            className="bg-white/90 border-transparent data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                        />
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
}
