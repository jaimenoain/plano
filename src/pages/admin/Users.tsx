import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Ban, RefreshCw, UserX } from "lucide-react";
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

interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  role: string | null;
  created_at: string;
}

export default function Users() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const [actionUser, setActionUser] = useState<{ type: 'reset' | 'suspend', user: Profile } | null>(null);

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    fetchUsers();
  }, [page, searchQuery]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.ilike("username", `%${searchQuery}%`);
      }

      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, count, error } = await query.range(from, to);

      if (error) throw error;

      setUsers((data as Profile[]) || []);
      if (count) {
        setTotalPages(Math.ceil(count / ITEMS_PER_PAGE));
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!actionUser) return;

    try {
      if (actionUser.type === 'reset') {
        const genericUsername = `User${actionUser.user.id.substring(0, 8)}`;
        const { error } = await supabase
          .from('profiles')
          .update({ username: genericUsername, avatar_url: null })
          .eq('id', actionUser.user.id);

        if (error) throw error;
        toast.success("Profile reset successfully");
        setUsers(prev => prev.map(u => u.id === actionUser.user.id ? { ...u, username: genericUsername, avatar_url: null } : u));
      } else if (actionUser.type === 'suspend') {
        const newRole = actionUser.user.role === 'suspended' ? 'user' : 'suspended';

        const { error } = await supabase
          .from('profiles')
          .update({ role: newRole })
          .eq('id', actionUser.user.id);

        if (error) throw error;
        toast.success(newRole === 'suspended' ? "User suspended" : "User restored");
        setUsers(prev => prev.map(u => u.id === actionUser.user.id ? { ...u, role: newRole } : u));
      }
    } catch (error) {
      console.error(error);
      toast.error("Action failed");
    } finally {
      setActionUser(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">User Roster</h1>
        <Input
          placeholder="Search users..."
          className="max-w-xs"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="rounded-md border bg-card">
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
                <TableCell colSpan={4} className="h-24 text-center">
                  <div className="flex justify-center items-center">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Loading...
                  </div>
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className={user.role === 'suspended' ? "opacity-60 bg-red-500/5" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>{user.username?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.username || "Unknown"}</span>
                        <span className="text-xs text-muted-foreground">{user.id}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' || user.role === 'app_admin' ? "default" : user.role === 'suspended' ? "destructive" : "secondary"}>
                      {user.role || "User"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.created_at ? format(new Date(user.created_at), "MMM d, yyyy") : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Reset Profile"
                        onClick={() => setActionUser({ type: 'reset', user })}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={user.role === 'suspended' ? "text-green-600" : "text-destructive"}
                        title={user.role === 'suspended' ? "Restore Access" : "Suspend User"}
                        onClick={() => setActionUser({ type: 'suspend', user })}
                      >
                         {user.role === 'suspended' ? <UserX className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
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
        <Button
          variant="outline"
          disabled={page === 1}
          onClick={() => setPage(p => p - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => setPage(p => p + 1)}
        >
          Next
        </Button>
      </div>

      <AlertDialog open={!!actionUser} onOpenChange={(open) => !open && setActionUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {actionUser?.type === 'reset'
                ? `This will reset the username and avatar for ${actionUser.user.username}.`
                : actionUser?.user.role === 'suspended'
                  ? `This will restore access for ${actionUser.user.username}.`
                  : `This will suspend ${actionUser?.user.username} and revoke their access.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction} className={actionUser?.type === 'reset' ? "" : "bg-destructive hover:bg-destructive/90"}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
