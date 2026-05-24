import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchChapterTeam, type ChapterTeamMember } from "@/features/embassy/api/leadership";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EmbassyEmptyState,
  EmbassyErrorState,
  EmbassyPageHeader,
  EmbassySectionLabel,
  EMBASSY_SKELETON_ROUNDED,
} from "@/features/embassy/components/embassy-ui";

const EXCO_LABELS: Record<string, string> = {
  content: "Content",
  marketing: "Marketing",
  architect_relations: "Architect relations",
  data_quality: "Data quality",
  community: "Community",
};

const ROLE_LABELS: Record<string, string> = {
  president: "President",
  exco: "Executive Committee",
  ambassador: "Ambassador",
};

function TeamMemberRow({ member }: { member: ChapterTeamMember }) {
  const initials = member.username
    .split(/[\s_-]/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  return (
    <div className="flex items-center gap-4 border-b border-border-default py-4 last:border-b-0">
      <Avatar className="h-12 w-12 shrink-0">
        <AvatarImage src={member.avatar_url ?? undefined} alt={member.username} />
        <AvatarFallback className="text-sm font-semibold">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-semibold text-text-primary">@{member.username}</span>
          {member.role === "president" && (
            <Badge
              variant="outline"
              className="border-border-default bg-surface-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-text-primary"
            >
              President
            </Badge>
          )}
          {member.role === "exco" && (
            <Badge
              variant="outline"
              className="border-border-default bg-surface-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-text-secondary"
            >
              ExCo
            </Badge>
          )}
        </div>
        {member.role === "exco" && member.exco_responsibility && (
          <p className="mt-0.5 text-xs text-text-secondary">
            {EXCO_LABELS[member.exco_responsibility] ?? member.exco_responsibility}
          </p>
        )}
        <p className="mt-0.5 text-xs text-text-secondary">
          Joined {new Date(member.joined_at).toLocaleDateString(undefined, { year: "numeric", month: "short" })}
        </p>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const { user } = useAuth();

  const { data: membership } = useQuery({
    queryKey: ["ambassador-membership", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ambassador_memberships")
        .select("chapter_id")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const chapterId = membership?.chapter_id;

  const { data: members, isLoading, error } = useQuery({
    queryKey: ["chapter-team", chapterId],
    queryFn: () => fetchChapterTeam(chapterId!),
    enabled: !!chapterId,
    staleTime: 5 * 60 * 1000,
  });

  const grouped = useMemo(() => {
    if (!members) return { president: [], exco: [], ambassador: [] };
    const globalRoles = new Set(["global_president", "global_leaders", "global_team"]);
    return {
      president: members.filter((m) => m.role === "president"),
      exco: members.filter((m) => m.role === "exco"),
      ambassador: members.filter((m) => m.role === "ambassador" || globalRoles.has(m.role)),
    };
  }, [members]);

  return (
    <div className="space-y-8 pb-20">
      <EmbassyPageHeader
        title="Team"
        description="Your chapter's leadership and ambassadors."
      />

      {isLoading ? (
        <div className="space-y-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <div className="divide-y divide-border-default border-y border-border-default">
                {[0, 1].map((j) => (
                  <Skeleton key={j} className={cn("my-4 h-16 w-full", EMBASSY_SKELETON_ROUNDED)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <EmbassyErrorState message="Failed to load team. Please try again." />
      ) : !members?.length ? (
        <EmbassyEmptyState
          icon={<Users className="h-10 w-10" />}
          title="No team members yet"
          description="Your chapter hasn't set up its team yet."
        />
      ) : (
        <div className="space-y-8">
          {(["president", "exco", "ambassador"] as const).map((role) => {
            const group = grouped[role];
            if (group.length === 0) return null;
            return (
              <section key={role} className="space-y-3">
                <div className="flex items-center gap-3">
                  <EmbassySectionLabel>{ROLE_LABELS[role]}</EmbassySectionLabel>
                  <div className="flex-1 border-t border-border-default" />
                  <span className="text-xs tabular-nums text-text-secondary">{group.length}</span>
                </div>
                <div className="divide-y divide-border-default border-y border-border-default px-1">
                  {group.map((member) => (
                    <TeamMemberRow key={member.user_id} member={member} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
