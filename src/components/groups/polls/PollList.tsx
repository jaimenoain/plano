
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PollCard } from "./PollCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ReactNode } from "react";

interface PollListProps {
  groupId: string;
  groupSlug: string;
  isAdmin: boolean;
  statuses?: string[];
  status?: string; // Deprecated, keep for backward compat if needed, but prefer statuses
  hideEmptyMessage?: boolean;
  emptyState?: ReactNode;
  excludeSessions?: boolean;
}

export function PollList({ groupId, groupSlug, isAdmin, status, statuses, hideEmptyMessage = false, emptyState, excludeSessions = false }: PollListProps) {
  // Normalize statuses
  const queryStatuses = statuses || (status ? [status] : []);

  const { data: polls, isLoading } = useQuery({
    queryKey: ["polls", groupId, queryStatuses, excludeSessions],
    queryFn: async () => {
      let query = supabase
        .from("polls")
        .select(`
          *,
          questions:poll_questions(
            *,
            options:poll_options(*)
          ),
          votes:poll_votes(*),
          session:group_sessions(id, title, status)
        `)
        .eq("group_id", groupId)
        .order("created_at", { ascending: false });

      if (queryStatuses.length > 0) {
        query = query.in("status", queryStatuses);
      }

      if (excludeSessions) {
        query = query.is("session_id", null);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Sort questions by order_index
      const pollsWithSortedQuestions = data.map(poll => ({
          ...poll,
          questions: poll.questions.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
      }));

      return pollsWithSortedQuestions;
    },
    enabled: queryStatuses.length > 0
  });

  if (isLoading) {
    return <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
    </div>;
  }

  if (!polls || polls.length === 0) {
    if (hideEmptyMessage) return null;
    if (emptyState) return <>{emptyState}</>;
    return <div className="text-center py-10 text-muted-foreground">No polls found.</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {polls.map((poll) => (
        <PollCard key={poll.id} poll={poll} groupSlug={groupSlug} isAdmin={isAdmin} />
      ))}
    </div>
  );
}
