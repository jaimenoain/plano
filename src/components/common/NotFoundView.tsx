import { Link, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The catalogue's 404 composition — design-system `screens/states.html` (error):
 * a mono `ERROR · 404` eyebrow, a big `.display` headline, one catalogue-voice
 * sentence, and two actions. **No illustration** — the design system forbids spot
 * graphics on empty/error states.
 *
 * Shared by the not-found route (`pages/NotFound.tsx`) and the root
 * `ErrorBoundary`'s thrown-404 branch (`root.tsx`) so both 404 surfaces read
 * identically.
 */
export function NotFoundView() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
      <p className="meta-code text-text-disabled">ERROR · 404</p>
      <h1 className="display">Not built.</h1>
      <p className="max-w-md text-sm leading-relaxed text-text-secondary md:text-base">
        This page isn&rsquo;t in the catalogue — the link may be broken, or the building was
        merged into another entry.
      </p>
      <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
        <Button type="button" variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
          Go back
        </Button>
        <Button asChild variant="accent">
          <Link to="/">Open the feed</Link>
        </Button>
      </div>
    </div>
  );
}
