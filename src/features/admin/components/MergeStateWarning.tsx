import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { resolveBuildingUrl } from "@/utils/url";
import type { MergeBlocker, MergeSurvivor } from "../utils/mergeState";

/**
 * Explains why a merge is refused, and points at the record that actually holds
 * the content. Shown whenever either side of the comparison has already been
 * merged or deleted — merging again would leave the whole group with no live
 * survivor and hide every member from search.
 */
export function MergeStateWarning({
  blockers,
  survivors,
}: {
  blockers: MergeBlocker[];
  survivors: Record<string, MergeSurvivor>;
}) {
  if (blockers.length === 0) return null;

  const linkable = blockers.filter(
    (blocker) => blocker.survivorId && survivors[blocker.survivorId],
  );

  return (
    <Card className="mt-12 overflow-hidden rounded-sm border border-feedback-warning/20 bg-feedback-warning/10 shadow-none">
      <CardContent className="flex flex-col gap-6 p-10 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1 space-y-4">
          <div className="inline-flex items-center gap-2 rounded border border-feedback-warning/20 bg-feedback-warning/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-feedback-warning">
            <AlertTriangle className="h-4 w-4" />
            Merge blocked
          </div>

          <div className="space-y-2">
            {blockers.map((blocker) => (
              // A div, not a p: Badge renders a div, and a div inside a p is
              // invalid HTML and trips a hydration mismatch.
              <div key={blocker.entityId} className="text-text-primary">
                The{" "}
                <strong className="font-semibold">
                  {blocker.role === "target" ? "surviving" : "duplicate"}
                </strong>{" "}
                record is{" "}
                <Badge variant="destructive" className="border-none align-middle">
                  {blocker.reason === "merged" ? "Already merged" : "Deleted"}
                </Badge>{" "}
                {blocker.reason === "merged"
                  ? "— its content has already moved to another record. Merging it again would leave both buildings hidden from search."
                  : "— a deleted record cannot survive a merge."}
              </div>
            ))}
          </div>

          <p className="text-sm text-text-secondary">
            Open the surviving record and merge into that instead.
          </p>
        </div>

        {linkable.length > 0 && (
          <div className="flex shrink-0 flex-col gap-3">
            {linkable.map((blocker) => (
              <Button
                key={blocker.entityId}
                variant="outline"
                className="h-12 rounded-full px-8"
                asChild
              >
                <a href={resolveBuildingUrl(survivors[blocker.survivorId!])}>
                  Open surviving record
                </a>
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
