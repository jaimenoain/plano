import { Link } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { LocalityVolunteerTeamMember } from "../api/localitiesApi";
import { SectionLabel } from "./SectionLabel";

// ---------------------------------------------------------------------------
// LocalityVolunteerTeam — discreet editorial "meet the team" section
// ---------------------------------------------------------------------------

export function LocalityVolunteerTeam({
  members,
}: {
  members: LocalityVolunteerTeamMember[];
}) {
  if (members.length === 0) return null;

  const president = members.filter((m) => m.role === "president");
  const exco = members.filter((m) => m.role === "exco");
  const ambassadors = members.filter((m) => m.role === "ambassador");

  function InlineTeamRow({ label, group }: { label: string; group: LocalityVolunteerTeamMember[] }) {
    if (group.length === 0) return null;
    return (
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="w-28 shrink-0 text-[9px] font-medium uppercase tracking-widest text-text-disabled">
          {label}
        </span>
        {group.map((m) => (
          <Link
            key={m.user_id}
            to={`/profile/${m.username}`}
            className="group flex items-center gap-1.5"
          >
            <Avatar className="h-5 w-5 shrink-0 border border-border-default bg-surface-muted">
              <AvatarImage src={m.avatar_url ?? undefined} alt="" />
              <AvatarFallback className="text-[8px]">
                {m.username.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-text-secondary transition-colors group-hover:text-text-primary">
              {m.username}
            </span>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <section className="mt-14 border-t border-border-default pt-8">
      <div className="mb-5 flex items-center gap-2">
        <SectionLabel>Meet the team</SectionLabel>
      </div>
      <div className="space-y-3">
        <InlineTeamRow label="President" group={president} />
        <InlineTeamRow label="Executive committee" group={exco} />
        <InlineTeamRow label="Ambassadors" group={ambassadors} />
      </div>
    </section>
  );
}
