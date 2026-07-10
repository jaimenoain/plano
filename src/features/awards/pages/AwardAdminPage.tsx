import { useState } from "react";
import { useLoaderData, Link, type MetaFunction } from "react-router";
import { toast } from "sonner";
import {
  Trophy,
  Calendar,
  LayoutList,
  Users,
  Lightbulb,
  Loader2,
  Plus,
  Trash2,
  Check,
  X,
  ExternalLink,
  CalendarDays,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useAward,
  useEditionsByAward,
  useCategoriesByAward,
  useAwardAdmins,
  useUpdateAward,
  useCreateEdition,
  useDeleteEdition,
  useCreateCategory,
  useUpdateCategory,
  useSuggestions,
  useApproveSuggestion,
  useRejectSuggestion,
  useRecipientsByEdition,
  useDeleteRecipient,
} from "@/features/awards/hooks/useAwards";
import { cn } from "@/lib/utils";
import { awardAdminLoader, type AwardAdminLoaderData } from "./AwardAdminPage.loader";
import { AdminFormLabel } from "@/features/admin/components/admin-ui";
import { AddRecipientDialog } from "@/features/admin/components/AddRecipientDialog";
import { EditionEventsSection } from "@/features/awards/components/EditionEventsSection";
import {
  AwardAdminPageHeader,
  awardAdminTableHeadClass,
  outcomeBadgeClassName,
} from "@/features/awards/components/award-admin-ui";

export { awardAdminLoader as loader } from "./AwardAdminPage.loader";

export const meta: MetaFunction<typeof awardAdminLoader> = ({ loaderData: data }) => {
  if (!data) return [{ title: "Award Admin | Plano" }];
  return [{ title: `Manage ${(data as AwardAdminLoaderData).awardName} | Plano` }];
};

// ── Award Info tab ───────────────────────────────────────────

function AwardInfoTab({ awardId }: { awardId: string }) {
  const { data: award, isLoading } = useAward(awardId);
  const updateAward = useUpdateAward();

  const [form, setForm] = useState<{
    name: string;
    description: string;
    website: string;
    country: string;
  } | null>(null);

  // Initialise form once award loads.
  if (award && !form) {
    setForm({
      name:        award.name,
      description: award.description ?? "",
      website:     award.website ?? "",
      country:     award.country ?? "",
    });
  }

  if (isLoading || !form) {
    return <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-text-secondary" /></div>;
  }

  const handleSave = () => {
    updateAward.mutate(
      { awardId, payload: { name: form.name, description: form.description || null, website: form.website || null, country: form.country || null } },
      {
        onSuccess: () => toast.success("Award updated"),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError:   (e: any) => toast.error(e.message ?? "Update failed"),
      },
    );
  };

  const dirty =
    form.name        !== (award?.name ?? "") ||
    form.description !== (award?.description ?? "") ||
    form.website     !== (award?.website ?? "") ||
    form.country     !== (award?.country ?? "");

  return (
    <div className="max-w-lg space-y-5 py-2">
      <div className="space-y-1.5">
        <AdminFormLabel htmlFor="ai-name">Award name</AdminFormLabel>
        <Input
          id="ai-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          disabled={updateAward.isPending}
        />
      </div>

      <div className="space-y-1.5">
        <AdminFormLabel htmlFor="ai-desc">Description</AdminFormLabel>
        <Textarea
          id="ai-desc"
          rows={4}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          disabled={updateAward.isPending}
          className="resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <AdminFormLabel htmlFor="ai-website">Official website</AdminFormLabel>
        <Input
          id="ai-website"
          type="url"
          placeholder="https://"
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
          disabled={updateAward.isPending}
        />
      </div>

      <div className="space-y-1.5">
        <AdminFormLabel htmlFor="ai-country">Country</AdminFormLabel>
        <Input
          id="ai-country"
          placeholder="e.g. United Kingdom"
          value={form.country}
          onChange={(e) => setForm({ ...form, country: e.target.value })}
          disabled={updateAward.isPending}
        />
      </div>

      <Button
        onClick={handleSave}
        disabled={!dirty || updateAward.isPending || !form.name.trim()}
      >
        {updateAward.isPending ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}

// ── Editions tab ─────────────────────────────────────────────

function EditionsTab({ awardId }: { awardId: string }) {
  const { data: editions = [], isLoading } = useEditionsByAward(awardId);
  const createEdition = useCreateEdition();
  const deleteEdition = useDeleteEdition();
  const [adding, setAdding]               = useState(false);
  const [newYear, setNewYear]             = useState("");
  const [newLocation, setNewLocation]     = useState("");
  const [deletingId, setDeletingId]       = useState<string | null>(null);
  const [eventsEditionId, setEventsEditionId] = useState<string | null>(null);
  const eventsEdition = editions.find((e) => e.id === eventsEditionId);

  const handleAdd = () => {
    const year = parseInt(newYear, 10);
    if (!newYear || isNaN(year)) { toast.error("Enter a valid year"); return; }
    createEdition.mutate(
      { award_id: awardId, year, ceremony_location: newLocation || null },
      {
        onSuccess: () => { toast.success("Edition added"); setAdding(false); setNewYear(""); setNewLocation(""); },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError:   (e: any) => toast.error(e.message),
      },
    );
  };

  if (isLoading) return <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-text-secondary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">{editions.length} edition{editions.length !== 1 ? "s" : ""}</p>
        <Button size="sm" variant="outline" onClick={() => setAdding(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />Add edition
        </Button>
      </div>

      {adding && (
        <div className="border border-border-default rounded-sm p-4 space-y-3 bg-surface-muted/30">
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Year</Label>
              <Input placeholder="2024" value={newYear} onChange={(e) => setNewYear(e.target.value)} className="h-8" />
            </div>
            <div className="flex-2 space-y-1">
              <Label className="text-xs">Ceremony location (optional)</Label>
              <Input placeholder="London, UK" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} className="h-8" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={createEdition.isPending}>
              {createEdition.isPending ? "Adding…" : "Add"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewYear(""); setNewLocation(""); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="border border-border-default rounded-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-muted/50 hover:bg-surface-muted/50 border-border-default">
              <TableHead className={awardAdminTableHeadClass}>Year</TableHead>
              <TableHead className={awardAdminTableHeadClass}>Location</TableHead>
              <TableHead className={cn(awardAdminTableHeadClass, "text-center")}>Recipients</TableHead>
              <TableHead className={cn(awardAdminTableHeadClass, "w-24")} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {editions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-text-secondary text-sm">
                  No editions yet. Add the first one above.
                </TableCell>
              </TableRow>
            ) : (
              editions.map((ed) => (
                <TableRow key={ed.id} className="border-border-default">
                  <TableCell className="font-medium">{ed.year ?? "—"}</TableCell>
                  <TableCell className="text-text-secondary text-sm">{ed.ceremonyLocation ?? "—"}</TableCell>
                  <TableCell className="text-center text-sm text-text-secondary">{ed.recipientCount ?? 0}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-text-secondary hover:text-text-primary"
                        title="Manage events"
                        onClick={() => setEventsEditionId(ed.id)}
                      >
                        <CalendarDays className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-text-secondary hover:text-feedback-destructive"
                        onClick={() => setDeletingId(ed.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edition events dialog */}
      <Dialog open={!!eventsEditionId} onOpenChange={(o) => !o && setEventsEditionId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Events — {eventsEdition?.year ?? eventsEdition?.editionDate ?? "Edition"}
            </DialogTitle>
          </DialogHeader>
          {eventsEditionId && (
            <EditionEventsSection editionId={eventsEditionId} />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete edition?</AlertDialogTitle>
            <AlertDialogDescription>
              This will also remove all recipients linked to this edition. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-feedback-destructive hover:bg-feedback-destructive/90"
              onClick={() => {
                if (!deletingId) return;
                deleteEdition.mutate(deletingId, {
                  onSuccess: () => { toast.success("Edition deleted"); setDeletingId(null); },
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onError:   (e: any) => toast.error(e.message),
                });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Categories tab ───────────────────────────────────────────

function CategoriesTab({ awardId }: { awardId: string }) {
  const { data: categories = [], isLoading } = useCategoriesByAward(awardId);
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const [adding, setAdding]   = useState(false);
  const [newName, setNewName] = useState("");

  const handleAdd = () => {
    if (!newName.trim()) return;
    createCategory.mutate(
      { award_id: awardId, name: newName.trim() },
      {
        onSuccess: () => { toast.success("Category added"); setAdding(false); setNewName(""); },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError:   (e: any) => toast.error(e.message),
      },
    );
  };

  const handleArchive = (categoryId: string, isActive: boolean) => {
    updateCategory.mutate(
      { categoryId, payload: { is_active: !isActive } },
      {
        onSuccess: () => toast.success(isActive ? "Category archived" : "Category restored"),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError:   (e: any) => toast.error(e.message),
      },
    );
  };

  if (isLoading) return <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-text-secondary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">{categories.length} categor{categories.length !== 1 ? "ies" : "y"}</p>
        <Button size="sm" variant="outline" onClick={() => setAdding(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />Add category
        </Button>
      </div>

      {adding && (
        <div className="border border-border-default rounded-sm p-4 space-y-3 bg-surface-muted/30">
          <div className="space-y-1">
            <Label className="text-xs">Category name</Label>
            <Input placeholder="e.g. New Building" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-8" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={createCategory.isPending || !newName.trim()}>
              {createCategory.isPending ? "Adding…" : "Add"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewName(""); }}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="border border-border-default rounded-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-muted/50 hover:bg-surface-muted/50 border-border-default">
              <TableHead className={awardAdminTableHeadClass}>Name</TableHead>
              <TableHead className={cn(awardAdminTableHeadClass, "text-center")}>Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center text-text-secondary text-sm">
                  No categories yet.
                </TableCell>
              </TableRow>
            ) : (
              categories.map((cat) => (
                <TableRow key={cat.id} className="border-border-default">
                  <TableCell className="font-medium text-sm">{cat.name}</TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={cat.isActive}
                      onCheckedChange={() => handleArchive(cat.id, cat.isActive)}
                      className="data-[state=checked]:bg-feedback-success"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ── Recipients tab ───────────────────────────────────────────

function RecipientsTab({ awardId }: { awardId: string }) {
  const { data: editions = [] }               = useEditionsByAward(awardId);
  const [selectedEditionId, setSelectedEditionId] = useState<string>("");
  const { data: recipients = [], isLoading }  = useRecipientsByEdition(selectedEditionId);
  const { data: categories = [] }             = useCategoriesByAward(awardId);
  const deleteRecipient = useDeleteRecipient();
  const [addOpen, setAddOpen]     = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <AdminFormLabel htmlFor="edition-select" className="shrink-0">
          Edition
        </AdminFormLabel>
        <select
          id="edition-select"
          value={selectedEditionId}
          onChange={(e) => setSelectedEditionId(e.target.value)}
          className="h-8 rounded-sm border border-border-default bg-surface-card px-2 text-sm text-text-primary focus:outline-hidden focus:ring-1 focus:ring-brand-accent"
        >
          <option value="">Select an edition…</option>
          {editions.map((ed) => (
            <option key={ed.id} value={ed.id}>
              {ed.year ?? "Undated"}{ed.ceremonyLocation ? ` — ${ed.ceremonyLocation}` : ""}
            </option>
          ))}
        </select>

        {selectedEditionId && (
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} className="ml-auto gap-1.5">
            <Plus className="h-4 w-4" />Add recipient
          </Button>
        )}
      </div>

      {selectedEditionId && (
        <>
          {isLoading ? (
            <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-text-secondary" /></div>
          ) : (
            <div className="border border-border-default rounded-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-surface-muted/50 hover:bg-surface-muted/50 border-border-default">
                    <TableHead className={awardAdminTableHeadClass}>Recipient</TableHead>
                    <TableHead className={awardAdminTableHeadClass}>Category</TableHead>
                    <TableHead className={awardAdminTableHeadClass}>Outcome</TableHead>
                    <TableHead className={cn(awardAdminTableHeadClass, "w-10")} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-text-secondary text-sm">
                        No recipients for this edition yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recipients.map((r) => {
                      const name =
                        r.recipientType === "building" ? r.building?.name :
                        r.recipientType === "person"   ? r.person?.name :
                        r.company?.name;
                      return (
                        <TableRow key={r.id} className="border-border-default">
                          <TableCell className="font-medium text-sm">{name ?? "—"}</TableCell>
                          <TableCell className="text-text-secondary text-sm">{r.category?.name ?? "—"}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn("capitalize text-2xs", outcomeBadgeClassName(r.outcome))}
                            >
                              {r.outcome.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-text-secondary hover:text-feedback-destructive"
                              onClick={() => setDeletingId(r.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {addOpen && (
            <AddRecipientDialog
              awardId={awardId}
              editionId={selectedEditionId}
              categories={categories}
              open={addOpen}
              onOpenChange={setAddOpen}
            />
          )}

          <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove recipient?</AlertDialogTitle>
                <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-feedback-destructive hover:bg-feedback-destructive/90"
                  onClick={() => {
                    if (!deletingId) return;
                    deleteRecipient.mutate(deletingId, {
                      onSuccess: () => { toast.success("Recipient removed"); setDeletingId(null); },
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      onError:   (e: any) => toast.error(e.message),
                    });
                  }}
                >
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}

// ── Suggestions tab ──────────────────────────────────────────

function SuggestionsTab({ awardId }: { awardId: string }) {
  const { data: allSuggestions = [], isLoading } = useSuggestions("pending");
  const approve = useApproveSuggestion();
  const reject  = useRejectSuggestion();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote]   = useState("");

  // Filter to only this award's suggestions (RLS already scopes by admin, but
  // the hook fetches all pending — filter client-side for the award admin view).
  const suggestions = allSuggestions.filter((s) => s.awardId === awardId);

  if (isLoading) return <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-text-secondary" /></div>;

  return (
    <div className="space-y-4">
      {suggestions.length === 0 ? (
        <p className="py-12 text-center text-sm text-text-secondary">No pending suggestions for this award.</p>
      ) : (
        <div className="border border-border-default rounded-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-surface-muted/50 hover:bg-surface-muted/50 border-border-default">
                <TableHead className={awardAdminTableHeadClass}>Recipient</TableHead>
                <TableHead className={awardAdminTableHeadClass}>Year / outcome</TableHead>
                <TableHead className={awardAdminTableHeadClass}>Source</TableHead>
                <TableHead className={awardAdminTableHeadClass}>Submitted by</TableHead>
                <TableHead className={cn(awardAdminTableHeadClass, "text-right")}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suggestions.map((s) => {
                const recipientName =
                  s.recipientType === "building" ? s.building?.name :
                  s.recipientType === "person"   ? s.person?.name :
                  s.company?.name;
                return (
                  <TableRow key={s.id} className="border-border-default align-top">
                    <TableCell className="font-medium text-sm">{recipientName ?? "—"}</TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {s.year ?? "—"}
                      <br />
                      <Badge
                        variant="outline"
                        className={cn("capitalize text-2xs mt-1", outcomeBadgeClassName(s.outcome))}
                      >
                        {s.outcome.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {s.sourceUrl ? (
                        <a
                          href={s.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary underline-offset-2 hover:underline"
                        >
                          Source <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-text-secondary opacity-40">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {s.submittedByProfile?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-2xs text-feedback-success border-feedback-success/30 hover:bg-feedback-success/10"
                          disabled={approve.isPending}
                          onClick={() =>
                            approve.mutate(s.id, {
                              onSuccess: () => toast.success("Suggestion approved"),
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              onError:   (e: any) => toast.error(e.message),
                            })
                          }
                        >
                          <Check className="h-3.5 w-3.5" />Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-2xs text-feedback-destructive border-feedback-destructive/30 hover:bg-feedback-destructive/10"
                          onClick={() => { setRejectingId(s.id); setRejectNote(""); }}
                        >
                          <X className="h-3.5 w-3.5" />Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!rejectingId} onOpenChange={(o) => !o && setRejectingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject suggestion</AlertDialogTitle>
            <AlertDialogDescription>Optionally leave a note for the submitter.</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason for rejection (optional)"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            rows={3}
            className="resize-none my-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-feedback-destructive hover:bg-feedback-destructive/90"
              onClick={() => {
                if (!rejectingId) return;
                reject.mutate(
                  { id: rejectingId, note: rejectNote || undefined },
                  {
                    onSuccess: () => { toast.success("Suggestion rejected"); setRejectingId(null); },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onError:   (e: any) => toast.error(e.message),
                  },
                );
              }}
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Team tab ─────────────────────────────────────────────────

function TeamTab({ awardId }: { awardId: string }) {
  const { data: admins = [], isLoading } = useAwardAdmins(awardId);

  if (isLoading) return <div className="py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-text-secondary" /></div>;

  return (
    <div className="space-y-4">
      <div className="border border-border-default rounded-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-muted/50 hover:bg-surface-muted/50 border-border-default">
              <TableHead className={awardAdminTableHeadClass}>User</TableHead>
              <TableHead className={awardAdminTableHeadClass}>Role</TableHead>
              <TableHead className={awardAdminTableHeadClass}>Since</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-text-secondary text-sm">
                  No team members found.
                </TableCell>
              </TableRow>
            ) : (
              admins.map((admin) => (
                <TableRow key={admin.id} className="border-border-default">
                  <TableCell className="font-medium text-sm">
                    {admin.profile?.username ?? admin.userId}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "capitalize text-2xs",
                        admin.role === "owner"
                          ? "border-border-default bg-surface-card text-text-primary"
                          : "border-transparent bg-surface-muted text-text-secondary",
                      )}
                    >
                      {admin.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-text-secondary">
                    {new Date(admin.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-text-secondary">
        Inviting additional editors is coming in a future update.
      </p>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────

export default function AwardAdminPage() {
  const { awardId, awardName, awardSlug } = useLoaderData() as AwardAdminLoaderData;

  return (
    <AppLayout showBack title={`Manage ${awardName}`} showHeader>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <AwardAdminPageHeader
          title={awardName}
          actions={
            <Button variant="outline" size="sm" asChild className="gap-1.5">
              <Link to={`/award/${awardSlug}`}>
                <Trophy className="h-4 w-4" />
                View public page
              </Link>
            </Button>
          }
        />

        <Tabs defaultValue="info">
          <TabsList className="mb-6 h-auto w-full justify-start gap-4 overflow-x-auto rounded-none border-b border-border-default bg-transparent p-0">
            <TabsTrigger
              value="info"
              className="gap-1.5 rounded-none border-b-2 border-transparent px-0 pb-3 data-[state=active]:border-text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <Trophy className="h-3.5 w-3.5" />Award info
            </TabsTrigger>
            <TabsTrigger
              value="editions"
              className="gap-1.5 rounded-none border-b-2 border-transparent px-0 pb-3 data-[state=active]:border-text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <Calendar className="h-3.5 w-3.5" />Editions
            </TabsTrigger>
            <TabsTrigger
              value="categories"
              className="gap-1.5 rounded-none border-b-2 border-transparent px-0 pb-3 data-[state=active]:border-text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <LayoutList className="h-3.5 w-3.5" />Categories
            </TabsTrigger>
            <TabsTrigger
              value="recipients"
              className="gap-1.5 rounded-none border-b-2 border-transparent px-0 pb-3 data-[state=active]:border-text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <LayoutList className="h-3.5 w-3.5" />Recipients
            </TabsTrigger>
            <TabsTrigger
              value="suggestions"
              className="gap-1.5 rounded-none border-b-2 border-transparent px-0 pb-3 data-[state=active]:border-text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <Lightbulb className="h-3.5 w-3.5" />Suggestions
            </TabsTrigger>
            <TabsTrigger
              value="team"
              className="gap-1.5 rounded-none border-b-2 border-transparent px-0 pb-3 data-[state=active]:border-text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <Users className="h-3.5 w-3.5" />Team
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <AwardInfoTab awardId={awardId} />
          </TabsContent>
          <TabsContent value="editions">
            <EditionsTab awardId={awardId} />
          </TabsContent>
          <TabsContent value="categories">
            <CategoriesTab awardId={awardId} />
          </TabsContent>
          <TabsContent value="recipients">
            <RecipientsTab awardId={awardId} />
          </TabsContent>
          <TabsContent value="suggestions">
            <SuggestionsTab awardId={awardId} />
          </TabsContent>
          <TabsContent value="team">
            <TeamTab awardId={awardId} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
