import { Link, useNavigate } from "react-router";
import { PlanoLogo } from "@/components/common/PlanoLogo";
import { useWaitlistSignup } from "@/features/waitlist/WaitlistSignupProvider";
import { Button } from "@/components/ui/button";

export function LandingNav() {
  const { openWaitlistDialog } = useWaitlistSignup();
  const navigate = useNavigate();

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border-default bg-[rgba(250,250,250,0.95)] px-5 backdrop-blur-xs md:px-8">
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
        <Button
          type="button"
          size="sm"
          className="h-8 rounded-sm bg-brand-primary px-4 text-xs font-medium text-brand-primary-foreground hover:bg-brand-primary-hover"
          onClick={openWaitlistDialog}
        >
          Join the waiting list
        </Button>
      </div>
    </header>
  );
}
