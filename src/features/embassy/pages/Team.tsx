import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchChapterTeam, type ChapterTeamMember } from "@/features/embassy/api/leadership";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, AlertCircle } from "lucide-react";

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

function TeamMemberCard({ member }: { member: ChapterTeamMember }) {
  const initials = member.username
    .split(/[\s_-]/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  return (
    <Card className="p-4 flex items-center gap-4 hover:border-brand-primary transition-all">
      <Avatar className="h-12 w-12 shrink-0">
        <AvatarImage src={member.avatar_url ?? undefined} alt={member.username} />
        <AvatarFallback className="text-sm font-semibold">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold truncate">@{member.username}</span>
          {member.role === "president" && (
            <Badge className="text-[10px] uppercase font-bold bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 border-none">
              President
            </Badge>
          )}
          {member.role === "exco" && (
            <Badge variant="secondary" className="text-[10px] uppercase font-bold">
              ExCo
            </Badge>
          )}
        </div>
        {member.role === "exco" && member.exco_responsibility && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {EXCO_LABELS[member.exco_responsibility] ?? member.exco_responsibility}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">
          Joined {new Date(member.joined_at).toLocaleDateString(undefined, { year: "numeric", month: "short" })}
        </p>
      </div>
    </Card>
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
    return {
      president: members.filter((m) => m.role === "president"),
      exco: members.filter((m) => m.role === "exco"),
      ambassador: members.filter((m) => m.role === "ambassador"),
    };
  }, [members]);

  return (
    <div className="space-y-8 pb-20">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Team</h1>
        <p className="text-muted-foreground">Your chapter's leadership and ambassadors.</p>
      </div>

      {isLoading ? (
        <div className="space-y-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <div className="grid gap-3 sm:grid-cols-2">
                {[0, 1].map((j) => <Skeleton key={j} className="h-20 w-full rounded-xl" />)}
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center border rounded-xl bg-destructive/5 text-destructive">
          <AlertCircle className="h-8 w-8 mx-auto mb-2" />
          <p>Failed to load team. Please try again.</p>
        </div>
      ) : !members?.length ? (
        <div className="p-12 text-center border border-dashed rounded-xl">
          <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-lg font-medium">No team members yet</p>
          <p className="text-sm text-muted-foreground">Your chapter hasn't set up its team yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {(["president", "exco", "ambassador"] as const).map((role) => {
            const group = grouped[role];
            if (group.length === 0) return null;
            return (
              <div key={role} className="space-y-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {ROLE_LABELS[role]}
                  </h2>
                  <div className="flex-1 border-t" />
                  <span className="text-xs text-muted-foreground">{group.length}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {group.map((member) => (
                    <TeamMemberCard key={member.user_id} member={member} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
