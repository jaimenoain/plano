import { Link } from "react-router";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";

/** Shown while the initial session check is still resolving. */
export function AddBuildingAuthLoading() {
  return (
    <AppLayout title="Add Building" showBack>
      <div className="flex items-center justify-center h-[50vh] text-text-secondary">
        <Loader2 className="h-8 w-8 animate-spin" aria-label="Checking sign-in status" />
      </div>
    </AppLayout>
  );
}

/** Blocks the wizard up front for logged-out visitors, offering log in / sign up. */
export function AddBuildingAuthGate({ redirectTarget }: { redirectTarget: string }) {
  return (
    <AppLayout title="Add Building" showBack>
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
          <p className="meta-code text-text-disabled">SIGN IN REQUIRED</p>
          <h1 className="display">Add your first building.</h1>
          <p className="max-w-md text-sm leading-relaxed text-text-secondary md:text-base">
            Sign in or create an account so the building can be attributed to you and saved to the catalogue.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
            <Button asChild variant="outline">
              <Link to={`/login?redirect=${redirectTarget}&signup=1`}>Sign up</Link>
            </Button>
            <Button asChild variant="accent">
              <Link to={`/login?redirect=${redirectTarget}`}>Log in</Link>
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
