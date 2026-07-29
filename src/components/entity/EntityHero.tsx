import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Hero layout shell shared by profile and entity (person/company) pages:
 * avatar on the left, then a badges/actions row, headline title, and a free
 * content block. Pure layout — data fetching and edit state stay with callers.
 *
 * A person is drawn round; a practice is drawn square.
 */
export interface EntityHeroAvatar {
  url: string | null;
  alt: string;
  fallbackInitial: string;
  shape: "round" | "square";
}

interface EntityHeroProps {
  avatar: EntityHeroAvatar;
  /** Badge cluster, left of the top row (verified / ambassador marks). */
  badges?: ReactNode;
  /** Action cluster, right of the top row (follow / edit / settings). */
  actions?: ReactNode;
  /** Optional meta line above the title (entity pages only). */
  eyebrow?: ReactNode;
  title: string;
  /** Firm/bio/website block, or an inline edit form. */
  children?: ReactNode;
}

export function EntityHero({ avatar, badges, actions, eyebrow, title, children }: EntityHeroProps) {
  const shapeClass = avatar.shape === "round" ? "rounded-full" : "rounded-none";

  return (
    <div className="flex flex-col gap-6 pt-10 pb-2 sm:flex-row sm:items-start sm:gap-8">
      <div className="shrink-0">
        {avatar.url ? (
          <img
            src={avatar.url}
            alt={avatar.alt}
            className={cn("size-20 bg-surface-muted object-cover sm:size-26", shapeClass)}
          />
        ) : (
          <div className={cn("flex size-20 items-center justify-center bg-text-primary sm:size-26", shapeClass)}>
            <span className="text-3xl font-semibold leading-none text-surface-default select-none sm:text-4xl">
              {avatar.fallbackInitial}
            </span>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex min-h-[20px] flex-wrap items-center gap-x-2 gap-y-1">{badges}</div>
          <div className="flex shrink-0 items-center gap-5">{actions}</div>
        </div>

        {eyebrow}
        <h1 className="headline wrap-break-word">{title}</h1>

        {children}
      </div>
    </div>
  );
}
