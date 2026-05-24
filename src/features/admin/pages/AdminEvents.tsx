import { useState, useEffect, useCallback } from "react";
import type { MetaFunction } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import {
  CalendarDays,
  ExternalLink,
  Loader2,
  MapPin,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { makeEventSlug } from "@/features/events/utils/eventSlug";
import type { DiscoveredEvent } from "@/features/admin/api/events-discover.route";

type ManagedEvent = {
  id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  address: string | null;
  external_link: string | null;
  claim_status: string;
  is_deleted: boolean;
  created_at: string;
};

export const meta: MetaFunction = () => [{ title: "Admin Events | Plano" }];

export default function AdminEvents() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight leading-none text-text-primary">Events</h1>
      <Tabs defaultValue="discover">
        <TabsList>
          <TabsTrigger value="discover">Discover</TabsTrigger>
          <TabsTrigger value="manage">Manage</TabsTrigger>
        </TabsList>
        <TabsContent value="discover" className="mt-6">
          <DiscoverTab />
        </TabsContent>
        <TabsContent value="manage" className="mt-6">
          <ManageTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DiscoverTab() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiscoveredEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [addedSlugs, setAddedSlugs] = useState<Set<string>>(new Set());
  const [addingTitle, setAddingTitle] = useState<string | null>(null);

  const handleSearch = async () => {
    if (query.trim().length < 3) return;
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const res = await fetch("/api/admin/events-discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });

      const data = (await res.json()) as { events?: DiscoveredEvent[]; error?: string };

      if (!res.ok) {
        setError(data.error ?? "Search failed.");
        return;
      }

      setResults(data.events ?? []);
      if ((data.events ?? []).length === 0) {
        setError("No events found. Try a different query.");
      }
    } catch {
      setError("Could not reach the search service. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (event: DiscoveredEvent) => {
    setAddingTitle(event.title);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      const slug = makeEventSlug(event.title);

      const { error: insertError } = await supabase.from("events").insert({
        title: event.title,
        description: event.description,
        slug,
        start_at: event.startAt,
        end_at: event.endAt ?? null,
        address: event.address ?? null,
        location: null,
        external_link: event.externalLink ?? null,
        cover_image_url: null,
        is_self_hosted: false,
        claim_status: "unclaimed",
        submitted_by_user_id: user.id,
        organiser_user_id: null,
        organiser_person_id: null,
        organiser_company_id: null,
        is_deleted: false,
      });

      if (insertError) {
        toast.error("Failed to add event");
        return;
      }

      toast.success(`"${event.title}" added`);
      setAddedSlugs((prev) => new Set([...prev, event.title]));
    } catch {
      toast.error("Something went wrong");
    } finally {
      setAddingTitle(null);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="space-y-3">
        <p className="text-sm text-text-secondary">
          Describe what to search for — city, type of event, date range, or a specific festival name. Claude will search the web for real upcoming architecture events.
        </p>
        <Textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Open House London 2026, architecture tours in Chicago this summer, Venice Biennale…"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSearch();
          }}
        />
        <Button onClick={handleSearch} disabled={loading || query.trim().length < 3}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching…
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Search with AI
            </>
          )}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-feedback-destructive">{error}</p>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-text-secondary">
            {results.length} event{results.length !== 1 ? "s" : ""} found
          </p>
          {results.map((event, i) => {
            const isAdded = addedSlugs.has(event.title);
            const isAdding = addingTitle === event.title;

            return (
              <div
                key={i}
                className="rounded-sm border border-border-default bg-surface-card p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-semibold text-text-primary leading-snug">{event.title}</h3>
                  <Button
                    size="sm"
                    variant={isAdded ? "secondary" : "default"}
                    disabled={isAdded || isAdding}
                    onClick={() => handleAdd(event)}
                    className="shrink-0"
                  >
                    {isAdding ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isAdded ? (
                      "Added"
                    ) : (
                      <>
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Add to DB
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatEventDate(event.startAt, event.endAt)}
                  </span>
                  {event.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {event.address}
                    </span>
                  )}
                  {event.externalLink && (
                    <a
                      href={event.externalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-text-primary underline underline-offset-2"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {new URL(event.externalLink).hostname}
                    </a>
                  )}
                </div>

                {event.description && (
                  <p className="text-sm text-text-secondary leading-relaxed">{event.description}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ManageTab() {
  const [events, setEvents] = useState<ManagedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<ManagedEvent | null>(null);

  const ITEMS_PER_PAGE = 20;

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, count, error } = await supabase
        .from("events")
        .select(
          "id, title, start_at, end_at, address, external_link, claim_status, is_deleted, created_at",
          { count: "exact" },
        )
        .eq("is_deleted", false)
        .order("start_at", { ascending: true })
        .range(from, to);

      if (error) throw error;
      setEvents((data as ManagedEvent[]) ?? []);
      if (count) setTotalPages(Math.ceil(count / ITEMS_PER_PAGE));
    } catch {
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase
        .from("events")
        .update({ is_deleted: true })
        .eq("id", deleteTarget.id);

      if (error) throw error;
      toast.success("Event removed");
      setEvents((prev) => prev.filter((e) => e.id !== deleteTarget.id));
    } catch {
      toast.error("Failed to remove event");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-sm border border-border-default bg-surface-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-text-secondary">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading…
                  </div>
                </TableCell>
              </TableRow>
            ) : events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-text-secondary">
                  No events yet. Use Discover to find and add some.
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-sm text-text-primary">{event.title}</span>
                      {event.external_link && (
                        <a
                          href={event.external_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-text-secondary underline underline-offset-2 hover:text-text-primary flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {safeHostname(event.external_link)}
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-text-secondary whitespace-nowrap">
                    {formatEventDate(event.start_at, event.end_at)}
                  </TableCell>
                  <TableCell className="text-sm text-text-secondary">
                    {event.address ?? <span className="opacity-40">—</span>}
                  </TableCell>
                  <TableCell>
                    <ClaimBadge status={event.claim_status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-feedback-destructive"
                      title="Remove event"
                      onClick={() => setDeleteTarget(event)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-center gap-2">
        <Button
          variant="outline"
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this event?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; will be soft-deleted and hidden from the app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-feedback-destructive hover:bg-feedback-destructive/90"
              onClick={handleDelete}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ClaimBadge({ status }: { status: string }) {
  if (status === "claimed")
    return <Badge variant="default">Claimed</Badge>;
  if (status === "pending")
    return <Badge variant="secondary">Pending</Badge>;
  return (
    <Badge variant="outline" className="text-text-secondary">
      Unclaimed
    </Badge>
  );
}

function formatEventDate(startAt: string, endAt: string | null | undefined): string {
  try {
    const start = parseISO(startAt);
    const startFmt = format(start, "MMM d, yyyy");
    if (!endAt) return startFmt;
    const end = parseISO(endAt);
    if (format(end, "yyyy-MM-dd") === format(start, "yyyy-MM-dd")) return startFmt;
    return `${startFmt} – ${format(end, "MMM d, yyyy")}`;
  } catch {
    return startAt;
  }
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
