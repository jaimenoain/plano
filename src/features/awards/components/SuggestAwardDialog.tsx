import { useState, useMemo } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  useAwards, 
  useEditionsByAward, 
  useCategoriesByAward, 
  useCreateSuggestion 
} from "@/features/awards/hooks/useAwards";
import { useToast } from "@/hooks/use-toast";
import { AwardOutcome } from "@/features/awards/types/awards";
import { ArrowLeft, ArrowRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuggestAwardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialRecipient?: {
    type: 'building' | 'person' | 'company';
    id: string;
    name: string;
  };
}

const OUTCOMES: { value: AwardOutcome; label: string; description: string }[] = [
  { value: 'winner', label: 'Winner', description: 'The top prize in this category' },
  { value: 'highly_commended', label: 'Highly Commended', description: 'Exceptional recognition' },
  { value: 'commended', label: 'Commended', description: 'Strong recognition' },
  { value: 'special_mention', label: 'Special Mention', description: 'Noteworthy achievement' },
  { value: 'finalist', label: 'Finalist', description: 'One of the top contenders' },
  { value: 'shortlisted', label: 'Shortlisted', description: 'Made it to the second round' },
  { value: 'longlisted', label: 'Longlisted', description: 'Made it to the first round' },
  { value: 'nominated', label: 'Nominated', description: 'Officially put forward' },
];

export function SuggestAwardDialog({ isOpen, onClose, initialRecipient }: SuggestAwardDialogProps) {
  const [step, setStep] = useState(1);
  const [awardSearch, setAwardSearch] = useState("");
  const [selectedAwardId, setSelectedAwardId] = useState<string>("");
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedOutcome, setSelectedOutcome] = useState<AwardOutcome>('winner');
  const [sourceUrl, setSourceUrl] = useState("");
  const [notes, setNotes] = useState("");

  const { data: awards = [] } = useAwards();
  const { data: editions = [] } = useEditionsByAward(selectedAwardId);
  const { data: categories = [] } = useCategoriesByAward(selectedAwardId);
  const createSuggestion = useCreateSuggestion();
  const { toast } = useToast();

  const filteredAwards = useMemo(() => {
    if (!awardSearch) return awards.slice(0, 5);
    return awards.filter(a => a.name.toLowerCase().includes(awardSearch.toLowerCase())).slice(0, 10);
  }, [awards, awardSearch]);

  const existingEdition = editions.find(e => e.year === parseInt(year));

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    try {
      await createSuggestion.mutateAsync({
        awardId: selectedAwardId,
        editionId: existingEdition?.id || null,
        categoryId: selectedCategoryId === "main" ? null : (selectedCategoryId || null),
        recipientType: initialRecipient?.type,
        recipientBuildingId: initialRecipient?.type === 'building' ? initialRecipient.id : null,
        recipientPersonId: initialRecipient?.type === 'person' ? initialRecipient.id : null,
        recipientCompanyId: initialRecipient?.type === 'company' ? initialRecipient.id : null,
        outcome: selectedOutcome,
        year: parseInt(year),
        sourceUrl,
        notes
      });

      toast({
        title: "Suggestion submitted",
        description: "Thank you — your suggestion is under review.",
      });
      onClose();
      // Reset state
      setStep(1);
      setSelectedAwardId("");
      setYear(new Date().getFullYear().toString());
      setSourceUrl("");
      setNotes("");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const isStep1Valid = !!selectedAwardId && !!year;
  const isStep2Valid = !!selectedOutcome;
  const isStep4Valid = !!sourceUrl && sourceUrl.startsWith("http");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-border-default rounded-sm bg-surface-card">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-bold">Suggest an Award</DialogTitle>
          <DialogDescription className="text-secondary">
            Help us maintain the historical record of architecture awards.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Award</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
                  <Input 
                    placeholder="Search award (e.g. Stirling Prize)" 
                    className="pl-9 rounded-sm border-border-default"
                    value={awardSearch}
                    onChange={(e) => setAwardSearch(e.target.value)}
                  />
                </div>
                <div className="mt-2 space-y-1 max-h-[160px] overflow-y-auto">
                  {filteredAwards.map(a => (
                    <button
                      key={a.id}
                      onClick={() => {
                        setSelectedAwardId(a.id);
                        setAwardSearch("");
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-sm text-sm transition-colors",
                        selectedAwardId === a.id ? "bg-brand-primary text-text-inverse" : "hover:bg-surface-muted"
                      )}
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Year</Label>
                <Input 
                  type="number" 
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="Year (e.g. 2024)"
                  className="rounded-sm border-border-default"
                />
                {selectedAwardId && (
                  <p className="text-xs text-secondary italic">
                    {existingEdition 
                      ? "✓ Existing edition found for this year." 
                      : "A new edition will be created for this year."}
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Category (Optional)</Label>
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger className="rounded-sm border-border-default">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">Main Award / No Category</SelectItem>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Outcome</Label>
                <div className="grid grid-cols-1 gap-2">
                  {OUTCOMES.map(o => (
                    <button
                      key={o.value}
                      onClick={() => setSelectedOutcome(o.value)}
                      className={cn(
                        "flex flex-col items-start px-3 py-2 rounded-sm border text-left transition-colors",
                        selectedOutcome === o.value 
                          ? "border-brand-primary bg-brand-primary/5" 
                          : "border-border-default hover:bg-surface-muted"
                      )}
                    >
                      <span className="text-sm font-bold">{o.label}</span>
                      <span className="text-xs text-secondary">{o.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Recipient</Label>
                <div className="p-4 rounded-sm border border-border-default bg-surface-muted">
                  <p className="text-sm font-bold">{initialRecipient?.name}</p>
                  <p className="eyebrow tracking-widest mt-1">
                    {initialRecipient?.type}
                  </p>
                </div>
                <p className="text-xs text-text-secondary italic">
                  Suggesting an award for this {initialRecipient?.type}.
                </p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Source URL (Required)</Label>
                <Input 
                  placeholder="https://official-award-website.com/winners/2024"
                  className="rounded-sm border-border-default"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                />
                <p className="text-xs text-secondary">
                  Link to an official announcement or press release for verification.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea 
                  placeholder="Any additional context for the admin..."
                  className="rounded-sm border-border-default min-h-[100px]"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 pt-0 flex sm:justify-between">
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" size="sm" onClick={handleBack} className="rounded-sm border-border-default">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {step < 4 ? (
              <Button 
                size="sm" 
                onClick={handleNext} 
                disabled={(step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid)}
                className="bg-brand-primary text-text-inverse rounded-sm"
              >
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button 
                size="sm" 
                onClick={handleSubmit} 
                disabled={!isStep4Valid || createSuggestion.isPending}
                className="bg-brand-primary text-text-inverse rounded-sm"
              >
                {createSuggestion.isPending ? "Submitting..." : "Submit Suggestion"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
