import { useState, useEffect } from "react";
import { useNavigate, useParams, type MetaFunction } from "react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAward, useCreateAward, useUpdateAward } from "@/features/awards/hooks/useAwards";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminFormLabel, AdminPageHeader } from "@/features/admin/components/admin-ui";

export const meta: MetaFunction = () => [{ title: "Award Form | Plano Admin" }];

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AwardForm() {
  const { awardId } = useParams<{ awardId: string }>();
  const isEdit = !!awardId;
  const navigate = useNavigate();
  const { data: existingAward, isLoading: loadingAward } = useAward(awardId ?? "");
  const createAward = useCreateAward();
  const updateAward = useUpdateAward();
  const queryClient = useQueryClient();
  const [syncing, setSyncing] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [country, setCountry] = useState("");
  const [frequency, setFrequency] = useState<string>("annual");
  const [bodyType, setBodyType] = useState<string>("");
  const [bodyName, setBodyName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [wikidataQid, setWikidataQid] = useState("");

  // Populate form when editing
  useEffect(() => {
    if (!existingAward) return;
    setName(existingAward.name);
    setSlug(existingAward.slug);
    setSlugManual(true);
    setDescription(existingAward.description ?? "");
    setWebsite(existingAward.website ?? "");
    setCountry(existingAward.country ?? "");
    setFrequency(existingAward.frequency);
    setBodyType(existingAward.awardingBodyType ?? "");
    setBodyName(existingAward.awardingBodyName ?? "");
    setIsActive(existingAward.isActive);
    setWikidataQid(existingAward.wikidataQid ?? "");
  }, [existingAward]);

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugManual && name) {
      setSlug(toSlug(name));
    }
  }, [name, slugManual]);

  const saving = createAward.isPending || updateAward.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      toast.error("Name and slug are required");
      return;
    }

    const payload = {
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim() || null,
      website: website.trim() || null,
      country: country.trim() || null,
      frequency,
      awarding_body_type: bodyType || null,
      awarding_body_name: bodyName.trim() || null,
      is_active: isActive,
      wikidata_qid: wikidataQid.trim() || null,
    };

    if (isEdit && awardId) {
      updateAward.mutate(
        { awardId, payload },
        {
          onSuccess: () => {
            toast.success("Award updated");
            navigate(`/admin/awards/${awardId}`);
          },
          onError: () => toast.error("Failed to update award"),
        },
      );
    } else {
      createAward.mutate(payload, {
        onSuccess: (created) => {
          toast.success("Award created");
          navigate(`/admin/awards/${created.id}`);
        },
        onError: () => toast.error("Failed to create award"),
      });
    }
  };

  const handleSyncWikidata = async () => {
    if (!awardId) return;
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("sync-award-wikidata", {
        body: { award_id: awardId },
      });
      if (error) throw error;
      toast.success("Synced successfully");
      queryClient.invalidateQueries({ queryKey: ["awards", awardId] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(`Failed to sync Wikidata: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  if (isEdit && loadingAward) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <AdminPageHeader title={isEdit ? "Edit award" : "New award"} eyebrow="Awards" />

      <form onSubmit={handleSubmit} className="space-y-6 border-t border-border-default pt-6">
        <div className="space-y-2">
          <AdminFormLabel htmlFor="award-name">Name</AdminFormLabel>
          <Input
            id="award-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Stirling Prize"
            required
          />
        </div>

        {/* Slug */}
        <div className="space-y-2">
          <AdminFormLabel htmlFor="award-slug">Slug</AdminFormLabel>
          <Input
            id="award-slug"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugManual(true);
            }}
            placeholder="stirling-prize"
            required
          />
          <p className="text-xs text-text-secondary">
            URL path: <code>/award/{slug || "…"}</code>
          </p>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <AdminFormLabel htmlFor="award-description">Description</AdminFormLabel>
          <Textarea
            id="award-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe this award…"
            rows={4}
          />
        </div>

        {/* Website */}
        <div className="space-y-2">
          <AdminFormLabel htmlFor="award-website">Website</AdminFormLabel>
          <Input
            id="award-website"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://…"
          />
        </div>

        {/* Wikidata QID */}
        <div className="space-y-2">
          <AdminFormLabel htmlFor="award-wikidata-qid">Wikidata QID</AdminFormLabel>
          <div className="flex items-center gap-2">
            <Input
              id="award-wikidata-qid"
              value={wikidataQid}
              onChange={(e) => setWikidataQid(e.target.value)}
              placeholder="e.g. Q48143"
            />
            {isEdit && wikidataQid && (
              <Button type="button" variant="ghost" size="sm" onClick={handleSyncWikidata} disabled={syncing}>
                {syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sync →
              </Button>
            )}
          </div>
          <p className="text-xs text-text-secondary">
            Find the QID by searching <a href="https://www.wikidata.org" target="_blank" rel="noreferrer" className="underline hover:text-text-primary">wikidata.org</a>. It always starts with Q followed by numbers.
          </p>
          {existingAward?.wikidataSitelinks !== null && existingAward?.wikidataSitelinks !== undefined ? (
            <p className="text-sm text-text-secondary mt-1">Wikipedia presence: {existingAward.wikidataSitelinks} language editions</p>
          ) : wikidataQid ? (
            <p className="text-sm text-text-secondary mt-1">Not yet synced</p>
          ) : null}
        </div>

        {/* Country */}
        <div className="space-y-2">
          <AdminFormLabel htmlFor="award-country">Country</AdminFormLabel>
          <Input
            id="award-country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g. United Kingdom"
          />
        </div>

        {/* Frequency */}
        <div className="space-y-2">
          <AdminFormLabel>Frequency</AdminFormLabel>
          <Select value={frequency} onValueChange={setFrequency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="annual">Annual</SelectItem>
              <SelectItem value="biennial">Biennial</SelectItem>
              <SelectItem value="ad_hoc">Ad-hoc</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Awarding body type */}
        <div className="space-y-2">
          <AdminFormLabel>Awarding body type</AdminFormLabel>
          <Select value={bodyType} onValueChange={setBodyType}>
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="company">Company</SelectItem>
              <SelectItem value="person">Person</SelectItem>
              <SelectItem value="organisation">Organisation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Awarding body name (free text fallback) */}
        <div className="space-y-2">
          <AdminFormLabel htmlFor="award-body-name">Awarding body name</AdminFormLabel>
          <Input
            id="award-body-name"
            value={bodyName}
            onChange={(e) => setBodyName(e.target.value)}
            placeholder="e.g. RIBA, AIA"
          />
          <p className="text-xs text-text-secondary">
            Free-text name for bodies not yet catalogued as companies.
          </p>
        </div>

        {/* Active */}
        <div className="flex items-center gap-3">
          <Switch id="award-active" checked={isActive} onCheckedChange={setIsActive} />
          <AdminFormLabel htmlFor="award-active">Active</AdminFormLabel>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Award"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
