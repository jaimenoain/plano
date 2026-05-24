import { useState, useEffect } from "react";
import { useNavigate, useParams, type MetaFunction } from "react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useEdition,
  useCreateEdition,
  useUpdateEdition,
} from "@/features/awards/hooks/useAwards";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AdminFormLabel, AdminPageHeader } from "@/features/admin/components/admin-ui";

export const meta: MetaFunction = () => [{ title: "Edition Form | Plano Admin" }];

export default function EditionForm() {
  const { awardId, editionId } = useParams<{ awardId: string; editionId: string }>();
  const isEdit = !!editionId;
  const navigate = useNavigate();

  const { data: existingEdition, isLoading: loadingEdition } = useEdition(editionId ?? "");
  const createEdition = useCreateEdition();
  const updateEdition = useUpdateEdition();

  const [year, setYear] = useState("");
  const [editionLabel, setEditionLabel] = useState("");
  const [editionNumber, setEditionNumber] = useState("");
  const [slug, setSlug] = useState("");
  const [editionDate, setEditionDate] = useState("");
  const [ceremonyLocation, setCeremonyLocation] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!existingEdition) return;
    setYear(existingEdition.year?.toString() ?? "");
    setEditionLabel(existingEdition.editionLabel ?? "");
    setEditionNumber(existingEdition.editionNumber?.toString() ?? "");
    setSlug(existingEdition.slug ?? "");
    setEditionDate(existingEdition.editionDate ?? "");
    setCeremonyLocation(existingEdition.ceremonyLocation ?? "");
    setNotes(existingEdition.notes ?? "");
  }, [existingEdition]);

  const saving = createEdition.isPending || updateEdition.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const yearNum = year ? parseInt(year, 10) : null;
    const editionNumberNum = editionNumber ? parseInt(editionNumber, 10) : null;
    if (!yearNum && !editionLabel.trim()) {
      toast.error("Either year or edition label is required");
      return;
    }

    if (isEdit && editionId) {
      updateEdition.mutate(
        {
          editionId,
          payload: {
            year: yearNum,
            edition_label: editionLabel.trim() || null,
            edition_number: editionNumberNum,
            slug: slug.trim() || null,
            edition_date: editionDate || null,
            ceremony_location: ceremonyLocation.trim() || null,
            notes: notes.trim() || null,
          },
        },
        {
          onSuccess: () => {
            toast.success("Edition updated");
            navigate(`/admin/awards/${awardId}/editions/${editionId}`);
          },
          onError: () => toast.error("Failed to update edition"),
        },
      );
    } else if (awardId) {
      createEdition.mutate(
        {
          award_id: awardId,
          year: yearNum,
          edition_label: editionLabel.trim() || null,
          edition_number: editionNumberNum,
          slug: slug.trim() || null,
          edition_date: editionDate || null,
          ceremony_location: ceremonyLocation.trim() || null,
          notes: notes.trim() || null,
        },
        {
          onSuccess: (created) => {
            toast.success("Edition created");
            navigate(`/admin/awards/${awardId}/editions/${created.id}`);
          },
          onError: () => toast.error("Failed to create edition"),
        },
      );
    }
  };

  if (isEdit && loadingEdition) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <AdminPageHeader title={isEdit ? "Edit edition" : "New edition"} eyebrow="Editions" />

      <form onSubmit={handleSubmit} className="space-y-6 border-t border-border-default pt-6">
        <div className="space-y-2">
          <AdminFormLabel htmlFor="edition-year">Year</AdminFormLabel>
          <Input
            id="edition-year"
            type="number"
            min={1800}
            max={2100}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="e.g. 2024"
          />
        </div>

        <div className="space-y-2">
          <AdminFormLabel htmlFor="edition-label">Edition label</AdminFormLabel>
          <Input
            id="edition-label"
            value={editionLabel}
            onChange={(e) => setEditionLabel(e.target.value)}
            placeholder="e.g. XVI, Spring 2024, 2024 — Asia Pacific"
          />
          <p className="text-xs text-text-secondary">
            Use instead of (or alongside) a year for named editions. Required if no year is set.
          </p>
        </div>

        <div className="space-y-2">
          <AdminFormLabel htmlFor="edition-number">Edition number</AdminFormLabel>
          <Input
            id="edition-number"
            type="number"
            min={1}
            value={editionNumber}
            onChange={(e) => setEditionNumber(e.target.value)}
            placeholder="e.g. 16"
          />
          <p className="text-xs text-text-secondary">
            Ordinal for ordering when year is absent (e.g. 16 for BEAU XVI).
          </p>
        </div>

        <div className="space-y-2">
          <AdminFormLabel htmlFor="edition-slug">URL slug</AdminFormLabel>
          <Input
            id="edition-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
            placeholder="e.g. xvi, spring-2024"
          />
          <p className="text-xs text-text-secondary">
            Lowercase, hyphens only. Auto-populated from year for year-based editions. Must be unique per award.
          </p>
        </div>

        <div className="space-y-2">
          <AdminFormLabel htmlFor="edition-date">Ceremony date</AdminFormLabel>
          <Input
            id="edition-date"
            type="date"
            value={editionDate}
            onChange={(e) => setEditionDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <AdminFormLabel htmlFor="edition-location">Ceremony location</AdminFormLabel>
          <Input
            id="edition-location"
            value={ceremonyLocation}
            onChange={(e) => setCeremonyLocation(e.target.value)}
            placeholder="e.g. RIBA, London"
          />
        </div>

        <div className="space-y-2">
          <AdminFormLabel htmlFor="edition-notes">Notes</AdminFormLabel>
          <Textarea id="edition-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Edition"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
