import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Camera, CheckCircle2, ArrowRight, Loader2, Landmark, Filter, UserPlus, Check } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, redirect, type LoaderFunctionArgs } from "react-router";
import { cn } from "@/lib/utils";
import { createSupabaseServerClient } from "@/lib/supabase.server";
import { fetchChapterTeam, type ChapterTeamMember } from "@/features/embassy/api/leadership";

type Step = 1 | 2 | 3;
type ToolKey = "research" | "photography" | "outreach" | "moderation" | "community";

const TOOLS: { key: ToolKey; title: string; description: string; tip: string; icon: React.ReactNode }[] = [
  {
    key: "research",
    title: "Data & Research",
    description: "Complete missing metadata like architects, completion years, and styles.",
    tip: "Start with the AI Research tool on the Contribute page — it surfaces buildings with gaps in your chapter and lets you accept or edit AI-suggested values before saving.",
    icon: <Search className="h-5 w-5" />,
  },
  {
    key: "photography",
    title: "Photography",
    description: "Find buildings that need photos and help document them visually.",
    tip: "Use the Photography tool to find buildings near you that have no photos yet. Aim for exteriors in good light — a single clear shot makes a big difference for a building that's never been documented.",
    icon: <Camera className="h-5 w-5" />,
  },
  {
    key: "outreach",
    title: "Architect Outreach",
    description: "Help firms claim their portfolio and verify their credits.",
    tip: "Head to the Outreach CRM on the Contribute page to see firms in your chapter with unclaimed buildings. A short, personal message explaining Plano's mission tends to get the best response.",
    icon: <CheckCircle2 className="h-5 w-5" />,
  },
  {
    key: "moderation",
    title: "Moderation",
    description: "Review tags, group buildings into collections, and highlight gems.",
    tip: "The Moderation tool shows the latest contributions from your chapter. Work through the queue regularly — approving or flagging a few items a day keeps the record clean.",
    icon: <Filter className="h-5 w-5" />,
  },
  {
    key: "community",
    title: "Grow Community",
    description: "Invite architects and firms in your area to join Plano.",
    tip: "The best leads are architects and firms whose work is already in Plano but who haven't joined yet. A personal introduction from a local ambassador converts far better than a cold invite.",
    icon: <UserPlus className="h-5 w-5" />,
  },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const responseHeaders = new Headers();
  const supabaseServer = createSupabaseServerClient(request, responseHeaders);

  const { data: { user } } = await supabaseServer.auth.getUser();
  if (!user) {
    return redirect("/auth?redirect=/embassy/welcome", { headers: responseHeaders });
  }

  const { data: membership } = await supabaseServer
    .from("ambassador_memberships")
    .select("onboarded_at, status")
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.status !== "active") {
    return redirect("/embassy", { headers: responseHeaders });
  }

  if (membership.onboarded_at) {
    return redirect("/embassy", { headers: responseHeaders });
  }

  return null;
}

export default function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(1);
  // selectedTools preserves insertion order — that order is what gets saved
  const [selectedTools, setSelectedTools] = useState<ToolKey[]>([]);

  const { data: membership } = useQuery({
    queryKey: ["ambassador-membership-onboarding", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ambassador_memberships")
        .select(`*, chapter:ambassador_chapters(id, name)`)
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const chapterId = membership?.chapter?.id as string | undefined;

  const { data: teamMembers } = useQuery({
    queryKey: ["chapter-team", chapterId],
    queryFn: () => fetchChapterTeam(chapterId!),
    enabled: !!chapterId,
    staleTime: 5 * 60 * 1000,
  });

  const leadership = (teamMembers ?? []).filter(
    (m: ChapterTeamMember) => m.role === "president" || m.role === "exco"
  );

  const toggleTool = (key: ToolKey) => {
    setSelectedTools((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const onboardingMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("complete_ambassador_onboarding", {
        p_preferred_tools: selectedTools,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ambassador-membership"] });
      queryClient.invalidateQueries({ queryKey: ["ambassador-membership-onboarding", user?.id] });
      toast.success("Welcome aboard!");
      navigate("/embassy");
    },
    onError: () => {
      toast.error("Failed to save onboarding. Please try again.");
    },
  });

  const nextStep = () => setStep((s) => (s + 1) as Step);

  return (
    <div className="min-h-[calc(100vh-5rem)] sm:min-h-[calc(100vh-6rem)] bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-8">
        <div className="flex justify-center mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
            <Landmark className="h-6 w-6" />
          </div>
        </div>

        <div className="space-y-2 text-center">
          <div className="flex justify-center gap-1 mb-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  "h-1 w-12 rounded-full transition-colors",
                  step >= i ? "bg-brand-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Welcome to the Embassy</h1>
              <p className="text-muted-foreground text-lg">
                You're now a verified ambassador for{" "}
                <span className="text-text-primary font-semibold">
                  {membership?.chapter?.name || "your chapter"}
                </span>.
              </p>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Plano depends on local experts like you to ensure our architectural record is accurate,
              complete, and vibrant. This portal is your headquarters.
            </p>
            <Button size="lg" className="w-full h-12 text-base gap-2" onClick={nextStep}>
              Get Started <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-bold tracking-tight">Pick your focus areas</h2>
              <p className="text-muted-foreground">
                Pick the areas where you'll make the most impact — tap them in priority order. Your Contribute page will be arranged to match.
              </p>
            </div>

            <div className="grid gap-3">
              {TOOLS.map((tool) => {
                const selected = selectedTools.includes(tool.key);
                const order = selectedTools.indexOf(tool.key) + 1;
                return (
                  <Card
                    key={tool.key}
                    className={cn(
                      "p-4 flex items-center gap-4 cursor-pointer transition-all border-2",
                      selected
                        ? "border-brand-primary bg-brand-primary/5"
                        : "border-transparent hover:border-muted"
                    )}
                    onClick={() => toggleTool(tool.key)}
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                        selected
                          ? "bg-brand-primary text-white"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {selected ? (
                        <span className="text-sm font-bold leading-none">{order}</span>
                      ) : (
                        tool.icon
                      )}
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-bold">{tool.title}</p>
                      <p className="text-xs text-muted-foreground">{tool.description}</p>
                    </div>
                    {selected && (
                      <Check className="h-4 w-4 text-brand-primary shrink-0" />
                    )}
                  </Card>
                );
              })}
            </div>

            <Button
              size="lg"
              className="w-full h-12 text-base mt-4"
              onClick={nextStep}
              disabled={selectedTools.length === 0}
            >
              Next Step
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 text-center animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">You're all set</h2>
              <p className="text-muted-foreground">
                Here's how to make the most of the areas you've chosen.
              </p>
            </div>

            {/* Focus areas with tips */}
            <div className="text-left space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                Your focus areas
              </p>
              {selectedTools.map((key, i) => {
                const tool = TOOLS.find((t) => t.key === key)!;
                return (
                  <div key={key} className="border rounded-xl p-4 space-y-2 bg-surface-muted/20">
                    <div className="flex items-center gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white text-xs font-bold">
                        {i + 1}
                      </div>
                      <span className="font-semibold text-sm">{tool.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-9">
                      {tool.tip}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Leadership contacts */}
            {leadership.length > 0 && (
              <div className="text-left border rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Questions? Reach out to your leadership
                </p>
                <div className="space-y-2">
                  {leadership.map((member: ChapterTeamMember) => {
                    const initials = member.username
                      .split(/[\s_-]/)
                      .map((p: string) => p[0]?.toUpperCase() ?? "")
                      .slice(0, 2)
                      .join("");
                    return (
                      <div key={member.user_id} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={member.avatar_url ?? undefined} alt={member.username} />
                          <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium truncate">@{member.username}</span>
                          {member.role === "president" ? (
                            <Badge className="text-[10px] uppercase font-bold bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 border-none shrink-0">
                              President
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] uppercase font-bold shrink-0">
                              ExCo
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  You can message them directly from the{" "}
                  <span className="font-medium text-text-primary">Team</span> tab once you're in the portal.
                </p>
              </div>
            )}

            {/* Portal access */}
            <div className="flex items-start gap-4 border rounded-xl p-4 text-left">
              <div className="h-8 w-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                <Landmark className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">Portal access granted</p>
                <p className="text-xs text-muted-foreground">All ambassador tools are now unlocked for you.</p>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full h-12 text-base gap-2"
              onClick={() => onboardingMutation.mutate()}
              disabled={onboardingMutation.isPending}
            >
              {onboardingMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Enter the Portal"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
