import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, type MetaFunction } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { SITE_URL } from "@/features/buildings/utils/structuredData";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
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
  const [_ambassadorCounts, setAmbassadorCounts] = useState<Record<string, number>>({});
  const [membership, setMembership] = useState<MembershipWithChapter | null>(null);
  const [pending, setPending] = useState<ApplicationRow | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [localityId, setLocalityId] = useState<string>("");
  const [localityQuery, setLocalityQuery] = useState("");
  const [localityHits, setLocalityHits] = useState<LocalityPick[]>([]);
  const [localityLoading, setLocalityLoading] = useState(false);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
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

      const defaultChapterId = await pickDefaultChapterId(
        list,
        profileRes.data?.country ?? null,
        profileRes.data?.location ?? null,
      );
      
      const defaultChapter = list.find(c => c.id === defaultChapterId);
      if (defaultChapter && defaultChapter.locality_id) {
        setLocalityId(defaultChapter.locality_id);
        setChapterId(defaultChapter.id);
        // We'll fetch the locality name to show in the search box
        const { data: loc } = await supabase
          .from("localities")
          .select("city, country")
          .eq("id", defaultChapter.locality_id)
          .single();
        if (loc) {
          setLocalityQuery(`${loc.city}, ${loc.country}`);
        }
      }
    } catch {
      toast.error("Could not load data");
      setChapters([]);
    } finally {
      setLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    void loadChaptersAndProfile();
  }, [loadChaptersAndProfile]);

  useEffect(() => {
    const q = localityQuery.trim();
    if (q.length < 2) {
      setLocalityHits([]);
      return;
    }
    // If the query matches the selected locality's name, don't search
    const t = window.setTimeout(() => {
      void (async () => {
        setLocalityLoading(true);
        const safe = q.replace(/%/g, "").slice(0, 64);
        const { data, error } = await supabase
          .from("localities")
          .select("id, city, country, country_code")
          .or(`city.ilike.%${safe}%,country.ilike.%${safe}%`)
          .limit(10);
        setLocalityLoading(false);
        if (error) {
          setLocalityHits([]);
          return;
        }
        setLocalityHits(data ?? []);
      })();
    }, 300);
    return () => window.clearTimeout(t);
  }, [localityQuery]);

  const interestOptions = [
    { id: "photos", label: "Taking photos of buildings in your area" },
    { id: "data", label: "Reviewing data entries" },
    { id: "community", label: "Community management" },
    { id: "translation", label: "Translation & Localisation" },
    { id: "events", label: "Organising events" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = ambassadorApplicationSubmitSchema.safeParse({
      chapter_id: chapterId,
      locality_id: localityId,
      motivation_text: motivation,
      interests: interests,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your application");
      return;
    }
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("submit_ambassador_application", {
        p_chapter_id: (parsed.data.chapter_id ?? null) as string,
        p_motivation_text: (parsed.data.motivation_text ?? null) as string,
        p_locality_id: (parsed.data.locality_id ?? null) as string,
        p_interests: parsed.data.interests ?? null,
      });
      if (error) throw error;
      toast.success("Application submitted");
      setMotivation("");
      setInterests([]);
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
                  <Label htmlFor="locality">Where are you based?</Label>
                  <div className="relative w-full max-w-md">
                    <Input
                      id="locality"
                      value={localityQuery}
                      onChange={(e) => setLocalityQuery(e.target.value)}
                      placeholder="Type city name..."
                      className="w-full"
                      autoComplete="off"
                    />
                    {localityLoading && (
                      <div className="absolute right-3 top-2.5">
                        <Loader2 className="h-4 w-4 animate-spin text-text-disabled" />
                      </div>
                    )}
                    {localityHits.length > 0 && (
                      <div className="absolute top-full left-0 w-full z-10 mt-1 bg-surface-overlay border border-border-default rounded-sm shadow-lg overflow-hidden">
                        <ul className="divide-y divide-border-default max-h-48 overflow-y-auto">
                          {localityHits.map((loc) => (
                            <li key={loc.id}>
                              <button
                                type="button"
                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-muted transition-colors"
                                onClick={() => {
                                  setLocalityId(loc.id);
                                  setLocalityQuery(`${loc.city}, ${loc.country}`);
                                  setLocalityHits([]);
                                  
                                  // Find relevant chapter for this locality to populate chapterId
                                  const chapter = chapters.find(c => 
                                    (c.type === "local" && c.locality_id === loc.id) ||
                                    (c.type === "national" && c.country_code === loc.country_code)
                                  );
                                  setChapterId(chapter?.id ?? null);
                                }}
                              >
                                <span className="font-medium text-text-primary">{loc.city}</span>
                                <span className="text-text-secondary ml-1">
                                  {loc.country} ({loc.country_code})
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>What could you help with?</Label>
                  <ToggleGroup
                    type="multiple"
                    variant="outline"
                    value={interests}
                    onValueChange={setInterests}
                    className="flex flex-wrap justify-start gap-2"
                  >
                    {interestOptions.map((opt) => (
                      <ToggleGroupItem
                        key={opt.id}
                        value={opt.label}
                        className="h-auto py-1.5 px-3 rounded-full text-sm data-[state=on]:bg-brand-primary data-[state=on]:text-brand-primary-foreground border-border-default"
                      >
                        {opt.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motivation">Why do you want to be an ambassador? (Optional)</Label>
                  <Textarea
                    id="motivation"
                    value={motivation}
                    onChange={(e) => setMotivation(e.target.value)}
                    rows={6}
                    className="resize-y min-h-[120px]"
                    placeholder="Tell us a bit about your interest in architecture and Plano."
                  />
                </div>
                <Button type="submit" disabled={submitting || !localityId}>
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

type LocalityPick = Pick<
  Database["public"]["Tables"]["localities"]["Row"],
  "id" | "city" | "country" | "country_code"
>;
