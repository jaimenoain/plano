import { type FormEvent, useState } from "react";
import { Link, useLoaderData, useNavigate, type MetaFunction } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitCompanyClaimDispute } from "@/features/credits/api/companies";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  companyClaimDisputeLoader,
  type CompanyClaimDisputeLoaderData,
} from "./CompanyClaimDispute.loader";

export { companyClaimDisputeLoader as loader } from "./CompanyClaimDispute.loader";

export const meta: MetaFunction<typeof companyClaimDisputeLoader> = ({ data }) => {
  if (!data) return [{ title: "Plano" }];
  const d = data as CompanyClaimDisputeLoaderData;
  return [{ title: `Dispute claim · ${d.companyName} | Plano` }];
};

export default function CompanyClaimDispute() {
  const { companyId, companyName, slug } = useLoaderData() as CompanyClaimDisputeLoaderData;
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [reason, setReason] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const authRedirect = `/auth?redirect=${encodeURIComponent(`/company/${slug}/dispute`)}`;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      await submitCompanyClaimDispute(companyId, { reason, evidenceUrl });
      toast({
        title: "Dispute received",
        description: "We’ll review your report. You’ll see a notice on the company page while it’s open.",
      });
      void navigate(`/company/${slug}?disputeSubmitted=1`, { replace: true });
    } catch (err) {
      toast({
        variant: "destructive",
        description: err instanceof Error ? err.message : "Could not submit dispute.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout showBack>
      <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        <h1 className="mb-3 text-2xl font-bold tracking-tight text-text-primary">Dispute this company claim</h1>
        <p className="mb-6 text-sm leading-relaxed text-text-secondary">
          If you believe{" "}
          <span className="font-medium text-text-primary">{companyName}</span> should not be managed by the
          current claimant on Plano, tell us why. Our team will review manually — nothing changes automatically.
        </p>

        {!user ? (
          <div className="rounded-sm border border-border-default bg-surface-muted px-4 py-4">
            <p className="mb-3 text-sm text-text-secondary">Sign in to submit a dispute so we can follow up.</p>
            <Button asChild variant="default" size="sm" className="text-xs font-medium uppercase tracking-widest">
              <Link to={authRedirect}>Log in to continue</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
            <div className="grid gap-2">
              <Label htmlFor="dispute-reason">Reason (required)</Label>
              <Textarea
                id="dispute-reason"
                required
                value={reason}
                onChange={(ev) => setReason(ev.target.value)}
                rows={6}
                maxLength={10000}
                className="border-border-default bg-transparent"
                placeholder="Explain why this claim should be reviewed…"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dispute-evidence">Evidence URL (optional)</Label>
              <Input
                id="dispute-evidence"
                type="url"
                inputMode="url"
                value={evidenceUrl}
                onChange={(ev) => setEvidenceUrl(ev.target.value)}
                className="border-border-default bg-transparent"
                placeholder="https://…"
                maxLength={2000}
              />
              <p className="text-2xs text-text-secondary">Link to a page that supports your case, if you have one.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit dispute"}
              </Button>
              <Button asChild type="button" variant="ghost">
                <Link to={`/company/${slug}`}>Cancel</Link>
              </Button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
