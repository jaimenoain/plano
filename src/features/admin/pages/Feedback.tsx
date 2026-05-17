import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import type { MetaFunction } from "react-router";
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
import { Loader2 } from "lucide-react";

export const meta: MetaFunction = () => [{ title: "Admin Feedback | Plano" }];

type FeedbackType = "bug" | "ux_improvement" | "feature_idea" | "other";
type DateRange = "7d" | "30d" | "all";

interface FeedbackRow {
  id: string;
  type: FeedbackType;
  message: string;
  page_url: string | null;
  user_agent: string | null;
  console_errors: string[];
  metadata: Record<string, unknown>;
  screenshot_path: string | null;
  created_at: string;
  user_id: string;
  profiles: { username: string | null; email: string | null } | null;
}

const TYPE_LABELS: Record<FeedbackType, string> = {
  bug: "Bug report",
  ux_improvement: "UX improvement",
  feature_idea: "Feature idea",
  other: "Other",
};

const TYPE_COLORS: Record<FeedbackType, string> = {
  bug: "bg-red-100 text-red-700 border-red-200",
  ux_improvement: "bg-blue-100 text-blue-700 border-blue-200",
  feature_idea: "bg-purple-100 text-purple-700 border-purple-200",
  other: "bg-neutral-100 text-neutral-700 border-neutral-200",
};

function TypePill({ type }: { type: FeedbackType }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[type]}`}
    >
      {TYPE_LABELS[type]}
    </span>
  );
}

export default function FeedbackAdminPage() {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<FeedbackType | "all">("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [signingUrl, setSigningUrl] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError(null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("feedback")
        .select(
          `id, type, message, page_url, user_agent, console_errors, metadata, screenshot_path, created_at, user_id,
           profiles ( username, email )`
        )
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        setLoadError(error.message);
      } else {
        setRows((data ?? []) as unknown as FeedbackRow[]);
      }
      setLoading(false);
    }
    load();
  }, []);

  const now = Date.now();
  const filtered = rows.filter((r) => {
    if (typeFilter !== "all" && r.type !== typeFilter) return false;
    if (dateRange === "7d" && now - new Date(r.created_at).getTime() > 7 * 86_400_000) return false;
    if (dateRange === "30d" && now - new Date(r.created_at).getTime() > 30 * 86_400_000) return false;
    return true;
  });

  async function handleViewScreenshot(screenshotPath: string) {
    setSigningUrl("loading");
    const { data, error } = await supabase.storage
      .from("feedback-screenshots")
      .createSignedUrl(screenshotPath, 60);
    if (error || !data) {
      void error;
      setSigningUrl(null);
      return;
    }
    window.open(data.signedUrl, "_blank");
    setSigningUrl(null);
  }

  const TYPES: FeedbackType[] = ["bug", "ux_improvement", "feature_idea", "other"];

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-semibold text-text-primary">Feedback</h1>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant={typeFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("all")}
          >
            All
          </Button>
          {TYPES.map((t) => (
            <Button
              key={t}
              variant={typeFilter === t ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter(t)}
            >
              {TYPE_LABELS[t]}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          {(["7d", "30d", "all"] as DateRange[]).map((d) => (
            <Button
              key={d}
              variant={dateRange === d ? "default" : "outline"}
              size="sm"
              onClick={() => setDateRange(d)}
            >
              {d === "7d" ? "Last 7 days" : d === "30d" ? "Last 30 days" : "All time"}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
        </div>
      ) : loadError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load feedback: {loadError}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Page</TableHead>
              <TableHead>Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-12 text-text-secondary"
                >
                  No feedback yet.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <>
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-surface-muted"
                    onClick={() =>
                      setExpandedId(expandedId === row.id ? null : row.id)
                    }
                  >
                    <TableCell>
                      <TypePill type={row.type} />
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {row.profiles?.username ?? row.profiles?.email ?? row.user_id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="max-w-xs text-sm text-text-primary">
                      <span title={row.message}>
                        {row.message.length > 80
                          ? `${row.message.slice(0, 80)}…`
                          : row.message}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-xs text-text-secondary">
                      {row.page_url ? (
                        <a
                          href={row.page_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {row.page_url}
                        </a>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-text-secondary whitespace-nowrap">
                      {formatDistanceToNow(new Date(row.created_at), {
                        addSuffix: true,
                      })}
                    </TableCell>
                  </TableRow>

                  {/* Expanded detail row */}
                  {expandedId === row.id && (
                    <TableRow key={`${row.id}-detail`}>
                      <TableCell
                        colSpan={5}
                        className="bg-surface-muted px-5 py-4"
                      >
                        <div className="space-y-3 text-sm">
                          <div>
                            <p className="font-medium text-text-primary mb-1">
                              Full message
                            </p>
                            <p className="text-text-secondary whitespace-pre-wrap">
                              {row.message}
                            </p>
                          </div>
                          {row.user_agent && (
                            <div>
                              <p className="font-medium text-text-primary mb-1">
                                Browser
                              </p>
                              <p className="text-text-secondary break-all">
                                {row.user_agent}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-text-primary mb-1">
                              Console errors
                            </p>
                            {row.console_errors.length === 0 ? (
                              <p className="text-text-secondary">None</p>
                            ) : (
                              <ul className="font-mono text-xs text-feedback-destructive space-y-1">
                                {row.console_errors.map((e, i) => (
                                  <li key={i}>{e}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                          {Object.keys(row.metadata).length > 0 && (
                            <div>
                              <p className="font-medium text-text-primary mb-1">
                                Metadata
                              </p>
                              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-text-secondary">
                                {Object.entries(row.metadata).map(([k, v]) => (
                                  <>
                                    <dt key={`k-${k}`} className="font-medium text-text-primary">
                                      {k}
                                    </dt>
                                    <dd key={`v-${k}`}>{String(v)}</dd>
                                  </>
                                ))}
                              </dl>
                            </div>
                          )}
                          {row.screenshot_path && (
                            <div>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={signingUrl === "loading"}
                                onClick={() =>
                                  handleViewScreenshot(row.screenshot_path!)
                                }
                              >
                                {signingUrl === "loading" ? (
                                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                                ) : null}
                                View screenshot
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
