import { useState, useCallback } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import type { AwardCategoryDTO, AwardOutcome, RecipientType } from "@/features/awards/types/awards";
import { useCreateRecipient } from "@/features/awards/hooks/useAwards";
import { searchBuildings, searchPeople, searchCompanies } from "@/features/awards/api/awards";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface AddRecipientDialogProps {
  editionId: string;
  awardId: string;
  categories: AwardCategoryDTO[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type EntityResult = { id: string; name: string; slug: string; city?: string | null };

const outcomes: { value: AwardOutcome; label: string }[] = [
  { value: "winner", label: "Winner" },
  { value: "finalist", label: "Finalist" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "longlisted", label: "Longlisted" },
  { value: "nominated", label: "Nominated" },
  { value: "commended", label: "Commended" },
  { value: "highly_commended", label: "Highly Commended" },
  { value: "special_mention", label: "Special Mention" },
];

export function AddRecipientDialog({
  editionId,
  awardId: _awardId,
  categories,
  open,
  onOpenChange,
}: AddRecipientDialogProps) {
  const createRecipient = useCreateRecipient();

  // Step state
  const [categoryId, setCategoryId] = useState("");
  const [outcome, setOutcome] = useState<AwardOutcome>("winner");
  const [recipientType, setRecipientType] = useState<RecipientType>("building");
  const [selectedEntity, setSelectedEntity] = useState<EntityResult | null>(null);
  const [notes, setNotes] = useState("");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<EntityResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Auto-select first category if only one
  const effectiveCategoryId =
    categoryId || (categories.length === 1 ? categories[0].id : "");

  const handleSearch = useCallback(async () => {
    if (searchQuery.trim().length < 2) return;
    setSearching(true);
    try {
      let results: EntityResult[] = [];
      if (recipientType === "building") {
        results = await searchBuildings(searchQuery);
      } else if (recipientType === "person") {
        results = await searchPeople(searchQuery);
      } else {
        results = await searchCompanies(searchQuery);
      }
      setSearchResults(results);
    } catch {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  }, [searchQuery, recipientType]);

  const reset = () => {
    setCategoryId("");
    setOutcome("winner");
    setRecipientType("building");
    setSelectedEntity(null);
    setNotes("");
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleSubmit = () => {
    if (!effectiveCategoryId) {
      toast.error("Please select a category");
      return;
    }
    if (!selectedEntity) {
      toast.error("Please select a recipient");
      return;
    }

    createRecipient.mutate(
      {
        edition_id: editionId,
        category_id: effectiveCategoryId,
        recipient_type: recipientType,
        recipient_building_id: recipientType === "building" ? selectedEntity.id : null,
        recipient_person_id: recipientType === "person" ? selectedEntity.id : null,
        recipient_company_id: recipientType === "company" ? selectedEntity.id : null,
        outcome,
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success(`Added ${selectedEntity.name}`);
          reset();
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to add recipient"),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Recipient</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Category */}
          {categories.length > 1 && (
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={effectiveCategoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category…" />
                </SelectTrigger>
                <SelectContent>
                  {categories.filter((c) => c.isActive).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Outcome */}
          <div className="space-y-2">
            <Label>Outcome</Label>
            <Select value={outcome} onValueChange={(v) => setOutcome(v as AwardOutcome)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {outcomes.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Entity search */}
          <div className="space-y-3">
            <Label>Recipient</Label>
            <Tabs value={recipientType} onValueChange={(v) => {
              setRecipientType(v as RecipientType);
              setSelectedEntity(null);
              setSearchResults([]);
              setSearchQuery("");
            }}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="building">Building</TabsTrigger>
                <TabsTrigger value="person">Person</TabsTrigger>
                <TabsTrigger value="company">Company</TabsTrigger>
              </TabsList>
              {(["building", "person", "company"] as RecipientType[]).map((type) => (
                <TabsContent key={type} value={type} className="space-y-3 mt-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-secondary" />
                      <Input
                        className="pl-8"
                        placeholder={`Search ${type}s…`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSearch}
                      disabled={searching || searchQuery.trim().length < 2}
                    >
                      {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                    </Button>
                  </div>

                  {selectedEntity && (
                    <div className="rounded-sm border border-brand-primary bg-brand-primary/5 p-3 flex items-center justify-between">
                      <span className="text-sm font-medium">{selectedEntity.name}</span>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedEntity(null)}>
                        Change
                      </Button>
                    </div>
                  )}

                  {!selectedEntity && searchResults.length > 0 && (
                    <div className="max-h-48 overflow-y-auto rounded-sm border border-border-default divide-y divide-border-default">
                      {searchResults.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted transition-colors"
                          onClick={() => setSelectedEntity(r)}
                        >
                          <span className="font-medium">{r.name}</span>
                          {r.city && (
                            <span className="ml-2 text-text-secondary">{r.city}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="recipient-notes">Notes (optional)</Label>
            <Textarea
              id="recipient-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createRecipient.isPending || !selectedEntity}>
              {createRecipient.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Recipient
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
