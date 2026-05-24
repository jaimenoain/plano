import { useState } from "react";
import { Link, type MetaFunction } from "react-router";
import { Loader2, Plus, Globe, MapPin, Flag, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAllUpdates, useDeleteUpdate } from "@/features/updates/hooks/useUpdates";
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
import type { PlanoUpdate } from "@/features/updates/types";

export const meta: MetaFunction = () => [{ title: "Plano Updates | Admin" }];

const GEO_ICONS = {
  global: Globe,
  national: Flag,
  local: MapPin,
} as const;

function GeoScopeBadge({ update }: { update: PlanoUpdate }) {
  const Icon = GEO_ICONS[update.geoScope];
  const label =
    update.geoScope === "local"
      ? (update.localityCity ?? update.countryCode ?? "Local")
      : update.geoScope === "national"
        ? (update.countryCode ?? "National")
        : "Global";
  return (
    <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

export default function UpdatesList() {
  const { data: updates = [], isLoading } = useAllUpdates();
  const deleteUpdate = useDeleteUpdate();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleDelete = () => {
    if (!confirmId) return;
    deleteUpdate.mutate(confirmId, {
      onSuccess: () => toast.success("Update deleted"),
      onError: () => toast.error("Failed to delete"),
    });
    setConfirmId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight leading-none text-text-primary">Plano Updates</h1>
        <Button asChild>
          <Link to="/admin/updates/new">
            <Plus className="mr-2 h-4 w-4" />
            New post
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
        </div>
      ) : updates.length === 0 ? (
        <p className="text-text-secondary py-12 text-center">No updates yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {updates.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium max-w-xs truncate">{u.title}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {u.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {u.tags.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{u.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <GeoScopeBadge update={u} />
                </TableCell>
                <TableCell>
                  {u.publishedAt ? (
                    <Badge variant="default" className="text-xs bg-feedback-success text-white">
                      Published
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Draft
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/admin/updates/${u.id}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmId(u.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-feedback-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <AlertDialog open={!!confirmId} onOpenChange={(open) => !open && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this update?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The post will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-feedback-destructive hover:bg-feedback-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
