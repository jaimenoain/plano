import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, type MetaFunction } from "react-router";
import {
  Loader2,
  ImagePlus,
  X,
  Link as LinkIcon,
  Plus,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AppLayout } from "@/components/layout/AppLayout";
import { TagInput } from "@/components/ui/tag-input";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getBuildingUrl } from "@/utils/url";
import { getBuildingImageUrl } from "@/utils/image";
import { resizeImageWithDimensions } from "@/lib/image-compression";
import { uploadFile, deleteFiles } from "@/utils/upload";

interface AttachedImage {
  id: string;
  /** Present for new (not yet uploaded) images. */
  file?: File;
  preview: string;
  /** Present for existing (already uploaded) images. */
  storage_path?: string;
  is_generated: boolean;
  caption: string;
  width_px?: number | null;
  height_px?: number | null;
}

export const meta: MetaFunction = () => [
  { title: "Edit Note | Plano" },
  { name: "robots", content: "noindex, nofollow" },
];

export default function EditNote() {
  const { id: buildingPathId, postId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Post content
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  // Images
  const [images, setImages] = useState<AttachedImage[]>([]);
  // Storage paths of existing images the user has removed (to delete on save)
  const [deletedImageIds, setDeletedImageIds] = useState<{ id: string; storage_path: string }[]>([]);

  // Links
  const [links, setLinks] = useState<{ id: string; url: string; title: string }[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkTitle, setNewLinkTitle] = useState("");

  // Building info for navigation
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [buildingSlug, setBuildingSlug] = useState<string | null>(null);
  const [buildingShortId, setBuildingShortId] = useState<number | null>(null);
  const [buildingName, setBuildingName] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      void navigate("/login");
      return;
    }
    if (!buildingPathId || !postId) return;

    const load = async () => {
      try {
        // Fetch the post, its images, its links, and the building in parallel.
        // The `review_images` / `review_links` arrays are fetched as separate
        // queries (rather than via PostgREST embed) because production's
        // schema cache silently returns `[]` for the embed after the FK swap
        // in migration 20270872. Direct WHERE-in queries are immune.
        const [postResult, imagesResult, linksResult, buildingResult] = await Promise.all([
          supabase
            .from("building_posts")
            .select("id, title, body, tags, user_id")
            .eq("id", postId)
            .single(),
          supabase
            .from("review_images")
            .select("id, storage_path, is_generated, caption")
            .eq("review_id", postId),
          supabase
            .from("review_links")
            .select("id, url, title")
            .eq("review_id", postId),
          supabase
            .from("buildings")
            .select("id, name, slug, short_id")
            .or(`id.eq.${buildingPathId},slug.eq.${buildingPathId}`)
            .maybeSingle(),
        ]);

        if (postResult.error) throw postResult.error;
        const post = postResult.data;

        if (post.user_id !== user.id) {
          toast({ variant: "destructive", title: "Not authorised" });
          void navigate(-1);
          return;
        }

        setTitle(post.title ?? "");
        setBody(post.body ?? "");
        setTags(post.tags ?? []);

        const existingImages: AttachedImage[] = (imagesResult.data ?? []).map(
          (img: { id: string; storage_path: string; is_generated: boolean | null; caption: string | null }) => ({
            id: img.id,
            preview: getBuildingImageUrl(img.storage_path) ?? "",
            storage_path: img.storage_path,
            is_generated: img.is_generated ?? false,
            caption: img.caption ?? "",
          })
        );
        setImages(existingImages);

        const existingLinks = (linksResult.data ?? []).map(
          (l: { id: string; url: string; title: string | null }) => ({
            id: l.id,
            url: l.url,
            title: l.title ?? "",
          })
        );
        setLinks(existingLinks);

        if (buildingResult.data) {
          setBuildingId(buildingResult.data.id);
          setBuildingSlug(buildingResult.data.slug);
          setBuildingShortId(buildingResult.data.short_id);
          setBuildingName(buildingResult.data.name);
        }
      } catch {
        toast({ variant: "destructive", title: "Failed to load note" });
        void navigate(-1);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [authLoading, user, buildingPathId, postId, navigate, toast]);

  const handleImageSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      for (const file of Array.from(e.target.files)) {
        try {
          const { file: compressed, width, height } = await resizeImageWithDimensions(file);
          const preview = URL.createObjectURL(compressed);
          setImages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              file: compressed,
              preview,
              is_generated: false,
              caption: "",
              width_px: width,
              height_px: height,
            },
          ]);
        } catch {
          toast({ variant: "destructive", title: "Error processing image" });
        }
      }
      e.target.value = "";
    },
    [toast]
  );

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) {
        if (img.storage_path) {
          setDeletedImageIds((d) => [...d, { id: img.id, storage_path: img.storage_path! }]);
        } else if (img.preview.startsWith("blob:")) {
          URL.revokeObjectURL(img.preview);
        }
      }
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const toggleGenerated = useCallback((id: string) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, is_generated: !img.is_generated } : img))
    );
  }, []);

  const updateCaption = useCallback((id: string, caption: string) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, caption } : img))
    );
  }, []);

  const addLink = useCallback(() => {
    if (!newLinkUrl.trim()) return;
    let url = newLinkUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    try {
      new URL(url);
    } catch {
      toast({ variant: "destructive", title: "Invalid URL" });
      return;
    }
    setLinks((prev) => [...prev, { id: crypto.randomUUID(), url, title: newLinkTitle.trim() }]);
    setNewLinkUrl("");
    setNewLinkTitle("");
  }, [newLinkUrl, newLinkTitle, toast]);

  const removeLink = useCallback((id: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const handleSave = async () => {
    if (!postId) return;
    setSaving(true);
    try {
      // 1. Update post content
      const { error: updateError } = await supabase
        .from("building_posts")
        .update({
          title: title.trim() || null,
          body: body.trim() || null,
          tags: tags.length > 0 ? tags : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", postId);
      if (updateError) throw updateError;

      // 2. Delete removed images from DB and storage
      if (deletedImageIds.length > 0) {
        const ids = deletedImageIds.map((d) => d.id);
        const paths = deletedImageIds.map((d) => d.storage_path);
        await supabase.from("review_images").delete().in("id", ids);
        try { await deleteFiles(paths); } catch { /* best-effort */ }
        setDeletedImageIds([]);
      }

      // 3. Update existing images (caption, is_generated)
      const existingImages = images.filter((img) => !img.file && img.storage_path);
      for (const img of existingImages) {
        const { error: imgUpdateError } = await supabase
          .from("review_images")
          .update({ caption: img.caption || null, is_generated: img.is_generated })
          .eq("id", img.id);
        if (imgUpdateError) throw imgUpdateError;
      }

      // 4. Upload new images and insert records.
      // `.select().single()` forces PostgREST to return the inserted row.
      // Without it (`Prefer: return=minimal`) a silent RLS rejection comes
      // back as 201 with an empty body — the row never lands and we never
      // know about it.
      const newImages = images.filter((img) => !!img.file);
      if (newImages.length > 0) {
        for (const img of newImages) {
          const storagePath = await uploadFile(img.file!, postId);
          const { data: inserted, error: imgInsertError } = await supabase
            .from("review_images")
            .insert({
              review_id: postId,
              user_id: user!.id,
              storage_path: storagePath,
              is_generated: img.is_generated,
              caption: img.caption || null,
              width_px: img.width_px ?? null,
              height_px: img.height_px ?? null,
            })
            .select("id")
            .single();
          if (imgInsertError) throw imgInsertError;
          if (!inserted?.id) {
            throw new Error(
              `Photo insert returned no row — likely RLS/policy rejection. Storage path: ${storagePath}`,
            );
          }
          URL.revokeObjectURL(img.preview);
        }
      }

      // 5. Sync links (delete all + re-insert)
      await supabase.from("review_links").delete().eq("review_id", postId);
      if (links.length > 0) {
        await supabase.from("review_links").insert(
          links.map((l) => ({
            review_id: postId,
            user_id: user!.id,
            url: l.url,
            title: l.title || null,
          }))
        );
      }

      toast({ title: "Note saved" });
      navigateBack();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to save note",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!postId) return;
    setSaving(true);
    try {
      const allPaths = images
        .map((img) => img.storage_path)
        .filter((p): p is string => !!p);
      if (allPaths.length > 0) {
        try { await deleteFiles(allPaths); } catch { /* best-effort */ }
      }
      await supabase.from("building_posts").delete().eq("id", postId);
      toast({ title: "Note deleted" });
      navigateBack();
    } catch {
      toast({ variant: "destructive", title: "Failed to delete note" });
    } finally {
      setSaving(false);
    }
  };

  const navigateBack = () => {
    if (buildingId) {
      void navigate(getBuildingUrl(buildingId, buildingSlug, buildingShortId));
    } else {
      void navigate(-1);
    }
  };

  // ── Cleanup blob URLs on unmount ──────────────────────────────────────────
  useEffect(() => {
    return () => {
      images.forEach((img) => {
        if (img.preview.startsWith("blob:")) URL.revokeObjectURL(img.preview);
      });
    };
  }, []);

  if (loading || authLoading) {
    return (
      <AppLayout title="Edit Note">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-text-disabled" />
        </div>
      </AppLayout>
    );
  }

  const hasImages = images.length > 0;

  return (
    <AppLayout title={buildingName ? `Note — ${buildingName}` : "Edit Note"} showBack>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-0">

        {/* Building context */}
        {buildingName && (
          <div className="mb-6">
            <p className="text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">Note for</p>
            <h1 className="text-3xl font-bold tracking-tight text-text-primary mt-0.5">{buildingName}</h1>
          </div>
        )}

        {/* Title — borderless, large */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className="w-full text-xl font-semibold bg-transparent border-0 outline-none placeholder:text-text-disabled text-text-primary py-2 mb-1"
        />

        {/* Body — borderless textarea */}
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your note…"
          className="w-full min-h-[220px] resize-none bg-transparent border-0 shadow-none focus-visible:ring-0 px-0 text-base leading-relaxed text-text-primary placeholder:text-text-disabled"
        />

        {/* Divider */}
        <div className="border-t border-border-default pt-6 mt-4 space-y-6">

          {/* Tags */}
          <div className="space-y-2">
            <p className="text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">Tags</p>
            <TagInput tags={tags} setTags={setTags} placeholder="Add tags and press Enter…" />
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <p className="text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">Attachments</p>

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => void handleImageSelect(e)}
              disabled={saving}
            />

            {!hasImages ? (
              // Empty state — compact upload trigger
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={saving}
                className="flex items-center gap-2 text-sm text-text-disabled hover:text-text-secondary transition-colors py-1"
              >
                <ImagePlus className="w-4 h-4" />
                Add photos
              </button>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="relative group rounded-sm overflow-hidden border border-border-default bg-surface-muted flex flex-col"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-square">
                      <img src={img.preview} alt="" className="w-full h-full object-cover" />

                      {/* Photo / Render toggle */}
                      <button
                        type="button"
                        onClick={() => toggleGenerated(img.id)}
                        className={`absolute bottom-1 left-1 px-1.5 py-0.5 rounded-sm text-[9px] font-bold uppercase transition-colors z-10 ${
                          img.is_generated
                            ? "bg-brand-primary text-brand-primary-foreground"
                            : "bg-black/55 text-white hover:bg-black/75"
                        }`}
                      >
                        {img.is_generated ? "Render" : "Photo"}
                      </button>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => removeImage(img.id)}
                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Caption input */}
                    <input
                      type="text"
                      value={img.caption}
                      onChange={(e) => updateCaption(img.id, e.target.value)}
                      placeholder="Caption…"
                      disabled={saving}
                      className="text-[11px] px-2 py-1.5 bg-transparent border-t border-border-default text-text-primary placeholder:text-text-disabled outline-none w-full focus:bg-surface-muted/40"
                    />
                  </div>
                ))}

                {/* Add more */}
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={saving}
                  className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-border-default rounded-sm text-text-disabled hover:text-text-secondary hover:border-border-default-strong transition-colors"
                >
                  <Plus className="w-5 h-5 mb-0.5" />
                  <span className="text-[10px] font-medium">Add</span>
                </button>
              </div>
            )}
          </div>

          {/* Links */}
          <div className="space-y-2">
            <p className="text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">Links</p>

            {/* Existing links */}
            {links.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {links.map((link) => {
                  let domain = "";
                  try { domain = new URL(link.url).hostname; } catch { /* ignore */ }
                  return (
                    <div
                      key={link.id}
                      className="flex items-center gap-2.5 p-2.5 rounded-sm border border-border-default bg-surface-muted/40 group"
                    >
                      <LinkIcon className="w-3.5 h-3.5 text-text-disabled flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate text-text-primary leading-tight">
                          {link.title || link.url}
                        </p>
                        {link.title && (
                          <p className="text-[11px] text-text-disabled truncate">{domain}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLink(link.id)}
                        className="text-text-disabled hover:text-feedback-destructive transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add link row */}
            <div className="flex gap-2 items-center">
              <Input
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }}
                placeholder="https://…"
                className="flex-[2] h-8 text-sm"
              />
              <Input
                value={newLinkTitle}
                onChange={(e) => setNewLinkTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }}
                placeholder="Label (optional)"
                className="flex-1 h-8 text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLink}
                className="h-8 px-3 flex-shrink-0"
                disabled={!newLinkUrl.trim() || saving}
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-border-default">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-text-disabled hover:text-feedback-destructive"
                disabled={saving}
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Delete note
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this note?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the note and all its attachments. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => void handleDeleteNote()}
                  className="bg-feedback-destructive text-feedback-destructive-foreground hover:opacity-90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={navigateBack} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Save
            </Button>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
