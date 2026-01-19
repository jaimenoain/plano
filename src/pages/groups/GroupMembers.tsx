import { useParams, useOutletContext, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isMobileDevice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserSearch } from "@/components/groups/UserSearch";
import { UserMinus, UserPlus, Link as LinkIcon, Search, ShieldCheck, LogOut, ShieldAlert, Check, X, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FollowButton } from "@/components/FollowButton";
import { Card } from "@/components/ui/card";
import { JoinGroupPrompt } from "@/components/groups/JoinGroupPrompt";

export default function GroupMembers() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { group, isAdmin, isMember } = useOutletContext<{ group: any; isAdmin: boolean; isMember: boolean }>();

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  if (!isMember) {
    return <JoinGroupPrompt group={group} />;
  }

  const handleLeaveGroup = async () => {
    if (!confirm("Are you sure you want to leave this group?")) return;
    try {
      // Find my member ID
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const myMemberRecord = group.members?.find((m: any) => m.user.id === user?.id);
      if (!myMemberRecord) throw new Error("Membership not found");

      // Notify admins
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const admins = group.members?.filter((m: any) => m.role === 'admin' && m.user.id !== user?.id) || [];
      if (admins.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const notifications = admins.map((admin: any) => ({
          user_id: admin.user.id,
          actor_id: user?.id,
          type: 'group_activity',
          is_read: false,
          group_id: group.id,
        }));
        // We use 'group_activity' type which requires a schema update.
        // Assuming the SQL script was run or will be run.
        await supabase.from("notifications").insert(notifications);
      }

      const { error, count } = await supabase
        .from("group_members")
        .delete({ count: 'exact' })
        .eq("id", myMemberRecord.id);

      if (error) throw error;
      if (count === 0) throw new Error("Could not leave group.");

      toast({ title: "You left the group" });
      navigate("/groups");
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleDemoteSelf = async () => {
    if (!confirm("Are you sure? You will have to be appointed by another admin if you want to become an admin again.")) return;
    try {
       // Find my member ID
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const myMemberRecord = group.members?.find((m: any) => m.user.id === user?.id);
      if (!myMemberRecord) throw new Error("Membership not found");

      const { error, count } = await supabase
        .from("group_members")
        .update({ role: 'member' }, { count: 'exact' })
        .eq("id", myMemberRecord.id);

      if (error) throw error;
      if (count === 0) throw new Error("Could not update role.");

      toast({ title: "You are no longer an admin" });
      queryClient.invalidateQueries({ queryKey: ["group-basic", slug] });
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleAddMember = async (targetId: string, username: string) => {
    try {
      // 1. Add member to group
      const { error: memberError } = await supabase
        .from("group_members")
        .insert({ group_id: group.id, user_id: targetId, role: 'member', status: 'active' });
      
      if (memberError) throw memberError;

      // 2. Send notification (check for duplicates first)
      // Check if a similar notification was created in the last 10 seconds
      const { data: existingNotif } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", targetId)
        .eq("group_id", group.id)
        .eq("type", "group_invitation")
        .gt("created_at", new Date(Date.now() - 10000).toISOString())
        .maybeSingle();

      if (!existingNotif) {
        await supabase.from("notifications").insert({
          user_id: targetId,
          actor_id: user!.id,
          type: 'group_invitation',
          is_read: false,
          group_id: group.id,
        });
      }

      toast({ title: "Member added", description: `${username} joined.` });
      queryClient.invalidateQueries({ queryKey: ["group-basic", slug] });
      setIsAddMemberOpen(false);
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Remove this member from the group?")) return;
    try {
      // UPDATED: Using ID (PK) instead of group_id + user_id
      const { error, count } = await supabase
        .from("group_members")
        .delete({ count: 'exact' })
        .eq("id", memberId);

      if (error) throw error;
      if (count === 0) throw new Error("Could not remove member. You may not have permission.");

      toast({ title: "Member removed" });
      queryClient.invalidateQueries({ queryKey: ["group-basic", slug] });
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleMakeAdmin = async (memberId: string) => {
    if (!confirm("Promote this member to Admin?")) return;
    try {
      // UPDATED: Using ID (PK) instead of group_id + user_id
      const { error, count } = await supabase
        .from("group_members")
        .update({ role: 'admin' }, { count: 'exact' })
        .eq("id", memberId);

      if (error) throw error;
      if (count === 0) throw new Error("Could not promote member. You may not have permission.");

      toast({ title: "Member promoted to Admin" });
      queryClient.invalidateQueries({ queryKey: ["group-basic", slug] });
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleRemoveAdmin = async (memberId: string) => {
    if (!confirm("Demote this Admin back to member?")) return;
    try {
      const { error, count } = await supabase
        .from("group_members")
        .update({ role: 'member' }, { count: 'exact' })
        .eq("id", memberId);

      if (error) throw error;
      if (count === 0) throw new Error("Could not demote admin. You may not have permission.");

      toast({ title: "Admin demoted to member" });
      queryClient.invalidateQueries({ queryKey: ["group-basic", slug] });
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleCopyLink = () => {
    const url = `https://cineforum.eu/groups/${slug}`;
    if (isMobileDevice() && navigator.share) {
        navigator.share({
            title: `Join ${group.name}`,
            text: `You are invited to the ${group.name} group on CineForum`,
            url: url
        }).catch(console.error);
    } else {
        navigator.clipboard.writeText(url);
        toast({ title: "Link copied to clipboard" });
    }
  };

  const handleAcceptRequest = async (memberId: string, username: string) => {
    try {
        const { error } = await supabase.from("group_members").update({ status: 'active' }).eq('id', memberId);
        if (error) throw error;
        toast({ title: "Request Accepted", description: `${username} is now a member.`});
        queryClient.invalidateQueries({ queryKey: ["group-basic", slug] });
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleDeclineRequest = async (memberId: string) => {
    if (!confirm("Decline this request? The user will have to request again.")) return;
    try {
        const { error } = await supabase.from("group_members").delete().eq('id', memberId);
        if (error) throw error;
        toast({ title: "Request Declined" });
        queryClient.invalidateQueries({ queryKey: ["group-basic", slug] });
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendingRequests = group.members?.filter((m: any) => m.status === 'pending') || [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filteredMembers = (group.members?.filter((m: any) =>
    m.status !== 'pending' &&
    m.user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []).sort((a: any, b: any) => {
    // Sort logic: Admin first
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (a.role !== 'admin' && b.role === 'admin') return 1;
    return 0;
  });

  return (
    <div className="space-y-6 animate-in fade-in">
      {isAdmin && pendingRequests.length > 0 && (
          <div className="space-y-3 mb-8">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" />
                  Pending Requests ({pendingRequests.length})
              </h2>
              <div className="grid grid-cols-1 gap-3">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {pendingRequests.map((req: any) => (
                      <Card key={req.id} className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-muted/30">
                          <div className="flex items-start gap-3">
                              <Avatar className="h-10 w-10 border border-border">
                                  <AvatarImage src={req.user.avatar_url} />
                                  <AvatarFallback>{req.user.username?.[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                  <div className="font-semibold text-base cursor-pointer hover:underline" onClick={() => navigate(`/profile/${req.user.username}`)}>
                                      {req.user.username}
                                  </div>
                                  {req.note ? (
                                      <p className="text-sm text-muted-foreground mt-1 italic">"{req.note}"</p>
                                  ) : (
                                      <p className="text-xs text-muted-foreground mt-1">No note provided</p>
                                  )}
                              </div>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                              <Button size="sm" variant="default" className="flex-1 sm:flex-none" onClick={() => handleAcceptRequest(req.id, req.user.username)}>
                                  <Check className="mr-1 h-4 w-4" /> Accept
                              </Button>
                              <Button size="sm" variant="outline" className="flex-1 sm:flex-none hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30" onClick={() => handleDeclineRequest(req.id)}>
                                  <X className="mr-1 h-4 w-4" /> Decline
                              </Button>
                          </div>
                      </Card>
                  ))}
              </div>
          </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:w-72">
           <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
           <Input
             placeholder="Search members..."
             className="pl-9"
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
           />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleLeaveGroup} className="shrink-0">
             <LogOut className="mr-2 h-4 w-4" /> Leave
          </Button>

          {isAdmin && (
            <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
              <DialogTrigger asChild>
                <Button className="shrink-0">
                    <UserPlus className="mr-2 h-4 w-4" /> Add Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Member</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 pt-4">
                   <div className="space-y-2">
                     <p className="text-sm font-medium text-muted-foreground">Invite by username</p>
                     {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                     <UserSearch onSelect={handleAddMember} excludeIds={group.members?.map((m: any) => m.user.id)} />
                   </div>

                   <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or share link</span>
                      </div>
                    </div>

                    <Button variant="outline" className="w-full" onClick={handleCopyLink}>
                        <LinkIcon className="mr-2 h-4 w-4" /> Invite via Link
                    </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {filteredMembers.map((m: any) => (
          <div key={m.user.id} className="group flex items-center justify-between p-4 bg-card border rounded-xl hover:shadow-sm transition-all">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${m.user.username}`)}>
              <Avatar className="h-10 w-10 border border-border">
                <AvatarImage src={m.user.avatar_url} />
                <AvatarFallback>{m.user.username?.[0]}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{m.user.username}</span>
                    {m.role === 'admin' && (
                        <ShieldCheck className="h-3 w-3 text-primary fill-primary/20" />
                    )}
                </div>
                <p className="text-xs text-muted-foreground">Joined {new Date(m.joined_at || Date.now()).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              {m.user.id !== user?.id && (
                  <FollowButton userId={m.user.id} className="h-8 px-2" />
              )}

              <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                {isAdmin && m.user.id !== user?.id && (
                  <>
                    {m.role !== 'admin' ? (
                        <Button
                            variant="ghost"
                            size="icon"
                            title="Promote to Admin"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            // UPDATED: Passing m.id instead of m.user.id
                            onClick={() => handleMakeAdmin(m.id)}
                        >
                            <ShieldCheck className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            variant="ghost"
                            size="icon"
                            title="Demote to Member"
                            className="h-8 w-8 text-muted-foreground hover:text-orange-500"
                            onClick={() => handleRemoveAdmin(m.id)}
                        >
                            <ShieldAlert className="h-4 w-4" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        title="Remove Member"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        // UPDATED: Passing m.id instead of m.user.id
                        onClick={() => handleRemoveMember(m.id)}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {/* Self-admin demotion */}
                {m.user.id === user?.id && m.role === 'admin' && (
                    <Button
                        variant="ghost"
                        size="icon"
                        title="Remove Admin Role"
                        className="h-8 w-8 text-muted-foreground hover:text-orange-500"
                        onClick={handleDemoteSelf}
                    >
                      <ShieldAlert className="h-4 w-4" />
                    </Button>
                )}
              </div>
            </div>
          </div>
        ))}
        {filteredMembers.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
                No members found matching "{searchQuery}"
            </div>
        )}
      </div>
    </div>
  );
}
