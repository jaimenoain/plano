import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Search, Camera, CheckCircle2, ArrowRight, Loader2, Landmark } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, redirect } from "react-router";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3;
type ContributorType = "researcher" | "photographer" | "outreach" | "all";

export async function loader() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("/auth");

  const { data: membership } = await supabase
    .from("ambassador_memberships")
    .select("onboarded_at, status")
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.status !== "active") {
    return redirect("/embassy");
  }

  if (membership.onboarded_at) {
    return redirect("/embassy");
  }

  return null;
}

export default function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(1);
  const [type, setType] = useState<ContributorType | null>(null);

  const { data: membership } = useQuery({
    queryKey: ["ambassador-membership", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ambassador_memberships")
        .select(`*, chapter:ambassador_chapters(name)`)
        .eq("user_id", user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const onboardingMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("ambassador_memberships")
        .update({
          contributor_type: type,
          onboarded_at: new Date().toISOString(),
        })
        .eq("user_id", user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ambassador-membership", user?.id] });
      toast.success("Welcome aboard!");
      navigate("/embassy");
    },
    onError: () => {
      toast.error("Failed to save onboarding. Please try again.");
    },
  });

  const nextStep = () => setStep((s) => (s + 1) as Step);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
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
                You're now a verified ambassador for <span className="text-text-primary font-semibold">{membership?.chapter?.name || "your chapter"}</span>.
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
              <h2 className="text-2xl font-bold tracking-tight">Pick your path</h2>
              <p className="text-muted-foreground">How do you primarily want to contribute? You can change this later.</p>
            </div>
            
            <div className="grid gap-4">
              <OptionCard
                selected={type === "researcher"}
                onClick={() => setType("researcher")}
                icon={<Search className="h-5 w-5" />}
                title="The Researcher"
                description="Focus on completing missing metadata, credits, and historical facts."
              />
              <OptionCard
                selected={type === "photographer"}
                onClick={() => setType("photographer")}
                icon={<Camera className="h-5 w-5" />}
                title="The Photographer"
                description="Focus on documenting buildings visually and capturing new views."
              />
              <OptionCard
                selected={type === "outreach"}
                onClick={() => setType("outreach")}
                icon={<CheckCircle2 className="h-5 w-5" />}
                title="The Connector"
                description="Focus on helping firms claim their profiles and growing the community."
              />
              <OptionCard
                selected={type === "all"}
                onClick={() => setType("all")}
                icon={<Landmark className="h-5 w-5" />}
                title="The Polymath"
                description="I want to do a bit of everything."
              />
            </div>

            <Button 
              size="lg" 
              className="w-full h-12 text-base mt-4" 
              onClick={nextStep}
              disabled={!type}
            >
              Next Step
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 text-center animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">You're all set</h2>
              <p className="text-muted-foreground">
                We'll tailor your experience to help you focus on {type === 'all' ? 'everything' : type} tasks.
              </p>
            </div>
            
            <div className="bg-surface-muted/30 border rounded-xl p-6 text-left space-y-4">
              <div className="flex items-start gap-4">
                <div className="h-8 w-8 rounded-full bg-feedback-success/10 text-feedback-success flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Portal access granted</p>
                  <p className="text-sm text-muted-foreground">All ambassador tools are now unlocked for you.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="h-8 w-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                  <Landmark className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Chapter Dashboard</p>
                  <p className="text-sm text-muted-foreground">See how your chapter is growing and what needs attention.</p>
                </div>
              </div>
            </div>

            <Button 
              size="lg" 
              className="w-full h-12 text-base gap-2" 
              onClick={() => onboardingMutation.mutate()}
              disabled={onboardingMutation.isPending}
            >
              {onboardingMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Enter the Portal"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function OptionCard({ selected, onClick, icon, title, description }: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card
      className={cn(
        "p-4 flex items-center gap-4 cursor-pointer transition-all border-2",
        selected ? "border-brand-primary bg-brand-primary/5" : "border-transparent hover:border-muted"
      )}
      onClick={onClick}
    >
      <div className={cn(
        "p-2 rounded-lg",
        selected ? "bg-brand-primary text-white" : "bg-muted text-muted-foreground"
      )}>
        {icon}
      </div>
      <div className="text-left">
        <p className="font-bold">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </Card>
  );
}
