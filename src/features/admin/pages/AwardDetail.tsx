import { useState } from "react";
import { Link, useParams, useNavigate, type MetaFunction } from "react-router";
import { Loader2, Pencil, Plus, Trash2, ListChecks } from "lucide-react";
import { toast } from "sonner";
import {
  useAward,
  useEditionsByAward,
  useDeleteAward,
} from "@/features/awards/hooks/useAwards";
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
import { ManageCategoriesDialog } from "@/features/admin/components/ManageCategoriesDialog";

export const meta: MetaFunction = () => [{ title: "Award Detail | Plano Admin" }];

const frequencyLabel: Record<string, string> = {
  annual: "Annual",
  biennial: "Biennial",
  ad_hoc: "Ad-hoc",
  other: "Other",
};

export default function AwardDetail() {
  const { awardId } = useParams<{ awardId: string }>();
  const navigate = useNavigate();
  const { data: award, isLoading } = useAward(awardId ?? "");
  const { data: editions, isLoading: loadingEditions } = useEditionsByAward(awardId ?? "");
  const deleteAward = useDeleteAward();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  const handleDelete = () => {
    if (!awardId) return;
    deleteAward.mutate(awardId, {
      onSuccess: () => {
        toast.success("Award deleted");
        navigate("/admin/awards");
      },
      onError: () => toast.error("Failed to delete award"),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
      </div>
    );
  }

  if (!award) {
    return (
      <div className="p-8 text-text-secondary">
        Award not found. <Link to="/admin/awards" className="underline">Back to list</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight leading-none text-text-primary">{award.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
            <Badge variant="outline">{frequencyLabel[award.frequency] ?? award.frequency}</Badge>
            {award.country && <span>{award.country}</span>}
            {award.awardingBodyCompany && (
              <span>by {award.awardingBodyCompany.name}</span>
            )}
            {!award.awardingBodyCompany && award.awardingBodyName && (
              <span>by {award.awardingBodyName}</span>
            )}
            {!award.isActive && <Badge variant="secondary">Inactive</Badge>}
          </div>
          {award.description && (
            <p className="mt-3 max-w-2xl text-sm text-text-secondary leading-relaxed">
              {award.description}
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setShowCategories(true)}>
            <ListChecks className="mr-2 h-4 w-4" />
            Categories
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/admin/awards/${awardId}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-feedback-destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Editions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Editions</h2>
          <Button size="sm" asChild>
            <Link to={`/admin/awards/${awardId}/editions/new`}>
              <Plus className="mr-2 h-4 w-4" />
              New Edition
            </Link>
          </Button>
        </div>

        <div className="rounded-sm border border-border-default bg-surface-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year / Date</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-center">Recipients</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingEditions ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-text-secondary">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : (editions ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-text-secondary">
                    No editions yet. Add the first one.
                  </TableCell>
                </TableRow>
              ) : (
                (editions ?? []).map((edition) => (
                  <TableRow key={edition.id}>
                    <TableCell className="font-medium text-sm">
                      {edition.editionLabel ?? edition.year ?? edition.editionDate ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {edition.ceremonyLocation ?? <span className="opacity-40">—</span>}
                    </TableCell>
                    <TableCell className="text-center text-sm text-text-secondary">
                      {edition.recipientCount ?? 0}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" asChild>
                        <Link to={`/admin/awards/${awardId}/editions/${edition.id}`}>
                          View →
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{award.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the award and all associated editions, categories, and recipients.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-feedback-destructive hover:bg-feedback-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage categories dialog */}
      {awardId && (
        <ManageCategoriesDialog
          awardId={awardId}
          open={showCategories}
          onOpenChange={setShowCategories}
        />
      )}
    </div>
  );
}
