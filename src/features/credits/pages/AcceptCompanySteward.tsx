import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  TokenFlowHeadline,
  TokenFlowLayout,
  TokenFlowMessage,
  TokenFlowPrimaryLink,
  TokenFlowSecondaryLink,
} from "@/components/layout/TokenFlowLayout";
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

  const loginHref = `/login?redirect=${encodeURIComponent(`/accept-company-steward?token=${encodeURIComponent(token)}`)}`;

  if (authLoading || (user && status !== "error" && token.length === 64)) {
    return (
      <TokenFlowLayout>
        <TokenFlowHeadline>
          {authLoading ? "Loading" : "Accepting invite"}
        </TokenFlowHeadline>
        <TokenFlowMessage className="mb-0">
          {authLoading ? "One moment…" : "Joining the company workspace…"}
        </TokenFlowMessage>
      </TokenFlowLayout>
    );
  }

  if (!token || token.length !== 64) {
    return (
      <TokenFlowLayout>
        <TokenFlowHeadline>Missing invite</TokenFlowHeadline>
        <TokenFlowMessage>Open the link from your invitation email.</TokenFlowMessage>
        <TokenFlowPrimaryLink to="/">Home →</TokenFlowPrimaryLink>
      </TokenFlowLayout>
    );
  }

  if (!user) {
    return (
      <TokenFlowLayout>
        <TokenFlowHeadline>Sign in to accept</TokenFlowHeadline>
        <TokenFlowMessage>
          Sign in with the email address that received the invite. We will add you as a steward
          automatically.
        </TokenFlowMessage>
        <TokenFlowPrimaryLink to={loginHref}>Sign in →</TokenFlowPrimaryLink>
      </TokenFlowLayout>
    );
  }

  if (status === "error") {
    return (
      <TokenFlowLayout>
        <TokenFlowHeadline>Invite couldn’t be accepted</TokenFlowHeadline>
        <TokenFlowMessage>{message}</TokenFlowMessage>
        <TokenFlowPrimaryLink to="/">Home →</TokenFlowPrimaryLink>
        <TokenFlowSecondaryLink to={loginHref}>Try another account</TokenFlowSecondaryLink>
      </TokenFlowLayout>
    );
  }

  return (
    <TokenFlowLayout>
      <TokenFlowHeadline>Accepting invite</TokenFlowHeadline>
      <TokenFlowMessage className="mb-0">Joining the company workspace…</TokenFlowMessage>
    </TokenFlowLayout>
  );
}
