import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format, subHours } from "date-fns";
import {
  Activity,
  CheckCircle2,
  XCircle,
  DollarSign,
  RefreshCw,
  AlertTriangle,
  Clock,
  Cpu,
  Hash,
  ChevronRight,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

// ─── Types ────────────────────────────────────────────────────────────────────

type ApiRequestLog = {
  id: string;
  created_at: string;
  endpoint: string;
  method: string;
  status_code: number;
  duration_ms: number;
  user_id: string | null;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSuccess(statusCode: number) {
  return statusCode >= 200 && statusCode < 300;
}

function formatCost(costUsd: number | null): string {
  if (costUsd == null) return "—";
  if (costUsd === 0) return "$0.000000";
  if (costUsd < 0.000001) return "<$0.000001";
  return `$${costUsd.toFixed(6)}`;
}

function formatTokens(input: number | null, output: number | null): string {
  if (input == null && output == null) return "—";
  const i = input ?? 0;
  const o = output ?? 0;
  return `${i.toLocaleString()} / ${o.toLocaleString()}`;
}

function StatusBadge({ code }: { code: number }) {
  const success = isSuccess(code);
  const isClientError = code >= 400 && code < 500;
  const isServerError = code >= 500 || code === 0;

  if (success) {
    return (
      <Badge className="bg-feedback-success/10 text-feedback-success border-0 text-xs font-mono">
        {code}
      </Badge>
    );
  }
  if (isClientError) {
    return (
      <Badge className="bg-feedback-warning/10 text-feedback-warning border-0 text-xs font-mono">
        {code}
      </Badge>
    );
  }
  if (isServerError) {
    return (
      <Badge className="bg-feedback-destructive/10 text-feedback-destructive border-0 text-xs font-mono">
        {code}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs font-mono">
      {code}
    </Badge>
  );
}

function EndpointLabel({ endpoint }: { endpoint: string }) {
  const short = endpoint.replace("/api/", "");
  return (
    <span className="font-mono text-xs text-text-primary">{short}</span>
  );
}

// ─── Detail drawer ────────────────────────────────────────────────────────────

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xs font-medium uppercase tracking-widest text-text-secondary">
        {label}
      </span>
      <div className="text-sm text-text-primary">{children}</div>
    </div>
  );
}

function ApiRequestDetailSheet({
  log,
  onClose,
}: {
  log: ApiRequestLog;
  onClose: () => void;
}) {
  const success = isSuccess(log.status_code);
  const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b border-border-default">
          <SheetTitle className="text-base font-semibold text-text-primary truncate">
            {log.endpoint}
          </SheetTitle>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge code={log.status_code} />
            <span className="text-xs text-text-secondary font-mono">{log.method}</span>
            <span className="text-xs text-text-disabled">
              {format(new Date(log.created_at), "dd MMM yyyy, HH:mm:ss")}
            </span>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* ── Performance ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-subtle border border-border-default p-3 flex items-center gap-3">
              <Clock className="h-4 w-4 text-text-secondary shrink-0" strokeWidth={1.5} />
              <div>
                <p className="text-2xs uppercase tracking-widest text-text-secondary font-medium">Duration</p>
                <p className="text-sm font-semibold text-text-primary tabular-nums">
                  {log.duration_ms > 0 ? `${log.duration_ms.toLocaleString()} ms` : "—"}
                </p>
              </div>
            </div>
            <div className="bg-surface-subtle border border-border-default p-3 flex items-center gap-3">
              <DollarSign className="h-4 w-4 text-text-secondary shrink-0" strokeWidth={1.5} />
              <div>
                <p className="text-2xs uppercase tracking-widest text-text-secondary font-medium">Cost</p>
                <p className="text-sm font-semibold text-text-primary tabular-nums">
                  {formatCost(log.cost_usd)}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Model & tokens ── */}
          <div className="space-y-3">
            {log.model && (
              <DetailRow label="Model">
                <div className="flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-text-secondary" strokeWidth={1.5} />
                  <span className="font-mono text-sm">{log.model}</span>
                </div>
              </DetailRow>
            )}
            {(log.input_tokens != null || log.output_tokens != null) && (
              <DetailRow label="Tokens (input / output)">
                <div className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-text-secondary" strokeWidth={1.5} />
                  <span className="font-mono tabular-nums">
                    {(log.input_tokens ?? 0).toLocaleString()} in &nbsp;/&nbsp; {(log.output_tokens ?? 0).toLocaleString()} out
                  </span>
                </div>
              </DetailRow>
            )}
            {log.user_id && (
              <DetailRow label="User ID">
                <span className="font-mono text-xs text-text-secondary break-all">{log.user_id}</span>
              </DetailRow>
            )}
            <DetailRow label="Log ID">
              <span className="font-mono text-xs text-text-secondary break-all">{log.id}</span>
            </DetailRow>
          </div>

          {/* ── Error ── */}
          {log.error_message && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-2xs font-medium uppercase tracking-widest text-feedback-destructive">
                  Error
                </p>
                <div className="bg-feedback-destructive/5 border border-feedback-destructive/20 p-3">
                  <p className="text-sm text-feedback-destructive font-mono break-words whitespace-pre-wrap">
                    {log.error_message}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* ── API Response / Metadata ── */}
          {hasMetadata && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-2xs font-medium uppercase tracking-widest text-text-secondary">
                  {success ? "Response metadata" : "Debug metadata"}
                </p>
                <div className="bg-surface-subtle border border-border-default p-3 overflow-auto max-h-[420px]">
                  <pre className="text-xs text-text-primary font-mono whitespace-pre-wrap break-words leading-relaxed">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchApiLogs(
  endpointFilter: string,
  statusFilter: string,
): Promise<ApiRequestLog[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("api_request_logs")
    .select(
      "id, created_at, endpoint, method, status_code, duration_ms, user_id, model, input_tokens, output_tokens, cost_usd, error_message, metadata",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (endpointFilter !== "all") {
    query = query.eq("endpoint", endpointFilter);
  }

  if (statusFilter === "success") {
    query = query.gte("status_code", 200).lt("status_code", 300);
  } else if (statusFilter === "error") {
    query = query.gte("status_code", 400);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as ApiRequestLog[];
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  variant = "default",
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  variant?: "default" | "success" | "error" | "warning";
}) {
  const iconColor =
    variant === "success"
      ? "text-feedback-success"
      : variant === "error"
        ? "text-feedback-destructive"
        : variant === "warning"
          ? "text-feedback-warning"
          : "text-text-secondary";

  return (
    <div className="bg-surface-card border border-border-default p-4 flex items-start gap-3">
      <div className={`mt-0.5 ${iconColor}`}>
        <Icon className="h-4 w-4" strokeWidth={1.5} />
      </div>
      <div className="min-w-0">
        <p className="text-2xs font-medium uppercase tracking-widest text-text-secondary">
          {label}
        </p>
        <p className="text-xl font-bold text-text-primary mt-0.5 tabular-nums">
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ENDPOINT_OPTIONS = [
  { value: "all", label: "All endpoints" },
  { value: "/api/embassy/building-research", label: "Building Research" },
  { value: "/api/embassy/event-search", label: "Event Search" },
  { value: "/api/admin/events-discover", label: "Events Discover" },
];

export default function ApiRequests() {
  const [endpointFilter, setEndpointFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<ApiRequestLog | null>(null);

  const { data: logs = [], isLoading, isError, dataUpdatedAt, refetch, isFetching } = useQuery({
    queryKey: ["admin", "api-request-logs", endpointFilter, statusFilter],
    queryFn: () => fetchApiLogs(endpointFilter, statusFilter),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  // ── Derived stats (last 24 h, unfiltered by UI filters) ──
  const cutoff24h = subHours(new Date(), 24).toISOString();
  const logs24h = logs.filter((l) => l.created_at >= cutoff24h);
  const successCount = logs24h.filter((l) => isSuccess(l.status_code)).length;
  const errorCount = logs24h.filter((l) => l.status_code >= 400).length;
  const totalCost = logs.reduce((acc, l) => acc + (l.cost_usd ?? 0), 0);
  const successRate =
    logs24h.length > 0
      ? `${Math.round((successCount / logs24h.length) * 100)}%`
      : "—";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            API Requests
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            LLM call logs, outcomes, token usage, and cost estimates
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors"
        >
          <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
          {dataUpdatedAt
            ? `Updated ${formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true })}`
            : "Refresh"}
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Requests (24h)"
          value={isLoading ? "…" : logs24h.length}
          icon={Activity}
        />
        <StatCard
          label="Success rate (24h)"
          value={isLoading ? "…" : successRate}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          label="Errors (24h)"
          value={isLoading ? "…" : errorCount}
          icon={XCircle}
          variant={errorCount > 0 ? "error" : "default"}
        />
        <StatCard
          label="Est. total cost"
          value={isLoading ? "…" : `$${totalCost.toFixed(4)}`}
          icon={DollarSign}
        />
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={endpointFilter} onValueChange={setEndpointFilter}>
          <SelectTrigger className="w-48 h-8 text-xs">
            <SelectValue placeholder="Endpoint" />
          </SelectTrigger>
          <SelectContent>
            {ENDPOINT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All statuses</SelectItem>
            <SelectItem value="success" className="text-xs">Success only</SelectItem>
            <SelectItem value="error" className="text-xs">Errors only</SelectItem>
          </SelectContent>
        </Select>

        {logs.length > 0 && (
          <span className="text-xs text-text-disabled ml-auto flex items-center gap-2">
            {logs.length} row{logs.length !== 1 ? "s" : ""}
            <span className="hidden sm:inline">· click a row to inspect</span>
          </span>
        )}
      </div>

      {/* ── Table ── */}
      {isError ? (
        <div className="flex items-center gap-2 text-sm text-feedback-destructive py-8">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Failed to load logs. Check that you have admin access and the migration has been applied.
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Activity className="h-6 w-6 text-text-disabled" strokeWidth={1.5} />
          <p className="text-sm text-text-secondary">No API requests logged yet.</p>
          <p className="text-xs text-text-disabled max-w-xs text-center">
            Logs appear here after the migration is applied and an instrumented endpoint is called.
          </p>
        </div>
      ) : (
        <div className="border border-border-default overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-xs uppercase tracking-wide text-text-secondary">
                <TableHead className="w-[160px]">Time</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead className="w-[70px]">Status</TableHead>
                <TableHead className="w-[100px]">Model</TableHead>
                <TableHead className="w-[160px] text-right">Tokens (in/out)</TableHead>
                <TableHead className="w-[110px] text-right">Cost</TableHead>
                <TableHead className="w-[80px] text-right">Duration</TableHead>
                <TableHead className="w-6" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={[
                    "cursor-pointer hover:bg-surface-subtle transition-colors",
                    !isSuccess(log.status_code) ? "bg-feedback-destructive/5" : "",
                    selectedLog?.id === log.id ? "bg-surface-subtle" : "",
                  ].join(" ")}
                >
                  <TableCell className="text-xs text-text-secondary whitespace-nowrap">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <EndpointLabel endpoint={log.endpoint} />
                      {log.error_message && (
                        <span className="text-2xs text-feedback-destructive truncate max-w-xs">
                          {log.error_message}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge code={log.status_code} />
                  </TableCell>
                  <TableCell className="text-xs text-text-secondary">
                    {log.model ? (
                      <span className="font-mono">{log.model.replace("claude-", "")}</span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right text-xs text-text-secondary tabular-nums">
                    {formatTokens(log.input_tokens, log.output_tokens)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-text-primary tabular-nums font-medium">
                    {formatCost(log.cost_usd)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-text-secondary tabular-nums">
                    {log.duration_ms > 0 ? `${log.duration_ms.toLocaleString()}ms` : "—"}
                  </TableCell>
                  <TableCell className="w-6 pl-0 text-text-disabled">
                    <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Detail drawer ── */}
      {selectedLog && (
        <ApiRequestDetailSheet
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}
