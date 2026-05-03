import { useState, useEffect } from "react";
import { useParams, useNavigate, type MetaFunction } from "react-router";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppLayout } from "@/components/layout/AppLayout";
import { TagInput } from "@/components/ui/tag-input";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getBuildingUrl } from "@/utils/url";

export const meta: MetaFunction = () => [
  { title: "Edit Note | Plano" },
  { name: "robots", content: "noindex, nofollow" },
];

export default function EditNote() {
  const { id: buildingPathId, postId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  // Building info needed to navigate back
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
        // Load post and building in parallel
        const [postResult, buildingResult] = await Promise.all([
          supabase
            .from("building_posts")
            .select("id, title, body, tags, user_id")
            .eq("id", postId)
            .single(),
          supabase
            .from("buildings")
            .select("id, name, slug, short_id")
            .or(`id.eq.${buildingPathId},slug.eq.${buildingPathId}`)
            .maybeSingle(),
        ]);

        if (postResult.error) throw postResult.error;
        const post = postResult.data;

        // Only the owner can edit
        if (post.user_id !== user.id) {
          toast({ variant: "destructive", title: "Not authorised" });
          void navigate(-1);
          return;
        }

        setTitle(post.title ?? "");
        setBody(post.body ?? "");
        setTags(post.tags ?? []);

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

  const handleSave = async () => {
    if (!postId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("building_posts")
        .update({
          title: title.trim() || null,
          body: body.trim() || null,
          tags: tags.length > 0 ? tags : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", postId);

      if (error) throw error;

      toast({ title: "Note saved" });
      if (buildingId) {
        void navigate(getBuildingUrl(buildingId, buildingSlug, buildingShortId));
      } else {
        void navigate(-1);
      }
    } catch {
      toast({ variant: "destructive", title: "Failed to save note" });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (buildingId) {
      void navigate(getBuildingUrl(buildingId, buildingSlug, buildingShortId));
    } else {
      void navigate(-1);
    }
  };

  if (loading || authLoading) {
    return (
      <AppLayout title="Edit Note">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-text-disabled" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={buildingName ? `Note — ${buildingName}` : "Edit Note"} showBack>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="note-title" className="text-[10px] font-bold uppercase tracking-wider text-text-disabled">
            Title <span className="font-normal normal-case tracking-normal">— optional</span>
          </Label>
          <Input
            id="note-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your note a title…"
            className="text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="note-body" className="text-[10px] font-bold uppercase tracking-wider text-text-disabled">
            Note
          </Label>
          <Textarea
            id="note-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a note or review…"
            className="min-h-[140px] text-sm resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-text-disabled">
            Tags <span className="font-normal normal-case tracking-normal">— optional</span>
          </Label>
          <TagInput
            tags={tags}
            setTags={setTags}
            placeholder="Type a tag and press Enter…"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button size="sm" variant="ghost" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
            Save
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
