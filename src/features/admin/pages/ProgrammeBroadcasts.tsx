import { useState } from "react";
import { type MetaFunction, useSearchParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Megaphone, Pin, PinOff, CheckCircle2, Clock, Users, ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchBroadcasts,
  sendBroadcast,
  toggleBroadcastPin,
  fetchBroadcastReadStatus,
} from "@/features/admin/api/programme";
import type {
  AdminBroadcast,
  BroadcastType,
  RecipientScope,
  BroadcastReadStatus,
} from "@/features/admin/types/programme";

export const meta: MetaFunction = () => [
  { title: "Broadcasts | Plano Admin" },
  { name: "robots", content: "noindex, nofollow" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<BroadcastType, string> = {
  announcement:    "Announcement",
  action_required: "Action required",
  check_in:        "Check-in",
};

const TYPE_COLORS: Record<BroadcastType, string> = {
  announcement:    "bg-surface-muted text-text-secondary",
  action_required: "bg-feedback-warning text-feedback-warning-foreground",
  check_in:        "bg-feedback-success text-feedback-success-foreground",
};

const SCOPE_LABELS: Record<RecipientScope, string> = {
  all:     "All presidents",
  country: "Country",
  chapter: "Individual chapter",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
}

function readRate(broadcast: AdminBroadcast): string {
  if (broadcast.recipientCount === 0) return "—";
  return `${broadcast.readCount} / ${broadcast.recipientCount}`;
}

// ─── Chapter selector data ────────────────────────────────────────────────────

interface ChapterOption { id: string; name: string; countryCode: string; }

function useChapters() {
  return useQuery({
    queryKey: ["admin", "chapters-list"],
    queryFn: async (): Promise<ChapterOption[]> => {
      const { data, error } = await supabase
        .from("ambassador_chapters")
        .select("id, name, country_code")
        .in("status", ["active", "forming"])
        .order("name");
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        countryCode: r.country_code,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Compose form ─────────────────────────────────────────────────────────────

function ComposeForm({ defaultScope, defaultChapterId, onSent }: {
  defaultScope?: RecipientScope;
  defaultChapterId?: string;
  onSent: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const { data: chapters = [] } = useChapters();

  const [subject, setSubject]             = useState("");
  const [body, setBody]                   = useState("");
  const [type, setType]                   = useState<BroadcastType>("announcement");
  const [scope, setScope]                 = useState<RecipientScope>(defaultScope ?? "all");
  const [countryCode, setCountryCode]     = useState("");
  const [chapterId, setChapterId]         = useState(defaultChapterId ?? "");
  const [previewing, setPreviewing]       = useState(false);

  const { mutate: send, isPending } = useMutation({
    mutationFn: () => sendBroadcast({
      subject,
      body,
      type,
      recipientScope: scope,
      scopeValue: scope === "country" ? countryCode : scope === "chapter" ? chapterId : null,
    }),
    onSuccess: (id) => {
      toast.success("Broadcast sent");
      queryClient.invalidateQueries({ queryKey: ["admin", "broadcasts"] });
      setSubject("");
      setBody("");
      setType("announcement");
      setScope("all");
      setCountryCode("");
      setChapterId("");
      setPreviewing(false);
      onSent(id);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to send broadcast");
    },
  });

  const canSend =
    subject.trim().length > 0 &&
    body.trim().length > 0 &&
    body.length <= 2000 &&
    (scope !== "country" || countryCode.trim().length === 2) &&
    (scope !== "chapter" || chapterId.length > 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Megaphone className="h-4 w-4" />
          Compose broadcast
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="bc-type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as BroadcastType)}>
              <SelectTrigger id="bc-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="announcement">Announcement</SelectItem>
                <SelectItem value="action_required">Action required</SelectItem>
                <SelectItem value="check_in">Check-in</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bc-scope">Recipients</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as RecipientScope)}>
              <SelectTrigger id="bc-scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All presidents</SelectItem>
                <SelectItem value="country">Country</SelectItem>
                <SelectItem value="chapter">Individual chapter</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {scope === "country" && (
          <div className="space-y-1.5">
            <Label htmlFor="bc-country">Country code (ISO 2-letter, e.g. GB)</Label>
            <Input
              id="bc-country"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value.toUpperCase().slice(0, 2))}
              placeholder="GB"
              maxLength={2}
              className="max-w-24"
            />
          </div>
        )}

        {scope === "chapter" && (
          <div className="space-y-1.5">
            <Label htmlFor="bc-chapter">Chapter</Label>
            <Select value={chapterId} onValueChange={setChapterId}>
              <SelectTrigger id="bc-chapter">
                <SelectValue placeholder="Select a chapter…" />
              </SelectTrigger>
              <SelectContent>
                {chapters.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} · {c.countryCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="bc-subject">Subject</Label>
          <Input
            id="bc-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Q2 Programme Update"
            maxLength={200}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bc-body">
            Message
            <span className="ml-2 text-xs text-text-secondary font-normal">
              {body.length}/2000
            </span>
          </Label>
          <Textarea
            id="bc-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message here…"
            rows={5}
            maxLength={2000}
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => setPreviewing(true)}
            disabled={!canSend}
          >
            Preview
          </Button>
          <Button onClick={() => send()} disabled={!canSend || isPending}>
            {isPending ? "Sending…" : "Send broadcast"}
          </Button>
        </div>
      </CardContent>

      {previewing && (
        <Dialog open onOpenChange={() => setPreviewing(false)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Preview</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`text-xs ${TYPE_COLORS[type]}`}>
                  {TYPE_LABELS[type]}
                </Badge>
                <span className="text-xs text-text-secondary">
                  To: {SCOPE_LABELS[scope]}
                  {scope === "country" && countryCode ? ` · ${countryCode}` : ""}
                  {scope === "chapter" && chapterId
                    ? ` · ${chapters.find((c) => c.id === chapterId)?.name ?? chapterId}`
                    : ""}
                </span>
              </div>
              <p className="font-semibold text-text-primary">{subject}</p>
              <p className="text-sm text-text-primary whitespace-pre-wrap">{body}</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPreviewing(false)}>
                Edit
              </Button>
              <Button
                onClick={() => { setPreviewing(false); send(); }}
                disabled={isPending}
              >
                {isPending ? "Sending…" : "Confirm and send"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

// ─── Read status dialog ───────────────────────────────────────────────────────

function ReadStatusDialog({
  broadcast,
  onClose,
}: {
  broadcast: AdminBroadcast;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "broadcast-reads", broadcast.id],
    queryFn: () => fetchBroadcastReadStatus(broadcast.id),
  });

  const { mutate: pin, isPending: pinPending } = useMutation({
    mutationFn: () => toggleBroadcastPin(broadcast.id, !broadcast.pinned),
    onSuccess: () => {
      toast.success(broadcast.pinned ? "Unpinned" : "Pinned");
      queryClient.invalidateQueries({ queryKey: ["admin", "broadcasts"] });
      onClose();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed"),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="pr-8">{broadcast.subject}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 flex-wrap mb-1">
          <Badge className={`text-xs ${TYPE_COLORS[broadcast.type]}`}>
            {TYPE_LABELS[broadcast.type]}
          </Badge>
          <span className="text-xs text-text-secondary">
            {SCOPE_LABELS[broadcast.recipientScope]}
            {broadcast.scopeValue ? ` · ${broadcast.scopeValue}` : ""}
          </span>
          <span className="text-xs text-text-secondary ml-auto">
            Sent {formatDate(broadcast.sentAt)} by @{broadcast.sentByUsername}
          </span>
        </div>

        <p className="text-sm text-text-primary whitespace-pre-wrap bg-surface-muted rounded-md p-3 mb-2">
          {broadcast.body}
        </p>

        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-text-primary flex items-center gap-1.5">
            <Users className="h-4 w-4 text-text-secondary" />
            {broadcast.readCount} / {broadcast.recipientCount} read
          </p>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => pin()}
            disabled={pinPending}
          >
            {broadcast.pinned
              ? <><PinOff className="h-3.5 w-3.5" /> Unpin</>
              : <><Pin className="h-3.5 w-3.5" /> Pin to leadership banner</>
            }
          </Button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-8">No recipients yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-default">
                  <th className="text-left py-2 text-xs font-medium text-text-secondary">President</th>
                  <th className="text-left py-2 text-xs font-medium text-text-secondary">Chapter</th>
                  <th className="text-left py-2 text-xs font-medium text-text-secondary">Read</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: BroadcastReadStatus) => (
                  <tr key={r.presidentUserId} className="border-b border-border-default last:border-0">
                    <td className="py-2.5 text-text-primary">@{r.presidentUsername}</td>
                    <td className="py-2.5 text-text-secondary">{r.chapterName}</td>
                    <td className="py-2.5">
                      {r.readAt ? (
                        <span className="flex items-center gap-1 text-feedback-success">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {formatDate(r.readAt)}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-text-secondary">
                          <Clock className="h-3.5 w-3.5" />
                          Unread
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sent list ────────────────────────────────────────────────────────────────

function SentList({ onSelect }: { onSelect: (b: AdminBroadcast) => void }) {
  const { data: broadcasts = [], isLoading, error } = useQuery({
    queryKey: ["admin", "broadcasts"],
    queryFn: fetchBroadcasts,
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-feedback-destructive">
        {error instanceof Error ? error.message : "Failed to load broadcasts."}
      </p>
    );
  }

  if (broadcasts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <Megaphone className="h-8 w-8 text-text-secondary opacity-40" />
        <p className="text-sm text-text-secondary">No broadcasts sent yet.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border-default">
      {broadcasts.map((b) => (
        <button
          key={b.id}
          className="w-full flex items-center gap-4 py-3.5 px-1 hover:bg-surface-muted/50 rounded-sm transition-colors text-left"
          onClick={() => onSelect(b)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              {b.pinned && <Pin className="h-3.5 w-3.5 text-brand-primary shrink-0" />}
              <p className="text-sm font-medium text-text-primary truncate">{b.subject}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`text-xs ${TYPE_COLORS[b.type]}`}>
                {TYPE_LABELS[b.type]}
              </Badge>
              <span className="text-xs text-text-secondary">
                {SCOPE_LABELS[b.recipientScope]}
                {b.scopeValue ? ` · ${b.scopeValue}` : ""}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-text-secondary">{formatDate(b.sentAt)}</p>
            <p className="text-xs text-text-secondary mt-0.5">
              {readRate(b)} read
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-text-secondary shrink-0" />
        </button>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProgrammeBroadcasts() {
  const [searchParams] = useSearchParams();
  const [selectedBroadcast, setSelectedBroadcast] = useState<AdminBroadcast | null>(null);

  const defaultScope = (searchParams.get("scope") as RecipientScope | null) ?? undefined;
  const defaultChapterId = searchParams.get("chapterId") ?? undefined;

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight leading-none text-text-primary">Broadcasts</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Send structured messages to chapter presidents. Rate limit: 3 per day.
        </p>
      </div>

      <ComposeForm
        defaultScope={defaultScope}
        defaultChapterId={defaultChapterId}
        onSent={() => {}}
      />

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary mb-3">
          Sent
        </h2>
        <SentList onSelect={setSelectedBroadcast} />
      </section>

      {selectedBroadcast && (
        <ReadStatusDialog
          broadcast={selectedBroadcast}
          onClose={() => setSelectedBroadcast(null)}
        />
      )}
    </div>
  );
}
