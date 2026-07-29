import type { ReactNode } from "react";
import { BadgeCheck, ExternalLink, Pencil } from "lucide-react";
import { EntityHero } from "@/components/entity/EntityHero";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Person } from "../types";
import { EntityMetaEyebrow } from "./EntityMetaEyebrow";

interface PersonHeroProps {
  person: Person;
  /** Preformatted `birth–death` span, or null when unknown. */
  lifeSpan: string | null;
  isOwner: boolean;
  onEdit: () => void;
  /** Extra action slot (follow control) shown when the viewer is not the owner. */
  visitorActions?: ReactNode;
}

/**
 * Person-page hero on the shared `EntityHero` shell — mirrors the profile
 * hero's geometry so a claimed person page reads as the same surface.
 */
export function PersonHero({ person, lifeSpan, isOwner, onEdit, visitorActions }: PersonHeroProps) {
  const website = person.website?.trim();

  const badges =
    person.claimStatus === "verified" ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-x-2" tabIndex={0} aria-label="Identity verified by Plano">
            <BadgeCheck className="size-3.5 shrink-0 text-text-primary" aria-hidden />
            <span className="eyebrow tracking-widest">Verified</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom">Identity verified by Plano</TooltipContent>
      </Tooltip>
    ) : null;

  const actions = isOwner ? (
    <button
      type="button"
      onClick={onEdit}
      className="inline-flex min-h-11 min-w-11 items-center justify-center text-text-disabled transition-colors hover:text-text-primary active:text-text-primary md:min-h-0 md:min-w-0 md:p-0"
      aria-label="Edit profile"
    >
      <Pencil className="size-3.5" />
    </button>
  ) : (
    visitorActions
  );

  return (
    <EntityHero
      avatar={{
        url: person.avatarUrl,
        alt: person.name,
        fallbackInitial: person.name[0]?.toUpperCase() ?? "",
        shape: "round",
      }}
      badges={badges}
      actions={actions}
      eyebrow={
        <div className="mb-2">
          <EntityMetaEyebrow items={[person.nationality, lifeSpan, person.locationNote]} />
        </div>
      }
      title={person.name}
    >
      <div className="mt-5 space-y-3">
        {person.bio?.trim() && <p className="body-relaxed max-w-[56ch] text-base">{person.bio.trim()}</p>}
        {website && (
          <a
            href={website.startsWith("http") ? website : `https://${website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-widest text-text-disabled transition-colors hover:text-text-primary"
          >
            {website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            <ExternalLink className="size-3" />
          </a>
        )}
      </div>
    </EntityHero>
  );
}
