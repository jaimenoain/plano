import { Link } from "react-router";
import { PlanoLogo } from "@/components/common/PlanoLogo";
import { useWaitlistSignup } from "@/features/waitlist/WaitlistSignupProvider";
import { Button } from "@/components/ui/button";

export function LandingNav() {
  const { openWaitlistDialog } = useWaitlistSignup();

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border-default bg-surface-default/95 backdrop-blur-sm px-5 md:px-8">
      <Link
        to="/"
        aria-label="Plano home"
        className="text-text-primary hover:opacity-70 transition-opacity"
      >
        <PlanoLogo className="h-[0.9rem]" />
      </Link>
      <Button
        type="button"
        onClick={openWaitlistDialog}
        className="h-8 px-4 text-xs font-medium rounded-sm bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover"
      >
        Join the waiting list
      </Button>
    </header>
  );
}
