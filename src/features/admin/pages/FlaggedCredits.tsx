import { useEffect, useState } from "react";
import { Link, type MetaFunction } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  adminFlaggedCreditsQueryKey,
  getFlaggedCreditsForAdmin,
  notifyCreditOutcome,
  updateCreditStatus,
} from "@/features/credits/api/credits";
import type { FlagReason, FlaggedCreditModerationItem } from "@/features/credits/types";
import {
  formatAutoHideCountdown,
  shouldShowAutoHideCountdown,
  isVerifiedFlaggedCredit,
} from "@/lib/flagged-credit-moderation";
import { getBuildingUrl } from "@/utils/url";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AdminPageHeader,
  AdminEmptyState,
  AdminErrorState,
  adminTableHeadClass,
} from "@/features/admin/components/admin-ui";
import { cn } from "@/lib/utils";

export const meta: MetaFunction = () => [{ title: "Flagged credits | Plano Admin" }];

const FLAG_REASON_LABELS: Record<FlagReason, string> = {
  wrong_person: "Wrong person",
  never_involved: "Never involved",
  wrong_role: "Wrong role",
  other: "Other",
};

export default function FlaggedCredits() {
  const queryClient = useQueryClient();
  const [actingId, setActingId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const onFocus = () => setNowMs(Date.now());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const { data: rows, isLoading, error, refetch } = useQuery({
    queryKey: adminFlaggedCreditsQueryKey(),
    queryFn: getFlaggedCreditsForAdmin,
  });

  const runModeration = async (
    credit: FlaggedCreditModerationItem,
    status: "verified" | "active" | "hidden",
    successMessage: string,
  ) => {
    setActingId(credit.id);
    try {
      await updateCreditStatus(credit.id, { status });
      if ((status === "verified" || status === "hidden") && credit.addedByUserId) {
        try {
          await notifyCreditOutcome({
            creditId: credit.id,
            outcome: status === "verified" ? "verified" : "hidden",
          });
        } catch {
          toast.error("Status updated, but the contributor email could not be sent.");
        }
      }
      toast.success(successMessage);
      await queryClient.invalidateQueries({ queryKey: adminFlaggedCreditsQueryKey() });
      if (credit.buildingId) {
        await queryClient.invalidateQueries({ queryKey: ["building-credits", credit.buildingId] });
      }
    } catch {
      toast.error("Could not update this credit.");
    } finally {
      setActingId(null);
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <AdminPageHeader eyebrow="Credits" title="Flagged credits" />
        <AdminErrorState message="Failed to load flagged credits." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Credits"
        title="Flagged credits"
        description="Review community reports. Verify confirms the credit; dismiss returns it to active; hide removes it from the public building page."
      />

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading…
        </div>
      ) : !rows?.length ? (
        <AdminEmptyState title="No flagged credits in the queue" />
      ) : (
        <div className="overflow-x-auto rounded-sm border border-border-default bg-surface-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={adminTableHeadClass}>Flagged</TableHead>
                <TableHead className={adminTableHeadClass}>Reason / notes</TableHead>
                <TableHead className={adminTableHeadClass}>Building</TableHead>
                <TableHead className={adminTableHeadClass}>Credited</TableHead>
                <TableHead className={adminTableHeadClass}>Added by</TableHead>
                <TableHead className={adminTableHeadClass}>Auto-hide info</TableHead>
                <TableHead className={cn(adminTableHeadClass, "w-48 text-right")}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((credit) => {
                const busy = actingId === credit.id;
                const verifiedFlag = isVerifiedFlaggedCredit(credit.flaggedFromStatus);
                const showCountdown = shouldShowAutoHideCountdown(
                  credit.flaggedFromStatus,
                  credit.person,
                  credit.company,
                );
                const countdownText = showCountdown
                  ? formatAutoHideCountdown(credit.flaggedAt, nowMs)
                  : verifiedFlag
                    ? "No auto-hide (was verified)"
                    : "—";
                const reasonLabel =
                  credit.flagReason && credit.flagReason in FLAG_REASON_LABELS
                    ? FLAG_REASON_LABELS[credit.flagReason as FlagReason]
                    : credit.flagReason ?? "—";

                return (
                  <TableRow key={credit.id}>
                    <TableCell className="align-top text-sm text-text-secondary whitespace-nowrap">
                      {credit.flaggedAt
                        ? format(new Date(credit.flaggedAt), "yyyy-MM-dd HH:mm")
                        : "—"}
                    </TableCell>
                    <TableCell className="align-top max-w-xs">
                      <div className="flex flex-col gap-2">
                        <Badge variant="secondary" className="w-fit">
                          {reasonLabel}
                        </Badge>
                        {credit.flagNotes ? (
                          <p className="text-xs text-text-secondary whitespace-pre-wrap">{credit.flagNotes}</p>
                        ) : null}
                        {verifiedFlag ? (
                          <Alert variant="warning" className="py-3">
                            <AlertTriangle className="size-4" aria-hidden />
                            <AlertTitle className="text-sm">Previously verified</AlertTitle>
                            <AlertDescription className="text-xs">
                              This credit was verified before it was flagged. It will not auto-hide; choose
                              verify, dismiss, or hide.
                            </AlertDescription>
                          </Alert>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <Link
                        // Locality URL not available: FlaggedCreditModerationItem.building does not include locality_country_code/city_slug — requires flagged credits query to join localities table
                        to={getBuildingUrl(
                          credit.building.id,
                          credit.building.slug,
                          credit.building.shortId,
                        )}
                        className="text-sm font-medium text-text-primary hover:underline"
                      >
                        {credit.building.name}
                      </Link>
                    </TableCell>
                    <TableCell className="align-top text-sm">
                      <span className="flex flex-col gap-1">
                        {credit.person ? (
                          <Link
                            to={`/person/${credit.person.slug}`}
                            className="w-fit text-text-primary hover:underline"
                          >
                            {credit.person.name}
                          </Link>
                        ) : null}
                        {credit.company ? (
                          <Link
                            to={`/company/${credit.company.slug}`}
                            className="w-fit text-text-primary hover:underline"
                          >
                            {credit.company.name}
                          </Link>
                        ) : null}
                        {!credit.person && !credit.company ? <span>—</span> : null}
                      </span>
                    </TableCell>
                    <TableCell className="align-top text-sm">
                      {credit.addedByUserId && credit.addedByUsername ? (
                        <Link
                          to={`/profile/${credit.addedByUsername}`}
                          className="text-text-primary hover:underline"
                        >
                          @{credit.addedByUsername}
                        </Link>
                      ) : credit.addedByUserId ? (
                        <span className="text-text-secondary font-mono text-xs">{credit.addedByUserId}</span>
                      ) : (
                        <span className="text-text-secondary">—</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top text-xs text-text-secondary max-w-36">
                      {showCountdown ? (
                        <span title="Informational: credits on fully unclaimed entities align with a 30-day policy window.">
                          {countdownText}
                        </span>
                      ) : (
                        <span>{countdownText}</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top text-right">
                      <div className="flex flex-col gap-2 items-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-sm"
                          disabled={busy}
                          onClick={() =>
                            runModeration(credit, "verified", "Credit marked verified.")
                          }
                        >
                          {busy ? <Loader2 className="size-4 animate-spin" /> : "Verify"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() =>
                            runModeration(credit, "active", "Flag dismissed — credit is active again.")
                          }
                        >
                          Dismiss flag
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={busy}
                          onClick={() =>
                            runModeration(credit, "hidden", "Credit hidden from the building page.")
                          }
                        >
                          Hide
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {!isLoading && rows && rows.length > 0 ? (
        <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
          Refresh
        </Button>
      ) : null}
    </div>
  );
}
