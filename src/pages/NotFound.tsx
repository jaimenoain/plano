import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { data, Link, useNavigate, type MetaFunction } from "react-router";

/** Ensures crawlers and SEO checks see a real 404 status (not a soft 200). */
export function loader() {
  return data(null, { status: 404 });
}

export const meta: MetaFunction = () => [
  { title: "Page Not Found | Plano" },
  { name: "robots", content: "noindex, nofollow" },
];

const ScopeReductionGraphic = () => (
  <div className="relative mx-auto mb-8 aspect-4/3 w-full max-w-[320px]">
    <svg
      viewBox="0 0 400 300"
      className="h-full w-full overflow-visible text-text-primary"
      aria-hidden
    >
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill="url(#grid)" />

      <g stroke="currentColor" strokeWidth="3" fill="none" className="text-text-primary">
        <rect x="50" y="50" width="300" height="200" />
        <line x1="150" y1="50" x2="150" y2="250" />
        <line x1="250" y1="50" x2="250" y2="250" />
        <line x1="50" y1="150" x2="150" y2="150" />
        <line x1="250" y1="150" x2="350" y2="150" />
      </g>

      <g stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5">
        <rect x="60" y="60" width="40" height="20" />
        <circle cx="80" cy="90" r="8" />
        <rect x="60" y="160" width="40" height="60" />
        <circle cx="300" cy="100" r="20" />
        <rect x="270" y="170" width="60" height="20" />
      </g>

      <path
        d="M 160,110
           q 10,-10 20,0 q 10,-10 20,0 q 10,-10 20,0 q 10,-10 20,0
           q 10,10 0,20 q 10,10 0,20 q 10,10 0,20 q 10,10 0,20
           q -10,10 -20,0 q -10,10 -20,0 q -10,10 -20,0 q -10,10 -20,0
           q -10,-10 0,-20 q -10,-10 0,-20 q -10,-10 0,-20 q -10,-10 0,-20
           z"
        fill="none"
        className="stroke-feedback-destructive"
        strokeWidth="2"
      />

      <g className="fill-feedback-destructive">
        <text x="200" y="145" textAnchor="middle" className="text-[10px] font-mono font-bold tracking-tighter">
          ITEM DELETED
        </text>
        <text x="200" y="160" textAnchor="middle" className="text-[10px] font-mono font-bold tracking-tighter">
          VALUE ENGINEERING
        </text>
      </g>
    </svg>
  </div>
);

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <AppLayout shellProvidesTopInset showHeader={false}>
      <main className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-16 text-center md:py-24">
        <ScopeReductionGraphic />

        <div className="mx-auto max-w-2xl space-y-6">
          <p className="text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">404</p>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            Scope reduction
          </h1>

          <div className="border border-border-default bg-surface-muted/30 p-6">
            <p className="font-mono text-sm leading-relaxed text-text-secondary md:text-base">
              We regret to inform you that this page was removed from the project scope during the latest budget review.
              The client decided a white void was more cost-effective.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center gap-4 pt-2 sm:flex-row">
            <Link
              to="/"
              className="text-xs font-medium uppercase tracking-[0.15em] text-text-primary transition-opacity hover:opacity-70"
            >
              Return home →
            </Link>
            <Button
              type="button"
              onClick={() => navigate(-1)}
              size="lg"
              variant="outline"
              className="min-w-[200px] border-2"
            >
              <span className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Go back
              </span>
            </Button>
          </div>
        </div>
      </main>
    </AppLayout>
  );
};

export default NotFound;
