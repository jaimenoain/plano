import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { redeemCompanyStewardInvite } from "@/features/credits/api/companies";

/** Dev Strict Mode runs effects twice; avoid double RPC on the same token. */
const stewardRedeemInFlight = new Set<string>();

export default function AcceptCompanySteward() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const token = searchParams.get("token")?.trim() ?? "";
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (authLoading) return;
    if (!token || token.length !== 64) return;
    if (!user) return;
    if (stewardRedeemInFlight.has(token)) return;
    stewardRedeemInFlight.add(token);

    let cancelled = false;
    (async () => {
      setStatus("working");
      try {
        const result = await redeemCompanyStewardInvite(token);
        if (result.ok) {
          navigate(`/company/${result.companySlug}`, { replace: true });
          return;
        }
        if (cancelled) return;
        setStatus("error");
        if (result.error === "email_mismatch") {
          setMessage(
            "You’re signed in with a different email than the invite. Switch accounts and open the link again."
          );
        } else if (result.error === "already_used") {
          setMessage("This invite was already used.");
        } else if (result.error === "expired") {
          setMessage("This invite has expired. Ask the company owner to send a new one.");
        } else if (result.error === "already_member") {
          setMessage("You’re already a steward for this company.");
        } else {
          setMessage("We couldn’t accept this invite. The link may be invalid or expired.");
        }
      } finally {
        stewardRedeemInFlight.delete(token);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, token, navigate]);

  const loginHref = `/auth?redirect=${encodeURIComponent(`/accept-company-steward?token=${encodeURIComponent(token)}`)}`;

  if (authLoading) {
    return (
      <AppLayout showBack title="Company invite">
        <div className="mx-auto max-w-md px-4 py-12 text-center">
          <p className="text-sm text-text-secondary">Loading…</p>
        </div>
      </AppLayout>
    );
  }

  if (!token || token.length !== 64) {
    return (
      <AppLayout showBack title="Company invite">
        <div className="mx-auto max-w-md px-4 py-12 text-center">
          <h1 className="mb-2 text-xl font-semibold text-text-primary">Missing invite</h1>
          <p className="mb-6 text-sm text-text-secondary">Open the link from your invitation email.</p>
          <Button asChild variant="default">
            <Link to="/">Home</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout showBack title="Company invite">
        <div className="mx-auto max-w-md px-4 py-12 text-center">
          <h1 className="mb-2 text-xl font-semibold text-text-primary">Sign in to accept</h1>
          <p className="mb-6 text-sm text-text-secondary">
            Sign in with the email address that received the invite, then you’ll join the company automatically.
          </p>
          <Button asChild variant="default" className="min-w-[200px]">
            <Link to={loginHref}>Sign in</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  if (status === "error") {
    return (
      <AppLayout showBack title="Company invite">
        <div className="mx-auto max-w-md px-4 py-12 text-center">
          <h1 className="mb-2 text-xl font-semibold text-text-primary">Invite couldn’t be accepted</h1>
          <p className="mb-6 text-sm text-text-secondary">{message}</p>
          <Button asChild variant="default">
            <Link to="/">Home</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showBack title="Company invite">
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <p className="text-sm text-text-secondary">Accepting invite…</p>
      </div>
    </AppLayout>
  );
}
