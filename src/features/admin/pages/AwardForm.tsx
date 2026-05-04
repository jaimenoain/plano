import { useState, useEffect } from "react";
import { useNavigate, useParams, type MetaFunction } from "react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAward, useCreateAward, useUpdateAward } from "@/features/awards/hooks/useAwards";
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

  if (isEdit && loadingAward) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <h1 className="text-4xl font-bold tracking-tight text-text-primary">
        {isEdit ? "Edit Award" : "New Award"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="award-name">Name</Label>
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
          <Label htmlFor="award-slug">Slug</Label>
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
          <Label htmlFor="award-description">Description</Label>
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
          <Label htmlFor="award-website">Website</Label>
          <Input
            id="award-website"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://…"
          />
        </div>

        {/* Country */}
        <div className="space-y-2">
          <Label htmlFor="award-country">Country</Label>
          <Input
            id="award-country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g. United Kingdom"
          />
        </div>

        {/* Frequency */}
        <div className="space-y-2">
          <Label>Frequency</Label>
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
          <Label>Awarding body type</Label>
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
          <Label htmlFor="award-body-name">Awarding body name</Label>
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
          <Label htmlFor="award-active">Active</Label>
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
