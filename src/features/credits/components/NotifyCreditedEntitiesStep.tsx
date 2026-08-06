import { useCallback, useMemo, useState } from "react";
import { Copy, X } from "lucide-react";
import { notifyCreditedEntities } from "../api/credits";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  CREDIT_NOTIFY_MAX_RECIPIENTS,
  parseCreditNotifyEmails,
} from "@/lib/parse-credit-notify-emails";
import { getBuildingUrl } from "@/utils/url";

export interface NotifyCreditedEntitiesStepProps {
  /** Credits saved in this session — the ones the emails will be about. */
  creditIds: string[];
  buildingId: string;
  buildingName?: string | null;
  onRequestClose: () => void;
}

/**
 * The optional "tell the people you just credited" step. Extracted from
 * `AddCreditForm` so it can be reopened on demand: saving now closes the drawer
 * with a toast, and the toast's "Notify them" action mounts this on its own.
 */
export function NotifyCreditedEntitiesStep({
  creditIds,
  buildingId,
  buildingName,
  onRequestClose,
}: NotifyCreditedEntitiesStepProps) {
  const { toast } = useToast();
  const [notifyDraft, setNotifyDraft] = useState("");
  const [notifyRemovedEmails, setNotifyRemovedEmails] = useState<string[]>([]);
  const [notifySending, setNotifySending] = useState(false);

  const parsedNotify = useMemo(() => parseCreditNotifyEmails(notifyDraft), [notifyDraft]);
  const visibleNotifyEmails = useMemo(
    () => parsedNotify.accepted.filter((e) => !notifyRemovedEmails.includes(e)),
    [parsedNotify.accepted, notifyRemovedEmails],
  );

  const handleNotifySend = useCallback(async () => {
    if (visibleNotifyEmails.length === 0) {
      toast({ variant: "destructive", title: "Add an email", description: "Enter at least one valid address." });
      return;
    }
    if (creditIds.length === 0) {
      toast({
        variant: "destructive",
        title: "Nothing to send",
        description: "No saved credits were found for this session.",
      });
      return;
    }
    setNotifySending(true);
    try {
      await notifyCreditedEntities({ creditIds, emails: visibleNotifyEmails });
      toast({ title: "Notifications sent", description: "Recipients will receive an email from Plano." });
      onRequestClose();
    } catch (e) {
      const message = e instanceof Error && e.message ? e.message : "Could not send notifications";
      toast({ variant: "destructive", title: "Send failed", description: message });
    } finally {
      setNotifySending(false);
    }
  }, [creditIds, onRequestClose, toast, visibleNotifyEmails]);

  const removeNotifyPill = useCallback((email: string) => {
    setNotifyRemovedEmails((prev) => (prev.includes(email) ? prev : [...prev, email]));
  }, []);

  const handleCopyInvitation = useCallback(() => {
    const url = window.location.origin + getBuildingUrl(buildingId);
    const name = buildingName?.trim() || "this building";
    const text = `I've credited your work at ${name}, take a look here\n${url}`;

    void navigator.clipboard.writeText(text);
    toast({ title: "Message and link copied" });
  }, [buildingId, buildingName, toast]);

  return (
    <>
      <SheetHeader>
        <SheetTitle>Notify credited people</SheetTitle>
        <SheetDescription>
          Notify the people you have credited — paste their email addresses below. This step is optional.
        </SheetDescription>
      </SheetHeader>
      <div className="mt-6 flex flex-col gap-4 overflow-y-auto">
        {creditIds.length === 0 ? (
          <p className="text-sm text-text-secondary" role="alert">
            No credits from this session were found. You can close this sheet.
          </p>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="add-credit-notify-emails" className="text-text-primary">
            Email addresses
          </Label>
          <Textarea
            id="add-credit-notify-emails"
            value={notifyDraft}
            disabled={notifySending}
            onChange={(e) => {
              setNotifyDraft(e.target.value);
              setNotifyRemovedEmails([]);
            }}
            className="min-h-24 resize-y"
            placeholder={"one@example.com, other@example.com\nor one address per line"}
            autoComplete="off"
          />
          <p className="text-2xs text-text-secondary">
            Separate with commas or new lines. Up to {CREDIT_NOTIFY_MAX_RECIPIENTS} addresses; duplicates are merged.
          </p>
        </div>

        {parsedNotify.invalid.length > 0 ? (
          <p className="text-sm text-destructive" role="alert">
            Skipping invalid: {parsedNotify.invalid.slice(0, 5).join(", ")}
            {parsedNotify.invalid.length > 5 ? "…" : ""}
          </p>
        ) : null}
        {parsedNotify.truncated > 0 ? (
          <p className="text-sm text-text-secondary" role="status">
            Only the first {CREDIT_NOTIFY_MAX_RECIPIENTS} valid addresses will be used ({parsedNotify.truncated}{" "}
            ignored).
          </p>
        ) : null}

        {visibleNotifyEmails.length > 0 ? (
          <div className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-widest text-text-secondary">Sending to</span>
            <div className="flex flex-wrap gap-2">
              {visibleNotifyEmails.map((email) => (
                <div
                  key={email}
                  className="flex items-center gap-1 rounded-none border border-border-default bg-surface-muted py-1 pl-2 pr-1"
                >
                  <span className="max-w-search-serp-alt truncate text-sm text-text-primary">{email}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 shrink-0 p-0 text-text-secondary"
                    disabled={notifySending}
                    onClick={() => removeNotifyPill(email)}
                    aria-label={`Remove ${email}`}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-3 rounded-none border border-border-default bg-surface-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-text-secondary">
              Share manually
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-2 text-text-primary hover:bg-surface-muted"
              onClick={handleCopyInvitation}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy link
            </Button>
          </div>
          <div className="rounded-none border border-border-tertiary bg-surface-muted p-3 text-sm leading-relaxed text-text-primary">
            <p>I&apos;ve credited your work at {buildingName?.trim() || "this building"}, take a look here:</p>
            <p className="mt-1 break-all text-text-secondary underline">
              {window.location.origin + getBuildingUrl(buildingId)}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border-default pt-4">
          <Button
            type="button"
            size="sm"
            className="w-full uppercase tracking-widest"
            disabled={
              notifySending ||
              creditIds.length === 0 ||
              visibleNotifyEmails.length === 0 ||
              parsedNotify.invalid.length > 0
            }
            onClick={() => void handleNotifySend()}
          >
            {notifySending ? "Sending…" : "Send notifications"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full uppercase tracking-widest"
            disabled={notifySending}
            onClick={onRequestClose}
          >
            Skip
          </Button>
        </div>
      </div>
    </>
  );
}
