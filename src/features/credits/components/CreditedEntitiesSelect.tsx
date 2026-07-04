import * as React from "react";
import { X, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { searchPeople, createPerson } from "@/features/credits/api/people";
import { searchCompanies, createCompany } from "@/features/credits/api/companies";
import type { CreditEntityKind } from "@/features/credits/components/CreditEntityPicker";

/** Person or company selected for primary design credits on a building form. */
export interface CreditedEntityTag {
  id: string;
  name: string;
  kind: CreditEntityKind;
}

interface CreditedEntitiesSelectProps {
  selected: CreditedEntityTag[];
  onChange: (next: CreditedEntityTag[]) => void;
  placeholder?: string;
  className?: string;
  /** If set, search/create only people or only companies. */
  kindFilter?: CreditEntityKind;
}

export function CreditedEntitiesSelect({
  selected,
  onChange,
  placeholder,
  className,
  kindFilter,
}: CreditedEntitiesSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [createKind, setCreateKind] = React.useState<CreditEntityKind>("person");
  const [isCreating, setIsCreating] = React.useState(false);

  const q = inputValue.trim();
  const enabled = q.length >= 2;

  const { data: merged = [], isLoading } = useQuery({
    queryKey: ["credited-entities-select", q, kindFilter],
    queryFn: async () => {
      const wantPerson = !kindFilter || kindFilter === "person";
      const wantCompany = !kindFilter || kindFilter === "company";
      const [peopleRes, companiesRes] = await Promise.all([
        wantPerson ? searchPeople(q) : Promise.resolve([]),
        wantCompany ? searchCompanies(q) : Promise.resolve([]),
      ]);
      const rows: CreditedEntityTag[] = [
        ...peopleRes.map((p) => ({ id: p.id, name: p.name, kind: "person" as const })),
        ...companiesRes.map((c) => ({ id: c.id, name: c.name, kind: "company" as const })),
      ];
      rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
      return rows;
    },
    enabled,
    placeholderData: (p) => p,
  });

  const handleSelect = (row: CreditedEntityTag) => {
    setInputValue("");
    if (!selected.some((s) => s.id === row.id)) {
      onChange([...selected, row]);
    }
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleUnselect = (id: string) => {
    onChange(selected.filter((s) => s.id !== id));
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current;
    if (input && (e.key === "Delete" || e.key === "Backspace")) {
      if (input.value === "" && selected.length > 0) {
        handleUnselect(selected[selected.length - 1].id);
      }
    }
    if (e.key === "Escape") input?.blur();
  };

  const initiateCreate = () => {
    setNewName(q);
    setCreateKind(kindFilter || "person");
    setShowCreateDialog(true);
    setOpen(false);
  };

  const handleCreateConfirm = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      if (createKind === "person") {
        const row = await createPerson({ name: newName.trim() });
        handleSelect({ id: row.id, name: row.name, kind: "person" });
        toast.success(`Created person “${row.name}”`);
      } else {
        const row = await createCompany({ name: newName.trim() });
        handleSelect({ id: row.id, name: row.name, kind: "company" });
        toast.success(`Created company “${row.name}”`);
      }
      setShowCreateDialog(false);
    } catch {
      toast.error("Could not create entity. The name may already exist.");
    } finally {
      setIsCreating(false);
    }
  };

  const filtered = merged.filter((s) => !selected.some((sel) => sel.id === s.id));
  const showCreateOption =
    q.length > 0 &&
    !merged.some((s) => s.name.toLowerCase() === q.toLowerCase()) &&
    !kindFilter;

  return (
    <>
      <Command
        onKeyDown={handleKeyDown}
        className={cn("overflow-visible bg-transparent", className)}
        shouldFilter={false}
      >
        <div className="group border border-border-default bg-surface-muted px-3 py-2 text-sm rounded-sm focus-within:ring-2 focus-within:ring-brand-primary focus-within:ring-offset-2">
          <div className="flex flex-wrap gap-1">
            {selected.map((row) => (
              <Badge key={row.id} variant="secondary">
                {row.name}
                <button
                  type="button"
                  className="ml-1 rounded-sm outline-hidden focus:ring-2 focus:ring-brand-primary focus:ring-offset-2"
                  onClick={() => handleUnselect(row.id)}
                >
                  <X className="h-3 w-3 text-text-secondary hover:text-text-primary" />
                </button>
              </Badge>
            ))}
            <CommandPrimitive.Input
              ref={inputRef}
              value={inputValue}
              onValueChange={setInputValue}
              onBlur={() => setTimeout(() => setOpen(false), 200)}
              onFocus={() => setOpen(true)}
              placeholder={placeholder}
              autoComplete="off"
              className="ml-2 flex-1 bg-transparent outline-hidden placeholder:text-text-disabled min-w-[50px]"
            />
          </div>
        </div>
        <div className="relative mt-2">
          {open && (enabled || inputValue.length > 0) && (
            <div className="absolute top-0 z-10 w-full rounded-sm border border-border-default bg-surface-overlay text-text-primary shadow-lg outline-hidden animate-in fade-in-0 zoom-in-95">
              <CommandList>
                {!enabled && q.length > 0 && q.length < 2 && (
                  <CommandItem disabled>Type at least 2 characters to search</CommandItem>
                )}
                {enabled && isLoading && (
                  <CommandItem disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </CommandItem>
                )}
                <CommandGroup className="h-full overflow-auto max-h-[200px]">
                  {enabled &&
                    filtered.map((row) => (
                      <CommandItem key={`${row.kind}-${row.id}`} value={row.name} onSelect={() => handleSelect(row)}>
                        <div className="flex items-center justify-between w-full gap-2">
                          <span>{row.name}</span>
                          <Badge variant="outline" className="text-[10px] h-5 px-1 shrink-0">
                            {row.kind === "person" ? "Person" : "Company"}
                          </Badge>
                        </div>
                      </CommandItem>
                    ))}
                  {showCreateOption && !isLoading && enabled && (
                    <CommandItem value={q} onSelect={initiateCreate} className="text-feedback-info font-medium">
                      + Create “{q}”
                    </CommandItem>
                  )}
                </CommandGroup>
              </CommandList>
            </div>
          )}
        </div>
      </Command>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add entity</DialogTitle>
            <DialogDescription>
              Is <strong>{newName}</strong> a person or a company?
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <RadioGroup
              value={createKind}
              onValueChange={(v: string) => setCreateKind(v as CreditEntityKind)}
            >
              <div
                className="flex items-center space-x-2 border border-border-default p-3 rounded-sm cursor-pointer hover:bg-surface-muted/50"
                onClick={() => setCreateKind("person")}
              >
                <RadioGroupItem value="person" id="ce-person" />
                <Label htmlFor="ce-person" className="cursor-pointer">
                  Person
                </Label>
              </div>
              <div
                className="flex items-center space-x-2 border border-border-default p-3 rounded-sm cursor-pointer hover:bg-surface-muted/50"
                onClick={() => setCreateKind("company")}
              >
                <RadioGroupItem value="company" id="ce-company" />
                <Label htmlFor="ce-company" className="cursor-pointer">
                  Company
                </Label>
              </div>
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreateConfirm()} disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
