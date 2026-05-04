import { useState } from "react";
import { Link, useParams, useNavigate, type MetaFunction } from "react-router";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useEdition,
  useAward,
  useRecipientsByEdition,
  useCategoriesByAward,
  useDeleteRecipient,
  useDeleteEdition,
} from "@/features/awards/hooks/useAwards";
import type { AwardRecipientDTO } from "@/features/awards/types/awards";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { AddRecipientDialog } from "@/features/admin/components/AddRecipientDialog";

export const meta: MetaFunction = () => [{ title: "Edition Detail | Plano Admin" }];

const outcomeBadgeVariant: Record<string, "default" | "secondary" | "outline"> = {
  winner: "default",
  finalist: "secondary",
  shortlisted: "secondary",
  highly_commended: "secondary",
  commended: "outline",
  special_mention: "outline",
  nominated: "outline",
  longlisted: "outline",
};

const outcomeLabel: Record<string, string> = {
  winner: "Winner",
  finalist: "Finalist",
  shortlisted: "Shortlisted",
  longlisted: "Longlisted",
  nominated: "Nominated",
  commended: "Commended",
  highly_commended: "Highly Commended",
  special_mention: "Special Mention",
};

function recipientName(r: AwardRecipientDTO): string {
  if (r.building) return r.building.name;
  if (r.person) return r.person.name;
  if (r.company) return r.company.name;
  return "Unknown";
}

function recipientLink(r: AwardRecipientDTO): string | null {
  if (r.building) return `/building/${r.building.id}/${r.building.slug}`;
  if (r.person) return `/person/${r.person.slug}`;
  if (r.company) return `/company/${r.company.slug}`;
  return null;
}

export default function EditionDetail() {
  const { awardId, editionId } = useParams<{ awardId: string; editionId: string }>();
  const navigate = useNavigate();

  const { data: award } = useAward(awardId ?? "");
  const { data: edition, isLoading: loadingEdition } = useEdition(editionId ?? "");
  const { data: recipients, isLoading: loadingRecipients } = useRecipientsByEdition(editionId ?? "");
  const { data: categories } = useCategoriesByAward(awardId ?? "");

  const deleteRecipient = useDeleteRecipient();
  const deleteEdition = useDeleteEdition();
  const [deleteTarget, setDeleteTarget] = useState<AwardRecipientDTO | null>(null);
  const [showAddRecipient, setShowAddRecipient] = useState(false);
  const [showDeleteEdition, setShowDeleteEdition] = useState(false);

  const handleDeleteRecipient = () => {
    if (!deleteTarget) return;
    deleteRecipient.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Recipient removed");
        setDeleteTarget(null);
      },
      onError: () => toast.error("Failed to remove recipient"),
    });
  };

  const handleDeleteEdition = () => {
    if (!editionId || !awardId) return;
    deleteEdition.mutate(editionId, {
      onSuccess: () => {
        toast.success("Edition deleted");
        navigate(`/admin/awards/${awardId}`);
      },
      onError: () => toast.error("Failed to delete edition"),
    });
  };

  // Group recipients by category
  const grouped = new Map<string, AwardRecipientDTO[]>();
  for (const r of recipients ?? []) {
    const catName = r.category?.name ?? "Uncategorised";
    const arr = grouped.get(catName) ?? [];
    arr.push(r);
    grouped.set(catName, arr);
  }

  if (loadingEdition) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
      </div>
    );
  }

  if (!edition) {
    return (
      <div className="p-8 text-text-secondary">
        Edition not found. <Link to={`/admin/awards/${awardId}`} className="underline">Back to award</Link>
      </div>
    );
  }

  const editionLabel = edition.year ?? edition.editionDate ?? "Edition";

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm text-text-secondary mb-1">
            <Link to={`/admin/awards/${awardId}`} className="hover:underline underline-offset-4">
              ← {award?.name ?? "Award"}
            </Link>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-text-primary">
            {editionLabel}
          </h1>
          {edition.ceremonyLocation && (
            <p className="mt-1 text-sm text-text-secondary">{edition.ceremonyLocation}</p>
          )}
          {edition.notes && (
            <p className="mt-2 max-w-2xl text-sm text-text-secondary leading-relaxed">{edition.notes}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" onClick={() => setShowAddRecipient(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Recipient
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-feedback-destructive"
            onClick={() => setShowDeleteEdition(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Edition
          </Button>
        </div>
      </div>

      {/* Recipients by category */}
      {loadingRecipients ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-text-secondary" />
        </div>
      ) : (recipients ?? []).length === 0 ? (
        <div className="rounded-sm border border-border-default bg-surface-card p-8 text-center text-text-secondary">
          No recipients yet. Add the first one.
        </div>
      ) : (
        Array.from(grouped.entries()).map(([catName, catRecipients]) => (
          <div key={catName} className="space-y-2">
            {grouped.size > 1 && (
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                {catName}
              </h3>
            )}
            <div className="rounded-sm border border-border-default bg-surface-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catRecipients.map((r) => {
                    const link = recipientLink(r);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium text-sm">
                          {link ? (
                            <Link to={link} className="hover:underline underline-offset-4" target="_blank" rel="noreferrer">
                              {recipientName(r)}
                            </Link>
                          ) : (
                            recipientName(r)
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-text-secondary capitalize">
                          {r.recipientType}
                        </TableCell>
                        <TableCell>
                          <Badge variant={outcomeBadgeVariant[r.outcome] ?? "outline"}>
                            {outcomeLabel[r.outcome] ?? r.outcome}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-text-secondary max-w-xs truncate">
                          {r.notes ?? <span className="opacity-40">—</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-feedback-destructive"
                            onClick={() => setDeleteTarget(r)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        ))
      )}

      {/* Add recipient dialog */}
      {editionId && awardId && (
        <AddRecipientDialog
          editionId={editionId}
          awardId={awardId}
          categories={categories ?? []}
          open={showAddRecipient}
          onOpenChange={setShowAddRecipient}
        />
      )}

      {/* Delete recipient confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove recipient?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget ? recipientName(deleteTarget) : ""}&rdquo; will be removed from this edition.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-feedback-destructive hover:bg-feedback-destructive/90"
              onClick={handleDeleteRecipient}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete edition confirmation */}
      <AlertDialog open={showDeleteEdition} onOpenChange={setShowDeleteEdition}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this edition?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete edition {editionLabel} and all its recipients.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-feedback-destructive hover:bg-feedback-destructive/90"
              onClick={handleDeleteEdition}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
