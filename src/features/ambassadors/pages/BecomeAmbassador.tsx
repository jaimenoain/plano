import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, type MetaFunction } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { SITE_URL } from "@/features/buildings/utils/structuredData";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ambassadorApplicationSubmitSchema } from "@/lib/validations/ambassador";

const PAGE_TITLE = "Become an ambassador | Plano";
const PAGE_DESCRIPTION =
  "Volunteer with Plano to improve architecture data where you live. Learn what ambassadors do and apply to your local or national chapter.";

export const meta: MetaFunction = () => [
  { title: PAGE_TITLE },
  { name: "description", content: PAGE_DESCRIPTION },
  { name: "robots", content: "index, follow" },
  { property: "og:title", content: PAGE_TITLE },
  { property: "og:description", content: PAGE_DESCRIPTION },
  { property: "og:type", content: "website" },
  { property: "og:url", content: `${SITE_URL}/become-ambassador` },
];

type ChapterRow = Database["public"]["Tables"]["ambassador_chapters"]["Row"];
type MembershipRow = Database["public"]["Tables"]["ambassador_memberships"]["Row"];
type ApplicationRow = Database["public"]["Tables"]["ambassador_applications"]["Row"];

type MembershipWithChapter = MembershipRow & { chapter: ChapterRow | null };

export default function BecomeAmbassador() {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const fromEmbassy = Boolean(
    location.state && typeof location.state === "object" && "fromEmbassy" in location.state,
  );

  const [profileFields, setProfileFields] = useState<{
    country: string | null;
    location: string | null;
  } | null>(null);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [ambassadorCounts, setAmbassadorCounts] = useState<Record<string, number>>({});
  const [membership, setMembership] = useState<MembershipWithChapter | null>(null);
  const [pending, setPending] = useState<ApplicationRow | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [chapterId, setChapterId] = useState<string>("");
  const [motivation, setMotivation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadChaptersAndProfile = useCallback(async () => {
    if (!user) {
      setProfileFields(null);
      setChapters([]);
      setMembership(null);
      setPending(null);
      setChapterId("");
      return;
    }
    setLoadingData(true);
    try {
      const [profileRes, chaptersRes, memRes, pendingRes] = await Promise.all([
        supabase.from("profiles").select("country, location").eq("id", user.id).maybeSingle(),
        supabase
          .from("ambassador_chapters")
          .select("*")
          .in("status", ["active", "forming"])
          .order("country_code", { ascending: true })
          .order("name", { ascending: true }),
        supabase
          .from("ambassador_memberships")
          .select(
            `
            *,
            chapter:ambassador_chapters(*)
          `,
          )
          .eq("user_id", user.id)
          .in("status", ["active", "pending_review"])
          .maybeSingle(),
        supabase
          .from("ambassador_applications")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "pending")
          .maybeSingle(),
      ]);

      if (profileRes.error) throw profileRes.error;
      setProfileFields(profileRes.data ?? { country: null, location: null });

      if (chaptersRes.error) throw chaptersRes.error;
      const list = chaptersRes.data ?? [];
      setChapters(list);

      if (list.length > 0) {
        const ids = list.map((c) => c.id);
        const { data: memRows, error: countErr } = await supabase
          .from("ambassador_memberships")
          .select("chapter_id")
          .in("chapter_id", ids)
          .eq("role", "ambassador")
          .eq("status", "active");
        if (countErr) throw countErr;
        const next: Record<string, number> = {};
        for (const id of ids) next[id] = 0;
        for (const m of memRows ?? []) {
          next[m.chapter_id] = (next[m.chapter_id] ?? 0) + 1;
        }
        setAmbassadorCounts(next);
      } else {
        setAmbassadorCounts({});
      }

      if (memRes.error) throw memRes.error;
      setMembership((memRes.data ?? null) as MembershipWithChapter | null);

      if (pendingRes.error) throw pendingRes.error;
      setPending(pendingRes.data ?? null);

      const defaultChapter = await pickDefaultChapterId(
        list,
        profileRes.data?.country ?? null,
        profileRes.data?.location ?? null,
      );
      setChapterId((prev) => (prev && list.some((c) => c.id === prev) ? prev : defaultChapter));
    } catch {
      toast.error("Could not load chapters");
      setChapters([]);
      setChapterId("");
    } finally {
      setLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    void loadChaptersAndProfile();
  }, [loadChaptersAndProfile]);

  const selectedChapter = useMemo(
    () => chapters.find((c) => c.id === chapterId) ?? null,
    [chapters, chapterId],
  );

  const ambassadorSlotsUsed = selectedChapter ? ambassadorCounts[selectedChapter.id] ?? 0 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = ambassadorApplicationSubmitSchema.safeParse({
      chapter_id: chapterId,
      motivation_text: motivation,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your application");
      return;
    }
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("submit_ambassador_application", {
        p_chapter_id: parsed.data.chapter_id,
        p_motivation_text: parsed.data.motivation_text,
      });
      if (error) throw error;
      toast.success("Application submitted");
      setMotivation("");
      await loadChaptersAndProfile();
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : "";
      if (msg.includes("motivation_too_short")) {
        toast.error("Please write at least 100 characters");
      } else if (msg.includes("already_member")) {
        toast.error("You already have an active ambassador membership");
      } else if (msg.includes("pending_exists")) {
        toast.error("You already have a pending application");
      } else if (msg.includes("invalid_chapter")) {
        toast.error("This chapter is not accepting applications");
      } else {
        toast.error("Could not submit application");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <AppLayout title="Become an ambassador" showLogo={false}>
        <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <header className="pt-10 pb-10 border-b border-border-default space-y-4">
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-text-primary leading-none">
              Become an ambassador
            </h1>
            <p className="text-text-secondary">
              Ambassadors help grow and refine Plano&apos;s building data in a specific city or country:
              photos, metadata, and community outreach. It is a volunteer role with a light, steady
              rhythm — chapter leaders coordinate priorities.
            </p>
          </header>

          {fromEmbassy ? (
            <p className="mt-8 text-sm text-text-secondary border border-border-default rounded-sm p-4 bg-surface-muted/30">
              You need an active ambassador membership to open the Embassy. Apply below or contact your
              chapter if you believe this is a mistake.
            </p>
          ) : null}

          <section className="mt-10 space-y-6">
            <h2 className="text-xl font-semibold text-text-primary">What you will do</h2>
            <ul className="list-disc pl-5 space-y-2 text-text-secondary">
              <li>Spot buildings missing photos or key facts in your area</li>
              <li>Welcome newcomers and keep data quality high</li>
              <li>Coordinate with your chapter&apos;s president and ExCo on priorities</li>
            </ul>
          </section>

          {authLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-text-disabled" aria-hidden />
            </div>
          ) : !user ? (
            <section className="mt-12 space-y-4 border-t border-border-default pt-10">
              <h2 className="text-xl font-semibold text-text-primary">Apply</h2>
              <p className="text-text-secondary">
                Create an account or sign in to apply to a chapter. The programme is open to anyone who
                cares about architecture where they live.
              </p>
              <Button asChild>
                <Link to="/auth">Log in or register</Link>
              </Button>
            </section>
          ) : loadingData ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-text-disabled" aria-hidden />
            </div>
          ) : membership?.chapter && membership.status === "active" ? (
            <section className="mt-12 space-y-4 border-t border-border-default pt-10">
              <h2 className="text-xl font-semibold text-text-primary">Your ambassador status</h2>
              <p className="text-text-secondary">
                You are already an active member of{" "}
                <span className="font-medium text-text-primary">{membership.chapter.name}</span> as{" "}
                <span className="font-medium text-text-primary">{membership.role}</span>.
              </p>
              <Button asChild variant="outline">
                <Link to="/embassy">Open Embassy</Link>
              </Button>
            </section>
          ) : membership?.chapter && membership.status === "pending_review" ? (
            <section className="mt-12 space-y-4 border-t border-border-default pt-10">
              <h2 className="text-xl font-semibold text-text-primary">Membership under review</h2>
              <p className="text-text-secondary">
                Your role with{" "}
                <span className="font-medium text-text-primary">{membership.chapter.name}</span> is on hold
                after a location change. Chapter leaders will confirm whether you still belong in this
                chapter. You can open the Embassy for updates.
              </p>
              <Button asChild variant="outline">
                <Link to="/embassy">Open Embassy</Link>
              </Button>
            </section>
          ) : pending ? (
            <section className="mt-12 space-y-4 border-t border-border-default pt-10">
              <h2 className="text-xl font-semibold text-text-primary">Application pending</h2>
              <p className="text-text-secondary">
                Your application is waiting for chapter leaders to review it. You will receive a
                notification when there is a decision.
              </p>
            </section>
          ) : chapters.length === 0 ? (
            <section className="mt-12 space-y-4 border-t border-border-default pt-10">
              <h2 className="text-xl font-semibold text-text-primary">Apply</h2>
              <p className="text-text-secondary">
                There are no chapters accepting applications yet. Check back soon or contact the Plano
                team.
              </p>
            </section>
          ) : (
            <section className="mt-12 space-y-6 border-t border-border-default pt-10">
              <h2 className="text-xl font-semibold text-text-primary">Apply</h2>
              {profileFields &&
              !(profileFields.country?.trim() || profileFields.location?.trim()) ? (
                <p className="text-sm text-text-secondary border border-border-default rounded-sm p-4 bg-surface-muted/30">
                  Complete your country and city in{" "}
                  <Link to="/settings" className="font-medium text-text-primary underline underline-offset-2">
                    Settings
                  </Link>{" "}
                  first so we can suggest the right chapter.
                </p>
              ) : null}
              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="chapter">Chapter</Label>
                  <Select
                    value={chapterId || undefined}
                    onValueChange={setChapterId}
                    required
                  >
                    <SelectTrigger id="chapter" className="w-full max-w-md">
                      <SelectValue placeholder="Select a chapter" />
                    </SelectTrigger>
                    <SelectContent>
                      {chapters.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.type === "national" ? "National" : "Local"}) · {c.country_code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedChapter ? (
                    <p className="text-sm text-text-secondary">
                      Status: {selectedChapter.status}. Ambassador places filled: {ambassadorSlotsUsed} /{" "}
                      {selectedChapter.max_ambassadors} (ambassador role only).
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="motivation">Why do you want to be an ambassador?</Label>
                  <Textarea
                    id="motivation"
                    value={motivation}
                    onChange={(e) => setMotivation(e.target.value)}
                    rows={8}
                    required
                    minLength={100}
                    className="resize-y min-h-[160px]"
                    placeholder="Write at least 100 characters."
                  />
                  <p className="text-2xs text-text-disabled">
                    {motivation.trim().length} / 100 characters minimum
                  </p>
                </div>
                <Button type="submit" disabled={submitting || !chapterId}>
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    "Submit application"
                  )}
                </Button>
              </form>
            </section>
          )}
        </div>
      </AppLayout>
    </div>
  );
}

async function pickDefaultChapterId(
  chapters: ChapterRow[],
  country: string | null,
  location: string | null,
): Promise<string> {
  if (chapters.length === 0) return "";

  const loc = location?.trim();
  if (loc && loc.length >= 2) {
    const safe = loc.replace(/%/g, "").slice(0, 64);
    const { data: hits } = await supabase
      .from("localities")
      .select("id, country_code")
      .or(`city.ilike.%${safe}%,country.ilike.%${safe}%`)
      .limit(8);
    const localityIds = new Set((hits ?? []).map((h) => h.id));
    const byLocality = chapters.find((c) => c.type === "local" && c.locality_id && localityIds.has(c.locality_id));
    if (byLocality) return byLocality.id;
    const cc = hits?.[0]?.country_code?.toUpperCase();
    if (cc) {
      const national = chapters.find((c) => c.type === "national" && c.country_code === cc);
      if (national) return national.id;
    }
  }

  const cname = country?.trim();
  if (cname && cname.length >= 2) {
    const safe = cname.replace(/%/g, "").slice(0, 64);
    const { data: hits } = await supabase
      .from("localities")
      .select("country_code")
      .ilike("country", `%${safe}%`)
      .limit(1);
    const cc = hits?.[0]?.country_code?.toUpperCase();
    if (cc) {
      const national = chapters.find((c) => c.type === "national" && c.country_code === cc);
      if (national) return national.id;
    }
  }

  const firstNational = chapters.find((c) => c.type === "national");
  if (firstNational) return firstNational.id;
  return chapters[0]?.id ?? "";
}
