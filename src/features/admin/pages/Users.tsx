import { useState, useEffect, useCallback } from "react";
import { Link, type MetaFunction } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Ban, RefreshCw, UserX, Shield, Crown, Building2, ExternalLink, Camera, PenLine, Star } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { fetchUserChapterActivity, type ChapterActivityRow } from "@/features/admin/api/ambassadorCoverage";

interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  role: string | null;
  created_at: string;
}

interface UserMembership {
  id: string;
  role: string;
  exco_responsibility: string | null;
  status: string;
  joined_at: string;
  chapter: {
    id: string;
    name: string;
    type: string;
    country_code: string;
    status: string;
  } | null;
}

interface UserDetail {
  membership: UserMembership | null;
  creditsCount: number;
  chapterActivity: ChapterActivityRow | null;
}

const EXCO_LABEL: Record<string, string> = {
  content: "Content",
  marketing: "Marketing",
  architect_relations: "Architect relations",
  data_quality: "Data quality",
  community: "Community",
};

export const meta: MetaFunction = () => [{ title: "Admin Users | Plano" }];

export default function Users() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [actionUser, setActionUser] = useState<{ type: "reset" | "suspend"; user: Profile } | null>(null);

  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentAdminId(data.user?.id ?? null);
    });
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (searchQuery) query = query.ilike("username", `%${searchQuery}%`);

      const from = (page - 1) * ITEMS_PER_PAGE;
      const { data, count, error } = await query.range(from, from + ITEMS_PER_PAGE - 1);
      if (error) throw error;
      setUsers((data as Profile[]) ?? []);
      setTotalPages(count ? Math.ceil(count / ITEMS_PER_PAGE) : 1);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);

  const loadUserDetail = useCallback(async (userId: string) => {
    setDetailLoading(true);
    setUserDetail(null);
    try {
      const [membershipRes, creditsRes] = await Promise.all([
        supabase
          .from("ambassador_memberships")
          .select(`
            id, role, exco_responsibility, status, joined_at,
            chapter:ambassador_chapters!ambassador_memberships_chapter_id_fkey(id, name, type, country_code, status)
          `)
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("building_credits")
          .select("id", { count: "exact", head: true })
          .eq("added_by_user_id", userId),
      ]);

      const rawMem = membershipRes.data as (typeof membershipRes.data & {
        chapter: UserMembership["chapter"];
      }) | null;

      const membership: UserMembership | null = rawMem
        ? {
            id: rawMem.id,
            role: rawMem.role,
            exco_responsibility: rawMem.exco_responsibility,
            status: rawMem.status,
            joined_at: rawMem.joined_at,
            chapter: rawMem.chapter ?? null,
          }
        : null;

      // Fetch per-user chapter activity if member of a chapter
      const chapterActivity = membership?.chapter?.id
        ? await fetchUserChapterActivity(membership.chapter.id, userId)
        : null;

      setUserDetail({
        membership,
        creditsCount: creditsRes.count ?? 0,
        chapterActivity,
      });
    } catch {
      toast.error("Could not load user details");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedUser) void loadUserDetail(selectedUser.id);
    else setUserDetail(null);
  }, [selectedUser, loadUserDetail]);

  const handleAction = async () => {
    if (!actionUser || !currentAdminId) return;
    try {
      if (actionUser.type === "reset") {
        const genericUsername = `User${actionUser.user.id.substring(0, 8)}`;
        const { error } = await supabase
          .from("profiles")
          .update({ username: genericUsername, avatar_url: null })
          .eq("id", actionUser.user.id);
        if (error) throw error;
        await supabase.from("admin_audit_logs").insert({
          admin_id: currentAdminId,
          action_type: "reset_profile",
          target_type: "user",
          target_id: actionUser.user.id,
          details: { username: actionUser.user.username },
        });
        toast.success("Profile reset successfully");
        setUsers((prev) =>
          prev.map((u) =>
            u.id === actionUser.user.id ? { ...u, username: genericUsername, avatar_url: null } : u,
          ),
        );
      } else {
        const newRole = actionUser.user.role === "suspended" ? "user" : "suspended";
        const { error } = await supabase
          .from("profiles")
          .update({ role: newRole })
          .eq("id", actionUser.user.id);
        if (error) throw error;
        await supabase.from("admin_audit_logs").insert({
          admin_id: currentAdminId,
          action_type: newRole === "suspended" ? "suspend_user" : "restore_user",
          target_type: "user",
          target_id: actionUser.user.id,
          details: { username: actionUser.user.username, previous_role: actionUser.user.role },
        });
        toast.success(newRole === "suspended" ? "User suspended" : "User restored");
        setUsers((prev) =>
          prev.map((u) => (u.id === actionUser.user.id ? { ...u, role: newRole } : u)),
        );
      }
    } catch {
      toast.error("Action failed");
    } finally {
      setActionUser(null);
    }
  };

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">User Roster</h1>
        <Input
          placeholder="Search users..."
          className="max-w-xs"
          value={searchQuery}
          onChange={(e) => { setPage(1); setSearchQuery(e.target.value); }}
        />
      </div>

      <div className="rounded-sm border border-border-default bg-surface-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-text-secondary">
                  <div className="flex justify-center items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Loading...
                  </div>
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-text-secondary">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow
                  key={user.id}
                  className={`cursor-pointer ${user.role === "suspended" ? "opacity-60 bg-feedback-destructive/5" : ""}`}
                  onClick={() => setSelectedUser(user)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border border-border-default">
                        <AvatarImage src={user.avatar_url ?? undefined} />
                        <AvatarFallback>{user.username?.charAt(0).toUpperCase() ?? "?"}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{user.username ?? "Unknown"}</span>
                        <span className="text-xs text-text-secondary font-mono">{user.id}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.role === "admin" || user.role === "app_admin"
                          ? "default"
                          : user.role === "suspended"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {user.role ?? "User"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.created_at ? format(new Date(user.created_at), "MMM d, yyyy") : "-"}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Reset Profile"
                        onClick={() => setActionUser({ type: "reset", user })}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={user.role === "suspended" ? "text-feedback-success" : "text-feedback-destructive"}
                        title={user.role === "suspended" ? "Restore Access" : "Suspend User"}
                        onClick={() => setActionUser({ type: "suspend", user })}
                      >
                        {user.role === "suspended" ? <UserX className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-center gap-2">
        <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </Button>
        <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          Next
        </Button>
      </div>

      {/* User detail sheet */}
      <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selectedUser && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border border-border-default">
                    <AvatarImage src={selectedUser.avatar_url ?? undefined} />
                    <AvatarFallback className="text-lg">
                      {selectedUser.username?.charAt(0).toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle className="text-lg">{selectedUser.username ?? "Unknown"}</SheetTitle>
                    <p className="text-xs text-text-secondary font-mono mt-0.5">{selectedUser.id}</p>
                  </div>
                </div>
              </SheetHeader>

              <div className="space-y-6">
                {/* Basic info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-0.5">
                    <p className="text-2xs text-text-disabled uppercase tracking-widest">Role</p>
                    <Badge
                      variant={
                        selectedUser.role === "admin" || selectedUser.role === "app_admin"
                          ? "default"
                          : selectedUser.role === "suspended"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {selectedUser.role ?? "User"}
                    </Badge>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-2xs text-text-disabled uppercase tracking-widest">Joined</p>
                    <p className="text-text-primary">
                      {selectedUser.created_at
                        ? format(new Date(selectedUser.created_at), "MMM d, yyyy")
                        : "—"}
                    </p>
                  </div>
                </div>

                <hr className="border-border-default" />

                {/* Ambassador section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    <Shield className="h-4 w-4 text-text-secondary" />
                    Ambassador membership
                  </h3>
                  {detailLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-text-disabled" />
                    </div>
                  ) : userDetail?.membership ? (
                    <div className="rounded-sm border border-border-default bg-surface-card p-3 space-y-3">
                      {userDetail.membership.chapter && (
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-medium text-sm text-text-primary">
                              {userDetail.membership.chapter.name}
                            </p>
                            <p className="text-xs text-text-secondary capitalize">
                              {userDetail.membership.chapter.type} · {userDetail.membership.chapter.country_code}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="capitalize text-2xs">
                              {userDetail.membership.chapter.status}
                            </Badge>
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/admin/ambassadors/${userDetail.membership.chapter.id}`}>
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="space-y-0.5">
                          <p className="text-2xs text-text-disabled uppercase tracking-widest">Role</p>
                          <p className="flex items-center gap-1 text-text-primary capitalize">
                            {userDetail.membership.role === "president" && (
                              <Crown className="h-3.5 w-3.5 text-text-secondary" />
                            )}
                            {userDetail.membership.role}
                          </p>
                        </div>
                        {userDetail.membership.role === "exco" && userDetail.membership.exco_responsibility && (
                          <div className="space-y-0.5">
                            <p className="text-2xs text-text-disabled uppercase tracking-widest">ExCo area</p>
                            <p className="text-text-primary">
                              {EXCO_LABEL[userDetail.membership.exco_responsibility] ?? userDetail.membership.exco_responsibility}
                            </p>
                          </div>
                        )}
                        <div className="space-y-0.5">
                          <p className="text-2xs text-text-disabled uppercase tracking-widest">Status</p>
                          <Badge variant="secondary" className="capitalize text-2xs">
                            {userDetail.membership.status}
                          </Badge>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-2xs text-text-disabled uppercase tracking-widest">Joined chapter</p>
                          <p className="text-text-primary">
                            {format(new Date(userDetail.membership.joined_at), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-text-secondary">Not an ambassador.</p>
                  )}
                </div>

                <hr className="border-border-default" />

                {/* Contributions */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-text-secondary" />
                    Contributions
                  </h3>
                  {detailLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-text-disabled" />
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-sm border border-border-default bg-surface-card p-3 space-y-1">
                          <p className="text-2xs text-text-disabled uppercase tracking-widest flex items-center gap-1">
                            <Star className="h-3 w-3" />Credits
                          </p>
                          <p className="text-xl font-semibold text-text-primary tabular-nums">
                            {userDetail?.creditsCount ?? 0}
                          </p>
                          <p className="text-2xs text-text-disabled">all time</p>
                        </div>
                        <div className="rounded-sm border border-border-default bg-surface-card p-3 space-y-1">
                          <p className="text-2xs text-text-disabled uppercase tracking-widest flex items-center gap-1">
                            <Camera className="h-3 w-3" />Photos
                          </p>
                          <p className="text-xl font-semibold text-text-primary tabular-nums">
                            {userDetail?.chapterActivity?.photos_added ?? "—"}
                          </p>
                          <p className="text-2xs text-text-disabled">30 days</p>
                        </div>
                        <div className="rounded-sm border border-border-default bg-surface-card p-3 space-y-1">
                          <p className="text-2xs text-text-disabled uppercase tracking-widest flex items-center gap-1">
                            <PenLine className="h-3 w-3" />Edits
                          </p>
                          <p className="text-xl font-semibold text-text-primary tabular-nums">
                            {userDetail?.chapterActivity?.edits_count ?? "—"}
                          </p>
                          <p className="text-2xs text-text-disabled">30 days</p>
                        </div>
                      </div>
                      {userDetail?.chapterActivity?.last_active_at && (
                        <p className="text-xs text-text-secondary">
                          Last active: {format(new Date(userDetail.chapterActivity.last_active_at), "MMM d, yyyy")}
                        </p>
                      )}
                      {userDetail?.membership && !userDetail.chapterActivity && (
                        <p className="text-xs text-text-secondary">No chapter activity in the last 30 days.</p>
                      )}
                    </>
                  )}
                </div>

                <hr className="border-border-default" />

                {/* Quick actions */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-text-primary">Actions</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setActionUser({ type: "reset", user: selectedUser });
                        setSelectedUser(null);
                      }}
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      Reset profile
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={selectedUser.role === "suspended" ? "text-feedback-success" : "text-feedback-destructive"}
                      onClick={() => {
                        setActionUser({ type: "suspend", user: selectedUser });
                        setSelectedUser(null);
                      }}
                    >
                      {selectedUser.role === "suspended" ? (
                        <><UserX className="h-3.5 w-3.5 mr-1.5" />Restore access</>
                      ) : (
                        <><Ban className="h-3.5 w-3.5 mr-1.5" />Suspend user</>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!actionUser} onOpenChange={(open) => !open && setActionUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {actionUser?.type === "reset"
                ? `This will reset the username and avatar for ${actionUser.user.username}.`
                : actionUser?.user.role === "suspended"
                  ? `This will restore access for ${actionUser.user.username}.`
                  : `This will suspend ${actionUser?.user.username} and revoke their access.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleAction()}
              className={actionUser?.type === "reset" ? "" : "bg-feedback-destructive hover:bg-feedback-destructive/90"}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
