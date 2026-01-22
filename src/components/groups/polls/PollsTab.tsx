
import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, BarChart2 } from "lucide-react";
import { PollDialog } from "./PollDialog";
import { PollList } from "./PollList";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { JoinGroupPrompt } from "@/components/groups/JoinGroupPrompt";
import { supabase } from "@/integrations/supabase/client";

export default function PollsTab() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { group, isAdmin, isMember } = useOutletContext<{ group: any; isAdmin: boolean; isMember: boolean }>();
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const queryClient = useQueryClient();

  // Realtime subscription for poll updates
  useEffect(() => {
    const channel = supabase
      .channel('poll-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'polls',
          filter: `group_id=eq.${group.id}`,
        },
        () => {
            // Invalidate queries to refresh data and counts
            queryClient.invalidateQueries({ queryKey: ["polls", group.id] });
            queryClient.invalidateQueries({ queryKey: ["polls-count", group.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [group.id, queryClient]);

  // Fetch all polls to calculate counts
  const { data: allPolls } = useQuery({
    queryKey: ["polls-count", group.id, refreshKey], // Keep refreshKey for manual triggers
    queryFn: async () => {
      const { data, error } = await supabase
        .from("polls")
        .select("status")
        .eq("group_id", group.id);

      if (error) throw error;
      return data;
    },
    enabled: !!group.id && isAdmin
  });

  const activeCount = allPolls?.filter(p => ['live', 'open', 'published'].includes(p.status)).length || 0;
  const draftCount = allPolls?.filter(p => p.status === 'draft').length || 0;

  const handlePollCreated = () => {
    setRefreshKey(prev => prev + 1);
    // Also invalidate global poll query
    queryClient.invalidateQueries({ queryKey: ["polls", group.id] });
    queryClient.invalidateQueries({ queryKey: ["polls-count", group.id] });
  };

  const ActivePollsEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 space-y-6 text-center border-2 border-dashed rounded-xl border-muted bg-muted/5">
        <div className="p-5 bg-background rounded-full shadow-sm">
            <BarChart2 className="w-10 h-10 text-muted-foreground/50" />
        </div>
        <div className="space-y-2 max-w-sm px-4">
            <h3 className="text-xl font-semibold tracking-tight">Make your group fun and engaging!</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
                Create a poll to decide the next visit, run a trivia quiz, or simply gauge preferences.
            </p>
        </div>
        {isAdmin && user && (
             <PollDialog
                groupId={group.id}
                userId={user.id}
                onPollCreated={handlePollCreated}
                trigger={
                  <Button size="lg" className="shadow-sm">
                    <Plus className="w-5 h-5 mr-2" /> Create First Poll
                  </Button>
                }
              />
        )}
    </div>
  );

  if (!isMember) {
    return <JoinGroupPrompt group={group} />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold tracking-tight">Polls</h2>
            <p className="text-muted-foreground">Vote on group decisions and fun topics.</p>
        </div>
        {isAdmin && user && (
          <PollDialog
            groupId={group.id}
            userId={user.id}
            onPollCreated={handlePollCreated}
            trigger={
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" /> Add Poll
              </Button>
            }
          />
        )}
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent space-x-6">
          <TabsTrigger
            value="active"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2"
          >
            Active Polls {isAdmin && activeCount > 0 && `(${activeCount})`}
          </TabsTrigger>
          <TabsTrigger
            value="past"
             className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2"
          >
            Past Polls
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger
              value="drafts"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-2"
            >
              Drafts {draftCount > 0 && `(${draftCount})`}
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="active" className="mt-6 flex flex-col gap-6">
            <PollList
                groupId={group.id}
                groupSlug={group.slug}
                isAdmin={isAdmin}
                statuses={["live", "open", "published"]}
                key={`active-${refreshKey}`}
                emptyState={<ActivePollsEmptyState />}
                excludeSessions={true}
            />
        </TabsContent>
        <TabsContent value="past" className="mt-6">
            <PollList
                groupId={group.id}
                groupSlug={group.slug}
                isAdmin={isAdmin}
                statuses={["closed"]}
                key={`past-${refreshKey}`}
            />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="drafts" className="mt-6">
            <PollList
              groupId={group.id}
              groupSlug={group.slug}
              isAdmin={isAdmin}
              statuses={["draft"]}
              key={`drafts-${refreshKey}`}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
