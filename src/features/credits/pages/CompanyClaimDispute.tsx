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

export const meta: MetaFunction<typeof companyClaimDisputeLoader> = ({ loaderData: data }) => {
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

  const authRedirect = `/login?redirect=${encodeURIComponent(`/company/${slug}/dispute`)}`;

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
        <p className="mb-2 eyebrow tracking-widest">
          Company claim
        </p>
        <h1 className="mb-3 text-3xl font-bold tracking-tight leading-none text-text-primary">
          Dispute this claim
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-text-secondary">
          If you believe{" "}
          <span className="font-medium text-text-primary">{companyName}</span> should not be managed by the
          current claimant on Plano, tell us why. Our team will review manually — nothing changes automatically.
        </p>

        {!user ? (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Sign in to submit a dispute so we can follow up with you.
            </p>
            <Link
              to={authRedirect}
              className="inline-block text-xs font-medium uppercase tracking-widest text-text-primary transition-opacity hover:opacity-70"
            >
              Log in to continue →
            </Link>
          </div>
        ) : (
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
            <div className="grid gap-2">
              <Label
                htmlFor="dispute-reason"
                className="eyebrow tracking-widest"
              >
                Reason (required)
              </Label>
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
              <Label
                htmlFor="dispute-evidence"
                className="eyebrow tracking-widest"
              >
                Evidence URL (optional)
              </Label>
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
            <div className="flex flex-wrap items-center gap-6 pt-2">
              <Button type="submit" disabled={submitting} className="min-h-11">
                {submitting ? "Submitting…" : "Submit dispute"}
              </Button>
              <Link
                to={`/company/${slug}`}
                className="text-xs font-medium uppercase tracking-widest text-text-secondary transition-colors hover:text-text-primary"
              >
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
