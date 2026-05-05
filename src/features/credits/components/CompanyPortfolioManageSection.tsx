import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2, Pencil, Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CompanyCreditCard } from "@/features/credits/components/CompanyCreditCard";
import { formatCreditRoleLabel } from "@/features/credits/formatCreditRole";
import {
  addBuildingCredit,
  CREDIT_ROLES,
  CREDIT_TIERS,
  updateBuildingCredit,
} from "@/features/credits/api/credits";
import type { CompanyPortfolioItem, CreditRole, CreditTier } from "@/features/credits/types";
import { useDebounce } from "@/hooks/useDebounce";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function tierLabel(tier: CreditTier): string {
  if (tier === "primary") return "Primary";
  if (tier === "contributor") return "Contributor";
  return "Additional";
}

function SortablePortfolioRow({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled: boolean;
  children: (dragHandleProps: Record<string, unknown> | undefined) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
  };
  const handleProps = disabled ? undefined : { ...attributes, ...listeners };
  return (
    <div ref={setNodeRef} style={style} className="relative border-b border-border-default last:border-b-0">
      {children(handleProps)}
    </div>
  );
}

type BuildingPick = { id: string; name: string; city?: string | null; country?: string | null };

function parseOptionalYear(raw: string): { value: number | null; error: string | null } {
  const t = raw.trim();
  if (!t) return { value: null, error: null };
  const n = Number(t);
  if (!Number.isInteger(n) || n < 1000 || n > 2100) {
    return { value: null, error: "Year must be between 1000 and 2100" };
  }
  return { value: n, error: null };
}

export function CompanyPortfolioManageSection({
  companyId,
  items,
  queryKeyPrefix,
}: {
  companyId: string;
  items: CompanyPortfolioItem[];
  queryKeyPrefix: readonly unknown[];
}) {
  const queryClient = useQueryClient();
  const [reorderMode, setReorderMode] = useState(false);
  const [editItem, setEditItem] = useState<CompanyPortfolioItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: [...queryKeyPrefix] });
  }, [queryClient, queryKeyPrefix]);

  const reorderMut = useMutation({
    mutationFn: async (ordered: CompanyPortfolioItem[]) => {
      await Promise.all(
        ordered.map((row, index) =>
          updateBuildingCredit(row.credit.id, { companyPortfolioRank: index }),
        ),
      );
    },
    onSuccess: async () => {
      toast.success("Portfolio order saved");
      await invalidate();
      setReorderMode(false);
    },
    onError: () => {
      toast.error("Could not save order");
    },
  });

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const ids = items.map((i) => i.credit.id);
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      const next = arrayMove(items, oldIndex, newIndex);
      reorderMut.mutate(next);
    },
    [items, reorderMut],
  );

  const ids = useMemo(() => items.map((i) => i.credit.id), [items]);

  return (
    <section className="space-y-6">
      <div className="border border-border-default bg-surface-card px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm leading-relaxed text-text-secondary">
            Drag to set the order visitors see here. Edit roles, tiers, and project details anytime.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={reorderMode ? "default" : "outline"}
              size="sm"
              className="rounded-none"
              disabled={items.length < 2 || reorderMut.isPending}
              onClick={() => {
                if (reorderMode) setReorderMode(false);
                else setReorderMode(true);
              }}
            >
              {reorderMode ? "Done reordering" : "Reorder list"}
            </Button>
            <Button type="button" size="sm" variant="secondary" className="rounded-none" onClick={() => setAddOpen(true)}>
              <Plus className="mr-1 h-4 w-4" aria-hidden />
              Add credit
            </Button>
            <Button type="button" size="sm" variant="outline" className="rounded-none" asChild>
              <Link to="/add-building">Add new building</Link>
            </Button>
          </div>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <Card className="overflow-hidden border border-border-default">
            <CardContent className="p-0">
              {items.length === 0 ? (
                <div className="flex flex-col items-center px-6 py-14 text-center">
                  <p className="text-sm font-medium text-text-primary">No credits yet</p>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
                    Add a credit from the catalogue or list a new building, then attach your studio&apos;s role here.
                  </p>
                </div>
              ) : (
                items.map((row) => (
                  <SortablePortfolioRow key={row.credit.id} id={row.credit.id} disabled={!reorderMode || reorderMut.isPending}>
                    {(dragProps) => (
                      <div className="flex gap-2 sm:gap-3">
                        {reorderMode ? (
                          <button
                            type="button"
                            className="mt-6 flex h-11 w-10 shrink-0 items-center justify-center rounded-none border border-border-default bg-surface-muted text-text-secondary hover:bg-surface-muted/80"
                            aria-label="Drag to reorder"
                            {...(dragProps ?? {})}
                          >
                            <GripVertical className="h-5 w-5" />
                          </button>
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <CompanyCreditCard credit={{ ...row.credit, building: row.building }} />
                        </div>
                        {!reorderMode ? (
                          <div className="flex w-28 shrink-0 flex-col justify-center gap-2 border-l border-border-default bg-surface-muted/30 py-4 pl-4 pr-3 sm:w-32">
                            <span className="text-2xs font-medium uppercase tracking-widest text-text-secondary">
                              {tierLabel(row.credit.creditTier)}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-9 gap-1 rounded-none px-2"
                              onClick={() => setEditItem(row)}
                            >
                              <Pencil className="h-4 w-4" aria-hidden />
                              Edit
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </SortablePortfolioRow>
                ))
              )}
            </CardContent>
          </Card>
        </SortableContext>
      </DndContext>

      {editItem ? (
        <EditCompanyCreditDialog
          key={editItem.credit.id}
          item={editItem}
          open
          onOpenChange={(o) => {
            if (!o) setEditItem(null);
          }}
          onSaved={async () => {
            await invalidate();
            setEditItem(null);
          }}
        />
      ) : null}

      <AddCompanyCreditDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        companyId={companyId}
        onAdded={async () => {
          await invalidate();
          setAddOpen(false);
        }}
      />
    </section>
  );
}

function EditCompanyCreditDialog({
  item,
  open,
  onOpenChange,
  onSaved,
}: {
  item: CompanyPortfolioItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const c = item.credit;
  const [role, setRole] = useState<CreditRole>(c.role);
  const [roleOther, setRoleOther] = useState(c.roleCustom ?? "");
  const [creditTier, setCreditTier] = useState<CreditTier>(c.creditTier);
  const [isLead, setIsLead] = useState(c.isLead);
  const [notes, setNotes] = useState(c.contributionNotes ?? "");
  const [yearFrom, setYearFrom] = useState(c.yearFrom != null ? String(c.yearFrom) : "");
  const [yearTo, setYearTo] = useState(c.yearTo != null ? String(c.yearTo) : "");
  const [projectUrl, setProjectUrl] = useState(c.projectUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const save = async () => {
    setError(null);
    if (role === "other" && !roleOther.trim()) {
      setError("Describe the role when selecting Other");
      return;
    }
    const yf = parseOptionalYear(yearFrom);
    const yt = parseOptionalYear(yearTo);
    if (yf.error) {
      setError(yf.error);
      return;
    }
    if (yt.error) {
      setError(yt.error);
      return;
    }
    if (yf.value != null && yt.value != null && yf.value > yt.value) {
      setError("Year to must be ≥ year from");
      return;
    }
    setPending(true);
    try {
      await updateBuildingCredit(c.id, {
        role,
        roleCustom: role === "other" ? roleOther.trim() : null,
        creditTier,
        isLead,
        contributionNotes: notes.trim() || null,
        yearFrom: yf.value,
        yearTo: yt.value,
        projectUrl: projectUrl.trim() || null,
      });
      toast.success("Credit updated");
      await onSaved();
    } catch {
      toast.error("Could not save changes");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit credit</DialogTitle>
          <DialogDescription>
            {item.building.name} — changes apply on the building page and in search.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="cp-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as CreditRole)}>
              <SelectTrigger id="cp-role" className="border-border-default">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CREDIT_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {formatCreditRoleLabel(r, null)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {role === "other" ? (
            <div className="space-y-2">
              <Label htmlFor="cp-role-other">Custom role</Label>
              <Input
                id="cp-role-other"
                value={roleOther}
                onChange={(e) => setRoleOther(e.target.value)}
                className="border-border-default"
                maxLength={500}
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="cp-tier">Credit tier</Label>
            <Select value={creditTier} onValueChange={(v) => setCreditTier(v as CreditTier)}>
              <SelectTrigger id="cp-tier" className="border-border-default">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CREDIT_TIERS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {tierLabel(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="cp-lead" checked={isLead} onCheckedChange={(v) => setIsLead(v === true)} />
            <Label htmlFor="cp-lead" className="text-sm font-normal">
              Lead for this role on the building
            </Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cp-notes">Contribution notes</Label>
            <Textarea
              id="cp-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[88px] border-border-default"
              maxLength={500}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cp-yf">Year from</Label>
              <Input
                id="cp-yf"
                value={yearFrom}
                onChange={(e) => setYearFrom(e.target.value)}
                className="border-border-default"
                inputMode="numeric"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp-yt">Year to</Label>
              <Input
                id="cp-yt"
                value={yearTo}
                onChange={(e) => setYearTo(e.target.value)}
                className="border-border-default"
                inputMode="numeric"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cp-url">Project URL</Label>
            <Input
              id="cp-url"
              value={projectUrl}
              onChange={(e) => setProjectUrl(e.target.value)}
              className="border-border-default"
              maxLength={2000}
            />
          </div>
          {error ? <p className="text-sm text-feedback-error">{error}</p> : null}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void save()} disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddCompanyCreditDialog({
  open,
  onOpenChange,
  companyId,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onAdded: () => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);
  const [picked, setPicked] = useState<BuildingPick | null>(null);
  const [role, setRole] = useState<CreditRole>("design_architectureure");
  const [roleOther, setRoleOther] = useState("");
  const [creditTier, setCreditTier] = useState<CreditTier>("contributor");
  const [isLead, setIsLead] = useState(false);
  const [notes, setNotes] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const { data: buildings = [], isFetching } = useQuery({
    queryKey: ["company-portfolio-building-search", debounced],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_buildings", { query_text: debounced });
      if (error) throw error;
      return ((data as BuildingPick[]) ?? []).slice(0, 12);
    },
    enabled: open && debounced.length >= 2,
    staleTime: 60_000,
  });

  const resetForm = () => {
    setSearch("");
    setPicked(null);
    setRole("design_architectureure");
    setRoleOther("");
    setCreditTier("contributor");
    setIsLead(false);
    setNotes("");
    setYearFrom("");
    setYearTo("");
    setProjectUrl("");
    setError(null);
  };

  const submit = async () => {
    setError(null);
    if (!picked) {
      setError("Choose a building from the catalogue");
      return;
    }
    if (role === "other" && !roleOther.trim()) {
      setError("Describe the role when selecting Other");
      return;
    }
    const yf = parseOptionalYear(yearFrom);
    const yt = parseOptionalYear(yearTo);
    if (yf.error) {
      setError(yf.error);
      return;
    }
    if (yt.error) {
      setError(yt.error);
      return;
    }
    if (yf.value != null && yt.value != null && yf.value > yt.value) {
      setError("Year to must be ≥ year from");
      return;
    }
    setPending(true);
    try {
      await addBuildingCredit({
        buildingId: picked.id,
        companyId,
        personId: null,
        role,
        roleCustom: role === "other" ? roleOther.trim() : null,
        creditTier,
        isLead,
        contributionNotes: notes.trim() || null,
        yearFrom: yf.value,
        yearTo: yt.value,
        projectUrl: projectUrl.trim() || null,
      });
      toast.success("Credit added");
      resetForm();
      await onAdded();
    } catch {
      toast.error("Could not add credit. If this studio is already listed for that building, edit the existing row.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) resetForm();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add credit for your studio</DialogTitle>
          <DialogDescription>
            Search the catalogue for an existing building. To list something new, use{" "}
            <Link to="/add-building" className="font-medium text-brand-primary underline-offset-4 hover:underline">
              Add new building
            </Link>{" "}
            first, then return here.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!picked ? (
            <div className="space-y-2">
              <Label>Building</Label>
              <Command shouldFilter={false} className="overflow-hidden rounded-md border border-border-default">
                <CommandInput
                  placeholder="Search by building name…"
                  value={search}
                  onValueChange={setSearch}
                  className="border-0"
                />
                <CommandList className="max-h-56">
                  {isFetching ? (
                    <div className="flex items-center gap-2 p-3 text-sm text-text-secondary">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Searching…
                    </div>
                  ) : null}
                  {!isFetching && search.trim().length >= 2 && buildings.length === 0 ? (
                    <div className="p-3 text-sm text-text-secondary">No matches. Try another name or add the building first.</div>
                  ) : null}
                  {search.trim().length > 0 && search.trim().length < 2 ? (
                    <div className="p-3 text-sm text-text-secondary">Type at least 2 characters.</div>
                  ) : null}
                  {buildings.length > 0 ? (
                    <CommandGroup heading="Results">
                      {buildings.map((b) => (
                        <CommandItem
                          key={b.id}
                          value={b.id}
                          onSelect={() => setPicked(b)}
                          className="cursor-pointer"
                        >
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate font-medium">{b.name}</span>
                            <span className="truncate text-2xs text-text-secondary">
                              {[b.city, b.country].filter(Boolean).join(", ")}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : null}
                </CommandList>
              </Command>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3 rounded-md border border-border-default bg-surface-muted p-3">
              <div className="min-w-0">
                <p className="font-medium text-text-primary">{picked.name}</p>
                <p className="text-2xs text-text-secondary">{[picked.city, picked.country].filter(Boolean).join(", ")}</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setPicked(null)}>
                Change
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="add-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as CreditRole)}>
              <SelectTrigger id="add-role" className="border-border-default">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CREDIT_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {formatCreditRoleLabel(r, null)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {role === "other" ? (
            <div className="space-y-2">
              <Label htmlFor="add-role-other">Custom role</Label>
              <Input
                id="add-role-other"
                value={roleOther}
                onChange={(e) => setRoleOther(e.target.value)}
                className="border-border-default"
                maxLength={500}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="add-tier">Credit tier</Label>
            <Select value={creditTier} onValueChange={(v) => setCreditTier(v as CreditTier)}>
              <SelectTrigger id="add-tier" className="border-border-default">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CREDIT_TIERS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {tierLabel(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="add-lead" checked={isLead} onCheckedChange={(v) => setIsLead(v === true)} />
            <Label htmlFor="add-lead" className="text-sm font-normal">
              Lead for this role on the building
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-notes">Contribution notes</Label>
            <Textarea
              id="add-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px] border-border-default"
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="add-yf">Year from</Label>
              <Input id="add-yf" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} className="border-border-default" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-yt">Year to</Label>
              <Input id="add-yt" value={yearTo} onChange={(e) => setYearTo(e.target.value)} className="border-border-default" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-url">Project URL</Label>
            <Input id="add-url" value={projectUrl} onChange={(e) => setProjectUrl(e.target.value)} className="border-border-default" maxLength={2000} />
          </div>

          {error ? <p className="text-sm text-feedback-error">{error}</p> : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={pending || !picked}>
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Adding…
              </>
            ) : (
              "Add credit"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
