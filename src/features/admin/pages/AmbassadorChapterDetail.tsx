import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, type MetaFunction } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Loader2, ArrowLeft, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";
import {
  ambassadorAddMemberSchema,
  ambassadorChapterCreateSchema,
  ambassadorMembershipUpdateSchema,
  type AmbassadorChapterCreateInput,
} from "@/lib/validations/ambassador";

export const meta: MetaFunction = () => [
  { title: "Chapter detail | Plano Admin" },
  { name: "robots", content: "noindex, nofollow" },
];

type ChapterRow = Database["public"]["Tables"]["ambassador_chapters"]["Row"];
type MembershipRow = Database["public"]["Tables"]["ambassador_memberships"]["Row"];

type MemberWithProfile = MembershipRow & {
  member_profile: { id: string; username: string | null; avatar_url: string | null } | null;
  inviter: { id: string; username: string | null } | null;
};

export default function AmbassadorChapterDetail() {
  const { chapterId } = useParams();
  const { user: currentUser } = useAuth();
  const [chapter, setChapter] = useState<ChapterRow | null>(null);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingChapter, setSavingChapter] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userHits, setUserHits] = useState<
    { id: string; username: string | null }[]
  >([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [addRole, setAddRole] = useState<"president" | "exco" | "ambassador">("ambassador");
  const [addExco, setAddExco] = useState<
    "content" | "marketing" | "architect_relations" | "data_quality" | "community"
  >("content");
  const [adding, setAdding] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<MemberWithProfile | null>(null);
  const [chapterDraft, setChapterDraft] = useState<Partial<AmbassadorChapterCreateInput> | null>(
    null,
  );

  const load = useCallback(async () => {
    if (!chapterId) return;
    
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chapterId);
    if (!isUuid) {
      console.error("Invalid chapter ID format:", chapterId);
      setChapter(null);
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: ch, error: cErr } = await supabase
        .from("ambassador_chapters")
        .select("*")
        .eq("id", chapterId)
        .maybeSingle();
      if (cErr) throw cErr;
      if (!ch) {
        setChapter(null);
        setMembers([]);
        return;
      }
      setChapter(ch);
      setChapterDraft({
        name: ch.name,
        type: ch.type as AmbassadorChapterCreateInput["type"],
        country_code: ch.country_code,
        locality_id: ch.locality_id,
        parent_chapter_id: ch.parent_chapter_id,
        max_ambassadors: ch.max_ambassadors,
        status: ch.status as AmbassadorChapterCreateInput["status"],
      });
      const { data: mems, error: mErr } = await supabase
        .from("ambassador_memberships")
        .select(
          `
          *,
          member_profile:profiles!ambassador_memberships_user_id_fkey(id, username, avatar_url),
          inviter:profiles!ambassador_memberships_invited_by_fkey(id, username)
        `,
        )
        .eq("chapter_id", chapterId)
        .order("joined_at", { ascending: false });
      if (mErr) throw mErr;
      const raw = (mems ?? []) as MemberWithProfile[];
      setMembers(raw);
    } catch (err: any) {
      console.error("Failed to load chapter:", err);
      const message = err?.message || (typeof err === "string" ? err : "Failed to load chapter");
      toast.error(message);
      setChapter(null);
    } finally {
      setLoading(false);
    }
  }, [chapterId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const q = userSearch.trim();
    if (q.length < 2) {
      setUserHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      void (async () => {
        const safe = q.replace(/%/g, "").slice(0, 64);
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username")
          .ilike("username", `%${safe}%`)
          .limit(15);
        if (error) {
          setUserHits([]);
          return;
        }
        setUserHits(data ?? []);
      })();
    }, 250);
    return () => window.clearTimeout(t);
  }, [userSearch]);

  const saveChapter = async () => {
    if (!chapterId || !chapterDraft) return;
    const parsed = ambassadorChapterCreateSchema.safeParse({
      name: chapterDraft.name ?? "",
      type: chapterDraft.type ?? "national",
      country_code: chapterDraft.country_code ?? "",
      locality_id: chapterDraft.locality_id ?? null,
      parent_chapter_id: chapterDraft.parent_chapter_id ?? null,
      max_ambassadors: chapterDraft.max_ambassadors ?? 20,
      status: chapterDraft.status ?? "active",
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid chapter");
      return;
    }
    setSavingChapter(true);
    try {
      const { error } = await supabase
        .from("ambassador_chapters")
        .update({
          name: parsed.data.name,
          type: parsed.data.type,
          country_code: parsed.data.country_code,
          locality_id: parsed.data.locality_id,
          parent_chapter_id: parsed.data.parent_chapter_id,
          max_ambassadors: parsed.data.max_ambassadors,
          status: parsed.data.status,
        })
        .eq("id", chapterId);
      if (error) throw error;
      toast.success("Chapter saved");
      await load();
    } catch {
      toast.error("Could not save chapter");
    } finally {
      setSavingChapter(false);
    }
  };

  const saveMemberRow = async (memberId: string) => {
    const m = members.find((x) => x.id === memberId);
    if (!m) return;
    const parsed = ambassadorMembershipUpdateSchema.safeParse({
      role: m.role,
      exco_responsibility: m.exco_responsibility,
      status: m.status,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid membership");
      return;
    }
    const nextRole = parsed.data.role ?? m.role;
    try {
      const { error } = await supabase
        .from("ambassador_memberships")
        .update({
          role: nextRole,
          exco_responsibility:
            nextRole === "exco"
              ? parsed.data.exco_responsibility ?? m.exco_responsibility
              : null,
          status: parsed.data.status ?? m.status,
        })
        .eq("id", m.id);
      if (error) throw error;
      toast.success("Member updated");
      await load();
    } catch {
      toast.error("Could not update member");
    }
  };

  const addMember = async () => {
    if (!chapterId || !selectedUserId) {
      toast.error("Select a user");
      return;
    }
    const parsed = ambassadorAddMemberSchema.safeParse({
      user_id: selectedUserId,
      role: addRole,
      exco_responsibility: addRole === "exco" ? addExco : null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid");
      return;
    }
    setAdding(true);
    try {
      const { error } = await supabase.from("ambassador_memberships").insert({
        chapter_id: chapterId,
        user_id: parsed.data.user_id,
        role: parsed.data.role,
        exco_responsibility: parsed.data.exco_responsibility,
        status: "active",
        invited_by: currentUser?.id ?? null,
      });
      if (error) {
        if (error.code === "23505") {
          toast.error("That user already belongs to a chapter");
        } else {
          throw error;
        }
        return;
      }
      toast.success("Member added");
      setAddOpen(false);
      setUserSearch("");
      setUserHits([]);
      setSelectedUserId(null);
      await load();
    } catch {
      toast.error("Could not add member");
    } finally {
      setAdding(false);
    }
  };

  const removeMember = async () => {
    if (!removeTarget) return;
    try {
      const { error } = await supabase
        .from("ambassador_memberships")
        .delete()
        .eq("id", removeTarget.id);
      if (error) throw error;
      toast.success("Member removed");
      setRemoveTarget(null);
      await load();
    } catch {
      toast.error("Could not remove member");
    }
  };

  const patchMember = (id: string, patch: Partial<MemberWithProfile>) => {
    setMembers((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  };

  const typeLabel = useMemo(
    () =>
      ({
        local: "Local",
        national: "National",
      }) as const,
    [],
  );

  if (!chapterId) {
    return (
      <p className="text-text-secondary">Missing chapter id.</p>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-text-disabled" />
      </div>
    );
  }

  if (!chapter || !chapterDraft) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link to="/admin/ambassadors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to chapters
          </Link>
        </Button>
        <p className="text-text-secondary">Chapter not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-4xl">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/ambassadors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Chapters
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary flex-1 min-w-0">
          {chapter.name}
        </h1>
        <Badge variant="secondary">{chapter.status}</Badge>
      </div>

      <section className="rounded-lg border border-border-default bg-surface-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Chapter settings</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={chapterDraft.name ?? ""}
              onChange={(e) =>
                setChapterDraft((d) => ({ ...d, name: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={chapterDraft.status ?? "active"}
              onValueChange={(v) =>
                setChapterDraft((d) => ({
                  ...d,
                  status: v as AmbassadorChapterCreateInput["status"],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="forming">Forming</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Input readOnly value={typeLabel[chapter.type as "local" | "national"]} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-cc">Country code</Label>
            <Input
              id="edit-cc"
              value={chapterDraft.country_code ?? ""}
              onChange={(e) =>
                setChapterDraft((d) => ({
                  ...d,
                  country_code: e.target.value.toUpperCase().slice(0, 2),
                }))
              }
              maxLength={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-max">Max ambassadors</Label>
            <Input
              id="edit-max"
              type="number"
              min={1}
              max={500}
              value={chapterDraft.max_ambassadors ?? 20}
              onChange={(e) =>
                setChapterDraft((d) => ({
                  ...d,
                  max_ambassadors: Number.parseInt(e.target.value, 10) || 1,
                }))
              }
            />
          </div>
        </div>
        <Button type="button" disabled={savingChapter} onClick={() => void saveChapter()}>
          {savingChapter ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save chapter"}
        </Button>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-text-primary">Members</h2>
          <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add member
          </Button>
        </div>
        <div className="rounded-lg border border-border-default overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>ExCo area</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[180px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-text-secondary py-10">
                    No members yet.
                  </TableCell>
                </TableRow>
              ) : (
                members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium text-text-primary">
                      <span className="inline-flex flex-wrap items-center gap-2">
                        @{m.member_profile?.username ?? m.user_id.slice(0, 8)}
                        {m.status === "pending_review" ? (
                          <Badge variant="outline" className="text-2xs font-normal">
                            Location review
                          </Badge>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={m.role}
                        onValueChange={(v) =>
                          patchMember(m.id, {
                            role: v as MembershipRow["role"],
                            exco_responsibility:
                              v === "exco" ? m.exco_responsibility ?? "content" : null,
                          })
                        }
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ambassador">Ambassador</SelectItem>
                          <SelectItem value="exco">ExCo</SelectItem>
                          <SelectItem value="president">President</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {m.role === "exco" ? (
                        <Select
                          value={m.exco_responsibility ?? "content"}
                          onValueChange={(v) =>
                            patchMember(m.id, {
                              exco_responsibility: v as NonNullable<
                                MembershipRow["exco_responsibility"]
                              >,
                            })
                          }
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="content">Content</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                            <SelectItem value="architect_relations">
                              Architect relations
                            </SelectItem>
                            <SelectItem value="data_quality">Data quality</SelectItem>
                            <SelectItem value="community">Community</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-text-disabled">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={m.status}
                        onValueChange={(v) =>
                          patchMember(m.id, { status: v as MembershipRow["status"] })
                        }
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="pending_review">Pending review</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-text-secondary text-sm">
                      {new Date(m.joined_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => void saveMemberRow(m.id)}
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setRemoveTarget(m)}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="rounded-lg border border-border-dashed border-border-default p-6 space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Pending applications</h2>
        <p className="text-sm text-text-secondary">
          Application review lives in the Embassy portal (Phase 2). Nothing to show here yet.
        </p>
      </section>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="user-q">Search by username</Label>
              <Input
                id="user-q"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="At least 2 characters"
              />
              {userHits.length > 0 && (
                <ul className="border border-border-default rounded-md divide-y divide-border-default max-h-36 overflow-y-auto">
                  {userHits.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                          selectedUserId === u.id ? "bg-surface-muted" : "hover:bg-surface-muted"
                        }`}
                        onClick={() => {
                          setSelectedUserId(u.id);
                          setUserSearch(u.username ?? "");
                        }}
                      >
                        @{u.username ?? u.id.slice(0, 8)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={addRole} onValueChange={(v) => setAddRole(v as typeof addRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ambassador">Ambassador</SelectItem>
                  <SelectItem value="exco">ExCo</SelectItem>
                  <SelectItem value="president">President</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {addRole === "exco" && (
              <div className="space-y-2">
                <Label>ExCo responsibility</Label>
                <Select value={addExco} onValueChange={(v) => setAddExco(v as typeof addExco)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="content">Content</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="architect_relations">Architect relations</SelectItem>
                    <SelectItem value="data_quality">Data quality</SelectItem>
                    <SelectItem value="community">Community</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={adding} onClick={() => void addMember()}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the user from this chapter. They can be re-added later if they have no
              other membership.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void removeMember()}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
