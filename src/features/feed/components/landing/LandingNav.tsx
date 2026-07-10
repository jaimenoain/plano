import { Link, useNavigate } from "react-router";
import { PlanoLogo } from "@/components/common/PlanoLogo";
import { useWaitlistSignup } from "@/features/waitlist/WaitlistSignupProvider";
import { Button } from "@/components/ui/button";

export function LandingNav() {
  const { openWaitlistDialog } = useWaitlistSignup();
  const navigate = useNavigate();

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border-default bg-surface-default/92 px-5 backdrop-blur-md md:px-8">
      <Link
        to="/"
        aria-label="Plano · Home"
        className="text-text-primary hover:opacity-70 transition-opacity"
      >
        <PlanoLogo className="text-sm text-text-primary" />
      </Link>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-sm font-medium"
          onClick={() => navigate("/auth")}
        >
          Sign in
        </Button>
        {/* Stays black: the hero owns this view's single lime button. */}
        <Button type="button" size="sm" className="px-4 text-xs" onClick={openWaitlistDialog}>
          Join the waiting list
        </Button>
      </div>
    </header>
  );
}
