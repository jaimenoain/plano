import { Link } from "react-router";
import { ArrowRight, BookOpen, Building2, Camera, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SectionLabel } from "./SectionLabel";

export interface LocalitySteward {
  userId: string;
  username: string;
  avatarUrl: string | null;
  buildingsLogged: number;
  photosUploaded: number;
  reviewsWritten: number;
  isAmbassador?: boolean;
  /** Ambassador display label, set manually via admin */
  ambassadorTitle?: string;
}

// ---------------------------------------------------------------------------
// LocalityStewards — ambassador + top contributors
// ---------------------------------------------------------------------------
function StewardCard({
  steward,
  rank,
}: {
  steward: LocalitySteward;
  rank: number;
}) {
  const initials = steward.username.slice(0, 2).toUpperCase();

  const stats = [
    steward.buildingsLogged > 0
      ? {
          icon: Building2,
          label: `${steward.buildingsLogged} building${steward.buildingsLogged === 1 ? "" : "s"}`,
        }
      : null,
    steward.photosUploaded > 0
      ? {
          icon: Camera,
          label: `${steward.photosUploaded} photo${steward.photosUploaded === 1 ? "" : "s"}`,
        }
      : null,
    steward.reviewsWritten > 0
      ? {
          icon: BookOpen,
          label: `${steward.reviewsWritten} review${steward.reviewsWritten === 1 ? "" : "s"}`,
        }
      : null,
  ].filter(Boolean) as Array<{ icon: typeof Building2; label: string }>;

  return (
    <Link
      to={`/profile/${steward.username}`}
      className="group flex items-center gap-4 px-1 py-3.5 transition-colors hover:bg-surface-muted/50"
    >
      <span className="w-7 shrink-0 text-[10px] font-medium tabular-nums text-text-disabled transition-colors group-hover:text-text-secondary">
        {String(rank).padStart(2, "0")}
      </span>
      <Avatar className="h-10 w-10 shrink-0 border border-border-default bg-surface-muted">
        <AvatarImage src={steward.avatarUrl ?? undefined} alt="" />
        <AvatarFallback className="text-sm font-medium text-text-secondary">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="truncate text-sm font-medium text-text-primary transition-colors group-hover:text-text-secondary">
            {steward.username}
          </span>
          {steward.isAmbassador ? (
            <span className="inline-flex items-center gap-1 text-[9px] font-medium uppercase tracking-widest text-text-secondary">
              <Star className="h-2.5 w-2.5 fill-current" aria-hidden />
              {steward.ambassadorTitle ?? "Ambassador"}
            </span>
          ) : null}
        </div>
        {stats.length > 0 ? (
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-text-secondary">
            {stats.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 tabular-nums"
              >
                <Icon className="h-3 w-3 text-text-disabled" aria-hidden />
                {label}
              </span>
            ))}
          </p>
        ) : null}
      </div>
      <ArrowRight
        className="h-3.5 w-3.5 shrink-0 text-text-disabled opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
    </Link>
  );
}

export function LocalityStewards({ stewards }: { stewards: LocalitySteward[] }) {
  if (stewards.length === 0) return null;

  // Ambassador always first, then by contribution volume
  const sorted = [...stewards].sort((a, b) => {
    if (a.isAmbassador && !b.isAmbassador) return -1;
    if (!a.isAmbassador && b.isAmbassador) return 1;
    return b.buildingsLogged - a.buildingsLogged;
  });

  return (
    <section className="mt-16 border-t border-border-default pt-12">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <SectionLabel>Local experts &amp; stewards</SectionLabel>
        <span className="text-[10px] tabular-nums text-text-disabled">
          {sorted.length}{" "}
          {sorted.length === 1 ? "contributor" : "contributors"}
        </span>
      </div>
      <p className="mb-6 max-w-prose text-xs text-text-secondary">
        Community members who contribute most to this city on Plano.
      </p>
      <ul className="divide-y divide-border-default border-y border-border-default">
        {sorted.map((s, i) => (
          <li key={s.userId}>
            <StewardCard steward={s} rank={i + 1} />
          </li>
        ))}
      </ul>
    </section>
  );
}
