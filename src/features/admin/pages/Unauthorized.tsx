import { Link, type MetaFunction } from "react-router";
import { ShieldAlert } from "lucide-react";

export const meta: MetaFunction = () => [
  { title: "Admin Unauthorized | Plano" },
  { name: "robots", content: "noindex, nofollow" },
];

export default function Unauthorized() {
  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center gap-4 bg-surface-default px-4 py-8 text-center safe-area-pt safe-area-pb">
      <div className="flex h-14 w-14 items-center justify-center rounded-sm border border-border-default bg-feedback-destructive/10">
        <ShieldAlert className="h-7 w-7 text-feedback-destructive" aria-hidden />
      </div>
      <h1 className="text-3xl font-bold tracking-tight leading-none text-text-primary">Permission denied</h1>
      <p className="max-w-md text-sm text-text-secondary">
        You do not have permission to access the admin console. If you believe this is an error, contact the system administrator.
      </p>
      <Link to="/" className="cta-link">
        Return home
      </Link>
    </div>
  );
}
