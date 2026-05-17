import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, type MetaFunction } from "react-router";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { resizeImage } from "@/lib/image-compression";
import { useUpdateById, useCreateUpdate, useUpdateUpdate } from "@/features/updates/hooks/useUpdates";
import type { GeoScope } from "@/features/updates/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const meta: MetaFunction = () => [{ title: "Update Post | Plano Admin" }];

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type Locality = { id: string; city: string; country_code: string };

export default function UpdateForm() {
  const { updateId } = useParams<{ updateId: string }>();
  const isEdit = !!updateId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: existing, isLoading: loadingExisting } = useUpdateById(updateId);
  const createUpdate = useCreateUpdate();
  const updateUpdate = useUpdateUpdate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [tagsRaw, setTagsRaw] = useState("");
  const [geoScope, setGeoScope] = useState<GeoScope>("global");
  const [countryCode, setCountryCode] = useState("");
  const [localitySearch, setLocalitySearch] = useState("");
  const [localityId, setLocalityId] = useState("");
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [loadingLocalities, setLoadingLocalities] = useState(false);
  const [published, setPublished] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title);
    setSlug(existing.slug);
    setSlugManual(true);
    setExcerpt(existing.excerpt ?? "");
    setBody(existing.body ?? "");
    setHeroImageUrl(existing.heroImageUrl ?? "");
    setTagsRaw(existing.tags.join(", "));
    setGeoScope(existing.geoScope);
    setCountryCode(existing.countryCode ?? "");
    setLocalityId(existing.localityId ?? "");
    setLocalitySearch(existing.localityCity ?? "");
    setPublished(!!existing.publishedAt);
  }, [existing]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManual && title) setSlug(toSlug(title));
  }, [title, slugManual]);

  // Search localities when in local scope
  useEffect(() => {
    if (geoScope !== "local" || localitySearch.trim().length < 2) {
      setLocalities([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingLocalities(true);
      const { data } = await supabase
        .from("localities")
        .select("id, city, country_code")
        .ilike("city", `%${localitySearch.trim()}%`)
        .limit(8);
      setLocalities((data as Locality[]) ?? []);
      setLoadingLocalities(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [localitySearch, geoScope]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingImage(true);
    try {
      const compressed = await resizeImage(file, 1400, 800, 0.85);
      const ext = "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("plano-updates")
        .upload(path, compressed, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("plano-updates").getPublicUrl(path);
      setHeroImageUrl(data.publicUrl);
    } catch (err: unknown) {
      toast.error("Image upload failed");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const parseTags = (raw: string) =>
    raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

  const saving = createUpdate.isPending || updateUpdate.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) {
      toast.error("Title and slug are required");
      return;
    }
    if (!user) {
      toast.error("Not authenticated");
      return;
    }

    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      excerpt: excerpt.trim() || null,
      body: body.trim() || null,
      hero_image_url: heroImageUrl.trim() || null,
      tags: parseTags(tagsRaw),
      geo_scope: geoScope,
      country_code: (geoScope !== "global" ? countryCode.trim().toUpperCase() : null) || null,
      locality_id: (geoScope === "local" ? localityId : null) || null,
      published_at: published ? (existing?.publishedAt ?? new Date().toISOString()) : null,
    };

    if (isEdit && updateId) {
      updateUpdate.mutate(
        { id: updateId, payload },
        {
          onSuccess: () => {
            toast.success("Update saved");
            navigate("/admin/updates");
          },
          onError: () => toast.error("Failed to save"),
        },
      );
    } else {
      createUpdate.mutate(
        { ...payload, author_id: user.id },
        {
          onSuccess: () => {
            toast.success("Update created");
            navigate("/admin/updates");
          },
          onError: () => toast.error("Failed to create"),
        },
      );
    }
  };

  if (isEdit && loadingExisting) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <h1 className="text-4xl font-bold tracking-tight text-text-primary">
        {isEdit ? "Edit Update" : "New Update"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. New cities added this month"
            required
          />
        </div>

        {/* Slug */}
        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => { setSlug(e.target.value); setSlugManual(true); }}
            placeholder="new-cities-added-this-month"
            required
          />
          <p className="text-xs text-text-secondary">URL: <code>/updates/{slug || "…"}</code></p>
        </div>

        {/* Excerpt */}
        <div className="space-y-2">
          <Label htmlFor="excerpt">Excerpt</Label>
          <Textarea
            id="excerpt"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="A short summary shown in the listing…"
            rows={2}
          />
        </div>

        {/* Body */}
        <div className="space-y-2">
          <Label htmlFor="body">Body</Label>
          <Textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Full post content (Markdown supported)…"
            rows={10}
          />
        </div>

        {/* Hero image */}
        <div className="space-y-2">
          <Label>Hero image</Label>
          {heroImageUrl ? (
            <div className="relative w-full aspect-[16/7] rounded-md overflow-hidden border border-border-default">
              <img src={heroImageUrl} alt="Hero preview" className="w-full h-full object-cover" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                onClick={() => setHeroImageUrl("")}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border-default rounded-md py-8 cursor-pointer hover:border-text-secondary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadingImage ? (
                <Loader2 className="h-5 w-5 animate-spin text-text-secondary" />
              ) : (
                <>
                  <Upload className="h-5 w-5 text-text-secondary" />
                  <span className="text-sm text-text-secondary">Click to upload</span>
                  <span className="text-xs text-text-secondary/60">Recommended: 1400 × 800px</span>
                </>
              )}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            placeholder="product, cities, data (comma-separated)"
          />
        </div>

        {/* Geographic scope */}
        <div className="space-y-4 border border-border-default rounded-lg p-4">
          <div className="space-y-2">
            <Label>Geographic scope</Label>
            <Select value={geoScope} onValueChange={(v) => setGeoScope(v as GeoScope)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global — visible to everyone</SelectItem>
                <SelectItem value="national">National — tied to a country</SelectItem>
                <SelectItem value="local">Local — tied to a city</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(geoScope === "national" || geoScope === "local") && (
            <div className="space-y-2">
              <Label htmlFor="country-code">Country code (ISO-3166-1 alpha-2)</Label>
              <Input
                id="country-code"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value.toUpperCase().slice(0, 2))}
                placeholder="e.g. GB, US, DE"
                maxLength={2}
              />
            </div>
          )}

          {geoScope === "local" && (
            <div className="space-y-2">
              <Label htmlFor="locality-search">City</Label>
              <Input
                id="locality-search"
                value={localitySearch}
                onChange={(e) => {
                  setLocalitySearch(e.target.value);
                  setLocalityId("");
                }}
                placeholder="Search a city…"
              />
              {localityId && (
                <p className="text-xs text-feedback-success">City selected.</p>
              )}
              {loadingLocalities && (
                <p className="text-xs text-text-secondary">Searching…</p>
              )}
              {localities.length > 0 && !localityId && (
                <ul className="border border-border-default rounded-md divide-y divide-border-default max-h-40 overflow-y-auto">
                  {localities.map((loc) => (
                    <li key={loc.id}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted transition-colors"
                        onClick={() => {
                          setLocalityId(loc.id);
                          setLocalitySearch(loc.city);
                          setCountryCode(loc.country_code);
                          setLocalities([]);
                        }}
                      >
                        {loc.city}{" "}
                        <span className="text-text-secondary text-xs">{loc.country_code}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Published toggle */}
        <div className="flex items-center gap-3">
          <Switch id="published" checked={published} onCheckedChange={setPublished} />
          <Label htmlFor="published">
            {published ? "Published" : "Draft"}
          </Label>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={saving || uploadingImage}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Save changes" : "Create post"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("/admin/updates")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
