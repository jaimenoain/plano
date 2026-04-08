import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Building2, ChevronsUpDown, Loader2, User } from "lucide-react";
import { createCompany, searchCompanies } from "@/features/credits/api/companies";
import { createPerson, searchPeople } from "@/features/credits/api/people";
import type { CompanySummary, PersonSummary } from "@/features/credits/types";
import { trigramSimilarity } from "@/lib/trigram-similarity";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const MIN_QUERY_LEN = 2;
const SIMILARITY_THRESHOLD = 0.4;

export type CreditEntityKind = "person" | "company";

export type CreditEntitySelection =
  | { kind: "person"; id: string; name: string; slug: string }
  | { kind: "company"; id: string; name: string; slug: string };

export interface SimilarEntityCandidate {
  kind: CreditEntityKind;
  id: string;
  name: string;
  slug: string;
  score: number;
}

export interface CreditEntityPickerProps {
  value: CreditEntitySelection | null;
  onChange: (next: CreditEntitySelection | null) => void;
  /** Defaults to both person and company. */
  allowedKinds?: CreditEntityKind[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  "aria-labelledby"?: string;
}

type MergedHit =
  | { kind: "person"; data: PersonSummary }
  | { kind: "company"; data: CompanySummary };

function normalizeName(s: string): string {
  return s.trim().toLowerCase();
}

function mergeHits(people: PersonSummary[], companies: CompanySummary[]): MergedHit[] {
  const merged: MergedHit[] = [
    ...people.map((data) => ({ kind: "person" as const, data })),
    ...companies.map((data) => ({ kind: "company" as const, data })),
  ];
  merged.sort((a, b) => a.data.name.localeCompare(b.data.name, undefined, { sensitivity: "base" }));
  return merged;
}

function personSubtitle(p: PersonSummary): string {
  const parts: string[] = [];
  if (p.associatedCompanies.length > 0) {
    parts.push(p.associatedCompanies.slice(0, 3).join(", ") + (p.associatedCompanies.length > 3 ? "…" : ""));
  }
  if (p.knownBuilding) parts.push(p.knownBuilding);
  return parts.join(" · ") || "Person";
}

function companySubtitle(c: CompanySummary): string {
  const parts: string[] = [];
  if (c.country) parts.push(c.country);
  parts.push(`${c.creditCount} credit${c.creditCount === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

export function findSimilarEntityCandidates(
  typedName: string,
  people: PersonSummary[],
  companies: CompanySummary[],
  threshold = SIMILARITY_THRESHOLD,
): SimilarEntityCandidate[] {
  const t = typedName.trim();
  if (!t) return [];
  const out: SimilarEntityCandidate[] = [];
  for (const p of people) {
    const score = trigramSimilarity(t, p.name);
    if (score > threshold) {
      out.push({ kind: "person", id: p.id, name: p.name, slug: p.slug, score });
    }
  }
  for (const c of companies) {
    const score = trigramSimilarity(t, c.name);
    if (score > threshold) {
      out.push({ kind: "company", id: c.id, name: c.name, slug: c.slug, score });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}

async function searchCreditEntities(
  query: string,
  kinds: readonly CreditEntityKind[],
): Promise<{ people: PersonSummary[]; companies: CompanySummary[] }> {
  const wantPerson = kinds.includes("person");
  const wantCompany = kinds.includes("company");
  const [people, companies] = await Promise.all([
    wantPerson ? searchPeople(query) : Promise.resolve([] as PersonSummary[]),
    wantCompany ? searchCompanies(query) : Promise.resolve([] as CompanySummary[]),
  ]);
  return { people, companies };
}

export function CreditEntityPicker({
  value,
  onChange,
  allowedKinds = ["person", "company"],
  disabled = false,
  placeholder = "Search person or company…",
  className,
  id,
  "aria-labelledby": ariaLabelledBy,
}: CreditEntityPickerProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [createKind, setCreateKind] = useState<CreditEntityKind | null>(null);
  const [createNameDraft, setCreateNameDraft] = useState("");
  const [similarityOverride, setSimilarityOverride] = useState(false);
  const [pendingSimilarity, setPendingSimilarity] = useState<SimilarEntityCandidate[] | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setSimilarityOverride(false);
    setPendingSimilarity(null);
  }, [createNameDraft]);

  const kindsKey = useMemo(() => [...allowedKinds].sort().join(","), [allowedKinds]);

  const searchEnabled = open && debouncedQuery.length >= MIN_QUERY_LEN;

  const {
    data: searchData,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["credit-entity-search", debouncedQuery, kindsKey] as const,
    queryFn: () => searchCreditEntities(debouncedQuery, allowedKinds),
    enabled: searchEnabled,
    staleTime: 20_000,
  });

  const people = searchData?.people ?? [];
  const companies = searchData?.companies ?? [];
  const merged = useMemo(() => mergeHits(people, companies), [people, companies]);

  const qNorm = normalizeName(query);
  const exactPersonHit = useMemo(
    () => people.some((p) => normalizeName(p.name) === qNorm),
    [people, qNorm],
  );
  const exactCompanyHit = useMemo(
    () => companies.some((c) => normalizeName(c.name) === qNorm),
    [companies, qNorm],
  );

  const showCreatePerson =
    allowedKinds.includes("person") && query.trim().length >= MIN_QUERY_LEN && !exactPersonHit;
  const showCreateCompany =
    allowedKinds.includes("company") && query.trim().length >= MIN_QUERY_LEN && !exactCompanyHit;

  const resetCreateUi = useCallback(() => {
    setCreateKind(null);
    setCreateNameDraft("");
    setSimilarityOverride(false);
    setPendingSimilarity(null);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) {
        setQuery("");
        setDebouncedQuery("");
        resetCreateUi();
      }
    },
    [resetCreateUi],
  );

  const selectHit = useCallback(
    (hit: MergedHit) => {
      if (hit.kind === "person") {
        onChange({ kind: "person", id: hit.data.id, name: hit.data.name, slug: hit.data.slug });
      } else {
        onChange({ kind: "company", id: hit.data.id, name: hit.data.name, slug: hit.data.slug });
      }
      handleOpenChange(false);
    },
    [onChange, handleOpenChange],
  );

  const createPersonMutation = useMutation({
    mutationFn: (name: string) => createPerson({ name }),
    onSuccess: (person) => {
      onChange({ kind: "person", id: person.id, name: person.name, slug: person.slug });
      toast({ title: "Person created", description: `${person.name} was added.` });
      handleOpenChange(false);
    },
    onError: (e: Error) => {
      toast({ title: "Could not create person", description: e.message, variant: "destructive" });
    },
  });

  const createCompanyMutation = useMutation({
    mutationFn: (name: string) => createCompany({ name }),
    onSuccess: (company) => {
      onChange({ kind: "company", id: company.id, name: company.name, slug: company.slug });
      toast({ title: "Company created", description: `${company.name} was added.` });
      handleOpenChange(false);
    },
    onError: (e: Error) => {
      toast({ title: "Could not create company", description: e.message, variant: "destructive" });
    },
  });

  const runCreate = useCallback(async () => {
    const name = createNameDraft.trim();
    if (!name || !createKind) return;

    if (!similarityOverride) {
      const fresh = await searchCreditEntities(name, allowedKinds);
      const candidates = findSimilarEntityCandidates(name, fresh.people, fresh.companies);
      if (candidates.length > 0) {
        setPendingSimilarity(candidates);
        return;
      }
    }

    setPendingSimilarity(null);
    if (createKind === "person") {
      createPersonMutation.mutate(name);
    } else {
      createCompanyMutation.mutate(name);
    }
  }, [
    createKind,
    createNameDraft,
    similarityOverride,
    allowedKinds,
    createPersonMutation,
    createCompanyMutation,
  ]);

  const dismissSimilarityAndContinue = useCallback(() => {
    setSimilarityOverride(true);
    setPendingSimilarity(null);
  }, []);

  const pickSimilarCandidate = useCallback(
    (c: SimilarEntityCandidate) => {
      onChange({ kind: c.kind, id: c.id, name: c.name, slug: c.slug });
      handleOpenChange(false);
    },
    [onChange, handleOpenChange],
  );

  const startCreate = useCallback((kind: CreditEntityKind) => {
    setCreateKind(kind);
    setCreateNameDraft(query.trim());
    setSimilarityOverride(false);
    setPendingSimilarity(null);
  }, [query]);

  const creating = createPersonMutation.isPending || createCompanyMutation.isPending;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          id={id}
          aria-labelledby={ariaLabelledBy}
          className={cn(
            "w-full justify-between border-border-default bg-surface-muted/20 text-text-secondary hover:text-text-primary",
            className,
          )}
        >
          <span className={cn("truncate", !value && "text-text-disabled")}>
            {value ? (
              <span className="flex items-center gap-2 text-text-primary">
                {value.kind === "person" ? (
                  <User className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                ) : (
                  <Building2 className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                )}
                {value.name}
              </span>
            ) : (
              placeholder
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-search-serp p-0 border-border-default bg-surface-overlay shadow-lg rounded-sm"
        align="start"
      >
        <Command shouldFilter={false} className="rounded-sm">
          <CommandInput
            placeholder="Type at least 2 characters…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {isError && (
              <div className="px-3 py-2 text-sm text-text-secondary space-y-2">
                <p>Search failed.</p>
                <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
                  Retry
                </Button>
              </div>
            )}
            {!isError && searchEnabled && isFetching && merged.length === 0 && (
              <CommandItem disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" aria-hidden />
                Searching…
              </CommandItem>
            )}
            {!isError && searchEnabled && !isFetching && merged.length === 0 && (
              <CommandEmpty>No matches.</CommandEmpty>
            )}
            {!isError && open && query.trim().length > 0 && query.trim().length < MIN_QUERY_LEN && (
              <div className="px-3 py-2 text-sm text-text-secondary">Enter at least {MIN_QUERY_LEN} characters.</div>
            )}

            {createKind && (
              <CommandGroup heading="Create new">
                <div className="px-2 pb-2 space-y-2">
                  <Input
                    value={createNameDraft}
                    onChange={(e) => setCreateNameDraft(e.target.value)}
                    placeholder="Name"
                    aria-label="New entity name"
                    className="border-border-default"
                  />
                  {pendingSimilarity && pendingSimilarity.length > 0 && (
                    <div className="rounded-sm border border-border-default bg-surface-muted/20 p-2 space-y-2">
                      <p className="text-sm text-text-primary">Did you mean an existing record?</p>
                      <ul className="flex flex-col gap-1">
                        {pendingSimilarity.map((c) => (
                          <li key={`${c.kind}-${c.id}`}>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => pickSimilarCandidate(c)}
                            >
                              {c.name}
                              <span className="ml-2 text-text-secondary text-2xs">
                                ({c.kind === "person" ? "Person" : "Company"})
                              </span>
                            </Button>
                          </li>
                        ))}
                      </ul>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full text-text-secondary"
                        onClick={dismissSimilarityAndContinue}
                      >
                        No — create &quot;{createNameDraft.trim() || "…"}&quot; anyway
                      </Button>
                    </div>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
                    disabled={!createNameDraft.trim() || creating || (!!pendingSimilarity && pendingSimilarity.length > 0)}
                    onClick={() => void runCreate()}
                  >
                    {creating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                        Creating…
                      </>
                    ) : (
                      `Create ${createKind === "person" ? "person" : "company"}`
                    )}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="w-full" onClick={resetCreateUi}>
                    Cancel
                  </Button>
                </div>
              </CommandGroup>
            )}

            {merged.length > 0 && (
              <CommandGroup heading="Results">
                {merged.map((hit) => {
                  const key = hit.kind === "person" ? `person-${hit.data.id}` : `company-${hit.data.id}`;
                  const subtitle = hit.kind === "person" ? personSubtitle(hit.data) : companySubtitle(hit.data);
                  return (
                    <CommandItem key={key} value={key} onSelect={() => selectHit(hit)}>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          {hit.kind === "person" ? (
                            <User className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
                          ) : (
                            <Building2 className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
                          )}
                          <span className="font-medium truncate">{hit.data.name}</span>
                          <span className="text-2xs text-text-secondary shrink-0 uppercase tracking-wide">
                            {hit.kind === "person" ? "Person" : "Company"}
                          </span>
                        </div>
                        <span className="text-2xs text-text-secondary pl-6 line-clamp-2">{subtitle}</span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {!createKind && (showCreatePerson || showCreateCompany) && (
              <CommandGroup heading="Add new">
                {showCreatePerson && (
                  <CommandItem value="action-create-person" onSelect={() => startCreate("person")}>
                    <User className="mr-2 h-4 w-4 text-text-secondary" aria-hidden />
                    Create new person
                  </CommandItem>
                )}
                {showCreateCompany && (
                  <CommandItem value="action-create-company" onSelect={() => startCreate("company")}>
                    <Building2 className="mr-2 h-4 w-4 text-text-secondary" aria-hidden />
                    Create new company
                  </CommandItem>
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
