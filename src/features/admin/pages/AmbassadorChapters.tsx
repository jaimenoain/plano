import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, type MetaFunction } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Shield, ClipboardList, AlertTriangle, Users, Crown, Target } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import {
  ambassadorChapterCreateSchema,
  type AmbassadorChapterCreateInput,
} from "@/lib/validations/ambassador";

export const meta: MetaFunction = () => [
  { title: "Ambassador chapters | Plano Admin" },
  { name: "robots", content: "noindex, nofollow" },
];

type ChapterRow = Database["public"]["Tables"]["ambassador_chapters"]["Row"];

type LocalityPick = Pick<
  Database["public"]["Tables"]["localities"]["Row"],
  "id" | "city" | "country" | "country_code"
>;

export default function AmbassadorChapters() {
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localityQuery, setLocalityQuery] = useState("");
  const [localityHits, setLocalityHits] = useState<LocalityPick[]>([]);
  const [localityLoading, setLocalityLoading] = useState(false);
  const [nationalOptions, setNationalOptions] = useState<ChapterRow[]>([]);
  const [countries, setCountries] = useState<{ name: string; code: string }[]>([]);

  const [form, setForm] = useState<AmbassadorChapterCreateInput>({
    name: "",
    type: "national",
    country_code: "ES",
    locality_id: null,
    parent_chapter_id: null,
    max_ambassadors: 20,
    status: "forming",
  });

  const loadChapters = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from("ambassador_chapters")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = rows ?? [];
      setChapters(list);
      if (list.length === 0) {
        setCounts({});
        return;
      }
      const ids = list.map((c) => c.id);
      const { data: mems, error: mErr } = await supabase
        .from("ambassador_memberships")
        .select("chapter_id")
        .in("chapter_id", ids);
      if (mErr) throw mErr;
      const next: Record<string, number> = {};
      for (const id of ids) next[id] = 0;
      for (const m of mems ?? []) {
        next[m.chapter_id] = (next[m.chapter_id] ?? 0) + 1;
      }
      setCounts(next);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const message = err?.message || (typeof err === "string" ? err : "Failed to load chapters");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadChapters();
  }, [loadChapters]);

  useEffect(() => {
    const loadCountries = async () => {
      const { data, error } = await supabase
        .from("localities")
        .select("country, country_code")
        .order("country");
      if (error) return;

      const unique: { name: string; code: string }[] = [];
      const seen = new Set<string>();
      for (const row of data) {
        if (!seen.has(row.country_code)) {
          seen.add(row.country_code);
          unique.push({ name: row.country, code: row.country_code });
        }
      }
      setCountries(unique);
    };
    void loadCountries();
  }, []);

  const loadNationalForCountry = useCallback(async (cc: string) => {
    const { data, error } = await supabase
      .from("ambassador_chapters")
      .select("*")
      .eq("type", "national")
      .eq("country_code", cc.toUpperCase())
      .order("name");
    if (error) {
      setNationalOptions([]);
      return;
    }
    setNationalOptions(data ?? []);
  }, []);

  useEffect(() => {
    if (form.type === "local" && form.country_code.length === 2) {
      void loadNationalForCountry(form.country_code);
    } else {
      setNationalOptions([]);
    }
  }, [form.type, form.country_code, loadNationalForCountry]);

  useEffect(() => {
    const q = localityQuery.trim();
    if (q.length < 2) {
      setLocalityHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      void (async () => {
        setLocalityLoading(true);
        const safe = q.replace(/%/g, "").slice(0, 64);
        const { data, error } = await supabase
          .from("localities")
          .select("id, city, country, country_code")
          .or(`city.ilike.%${safe}%,country.ilike.%${safe}%`)
          .limit(20);
        setLocalityLoading(false);
        if (error) {
          setLocalityHits([]);
          return;
        }
        setLocalityHits(data ?? []);
      })();
    }, 300);
    return () => window.clearTimeout(t);
  }, [localityQuery]);

  const resetForm = () => {
    setForm({
      name: "",
      type: "national",
      country_code: countries[0]?.code ?? "ES",
      locality_id: null,
      parent_chapter_id: null,
      max_ambassadors: 20,
      status: "forming",
    });
    setLocalityQuery("");
    setLocalityHits([]);
  };

  // Sync name based on type and selection
  useEffect(() => {
    if (form.type === "national") {
      const country = countries.find((c) => c.code === form.country_code);
      if (country && form.name !== country.name) {
        setForm((f) => ({ ...f, name: country.name }));
      }
    }
  }, [form.type, form.country_code, countries, form.name]);

  const handleCreate = async () => {
    if (!form.name) {
      toast.error("Please select a country or locality first");
      return;
    }

    const parsed = ambassadorChapterCreateSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid form");
      return;
    }

    setSaving(true);
    try {
      // Check for duplicates
      let query = supabase.from("ambassador_chapters").select("id").eq("type", form.type);

      if (form.type === "national") {
        query = query.eq("country_code", form.country_code);
      } else if (form.locality_id) {
        query = query.eq("locality_id", form.locality_id);
      } else {
        toast.error("Locality is required for local chapters");
        setSaving(false);
        return;
      }

      const { data: existing, error: checkError } = await query.limit(1);
      if (checkError) throw checkError;
      if (existing && existing.length > 0) {
        toast.error(
          `A ${form.type} chapter for this ${
            form.type === "national" ? "country" : "locality"
          } already exists.`,
        );
        setSaving(false);
        return;
      }

      const payload = {
        name: parsed.data.name,
        type: parsed.data.type,
        country_code: parsed.data.country_code,
        locality_id: parsed.data.locality_id,
        parent_chapter_id: parsed.data.parent_chapter_id,
        max_ambassadors: parsed.data.max_ambassadors,
        status: parsed.data.status,
      };
      const { error } = await supabase.from("ambassador_chapters").insert(payload);
      if (error) throw error;
      toast.success("Chapter created");
      setDialogOpen(false);
      resetForm();
      await loadChapters();
    } catch {
      toast.error("Could not create chapter");
    } finally {
      setSaving(false);
    }
  };

  const typeLabel = useMemo(
    () =>
      ({
        local: "Local",
        national: "National",
      }) as const,
    [],
  );

  const { data: attention } = useQuery({
    queryKey: ["ambassador-attention"],
    queryFn: async () => {
      const [{ count: pendingApplications }, { data: memberships }] = await Promise.all([
        supabase
          .from("ambassador_applications")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("ambassador_memberships")
          .select("chapter_id, role")
          .eq("status", "active")
          .eq("role", "president"),
      ]);

      const chaptersWithPresident = new Set((memberships ?? []).map((m) => m.chapter_id));
      const chaptersWithoutPresident = chapters.filter(
        (c) => c.status === "active" && !chaptersWithPresident.has(c.id),
      );

      return {
        pendingApplications: pendingApplications ?? 0,
        chaptersWithoutPresident: chaptersWithoutPresident.length,
      };
    },
    enabled: chapters.length > 0,
  });

  const hasAttention =
    (attention?.pendingApplications ?? 0) > 0 ||
    (attention?.chaptersWithoutPresident ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-text-secondary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-text-primary">
              Ambassador chapters
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Create and manage geographic chapters for the ambassador program.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" type="button" asChild>
            <Link to="/admin/ambassadors/coverage">Coverage</Link>
          </Button>
          <Button variant="outline" type="button" asChild>
            <Link to="/admin/ambassadors/campaigns">
              <Target className="h-4 w-4 mr-2" aria-hidden />
              Campaigns
            </Link>
          </Button>
          <Button variant="outline" type="button" asChild>
            <Link to="/admin/ambassadors/applications">
              <ClipboardList className="h-4 w-4 mr-2" aria-hidden />
              Applications
            </Link>
          </Button>
          <Button type="button" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" aria-hidden />
            New chapter
          </Button>
        </div>
      </div>

      {hasAttention && attention && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              Needs attention
            </span>
          </div>
          <div className="flex flex-wrap gap-4">
            {attention.pendingApplications > 0 && (
              <Link
                to="/admin/ambassadors/applications"
                className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300 hover:underline"
              >
                <Users className="h-4 w-4" />
                {attention.pendingApplications} pending application
                {attention.pendingApplications !== 1 ? "s" : ""}
              </Link>
            )}
            {attention.chaptersWithoutPresident > 0 && (
              <span className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                <Crown className="h-4 w-4" />
                {attention.chaptersWithoutPresident} active chapter
                {attention.chaptersWithoutPresident !== 1 ? "s" : ""} without a president
              </span>
            )}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border-default bg-surface-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-text-disabled" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Members</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {chapters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-text-secondary py-12">
                    No chapters yet. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                chapters.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium text-text-primary">{row.name}</TableCell>
                    <TableCell>{typeLabel[row.type as "local" | "national"]}</TableCell>
                    <TableCell>{row.country_code}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{row.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {counts[row.id] ?? 0} / {row.max_ambassadors}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/admin/ambassadors/${row.id}`}>Open</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New chapter</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    type: v as AmbassadorChapterCreateInput["type"],
                    name: v === "national" ? f.name : "",
                    locality_id: v === "national" ? null : f.locality_id,
                    parent_chapter_id: v === "national" ? null : f.parent_chapter_id,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="national">National</SelectItem>
                  <SelectItem value="local">Local</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Select
                value={form.country_code}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, country_code: v.toUpperCase() }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.type === "local" && (
              <>
                <div className="space-y-2">
                  <Label>Parent national chapter</Label>
                  <Select
                    value={form.parent_chapter_id ?? ""}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, parent_chapter_id: v || null }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select national chapter" />
                    </SelectTrigger>
                    <SelectContent>
                      {nationalOptions.map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          {n.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loc-q">Locality search</Label>
                  <Input
                    id="loc-q"
                    value={localityQuery}
                    onChange={(e) => setLocalityQuery(e.target.value)}
                    placeholder="Type city name…"
                  />
                  {localityLoading && (
                    <p className="text-2xs text-text-secondary">Searching…</p>
                  )}
                  {localityHits.length > 0 && (
                    <ul className="border border-border-default rounded-md divide-y divide-border-default max-h-40 overflow-y-auto">
                      {localityHits.map((loc) => (
                        <li key={loc.id}>
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-surface-muted transition-colors"
                              onClick={() => {
                                setForm((f) => ({
                                  ...f,
                                  name: loc.city,
                                  locality_id: loc.id,
                                  country_code: loc.country_code.toUpperCase(),
                                }));
                                setLocalityQuery(`${loc.city}, ${loc.country}`);
                              }}
                            >
                              {loc.city}, {loc.country} ({loc.country_code})
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="ch-max">Max ambassadors</Label>
              <Input
                id="ch-max"
                type="number"
                min={1}
                max={500}
                value={form.max_ambassadors}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    max_ambassadors: Number.parseInt(e.target.value, 10) || 1,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    status: v as AmbassadorChapterCreateInput["status"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="forming">Forming</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={() => void handleCreate()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
