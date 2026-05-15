import { useCallback, useEffect, useRef, useState } from "react";
import { Link, type MetaFunction } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { AmbassadorGuard } from "@/features/embassy/components/AmbassadorGuard";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  Landmark,
  Loader2,
  MessageSquare,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const meta: MetaFunction = () => [
  { title: "Ambassador Portal | Plano" },
  { name: "robots", content: "noindex, nofollow" },
];

type MembershipRow = Database["public"]["Tables"]["ambassador_memberships"]["Row"];
type ChapterRow = Database["public"]["Tables"]["ambassador_chapters"]["Row"];
type MembershipWithChapter = MembershipRow & { chapter: ChapterRow | null };

function roleLabel(role: string) {
  if (role === "exco") return "ExCo";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

// ─── Action card ──────────────────────────────────────────────────────────────

interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  cta: string;
  to: string;
}

function ActionCard({ icon, title, description, cta, to }: ActionCardProps) {
  return (
    <Card className="border border-border-default rounded-sm p-5 flex flex-col gap-4 hover:border-brand-primary/40 transition-colors group">
      <div className="flex items-start gap-4">
        <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-sm bg-surface-muted text-text-secondary group-hover:text-text-primary transition-colors">
          {icon}
        </div>
        <div className="min-w-0 space-y-1">
          <p className="font-semibold text-text-primary text-sm">{title}</p>
          <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
        </div>
      </div>
      <Button size="sm" variant="outline" className="self-start gap-1.5" asChild>
        <Link to={to}>
          {cta}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </Button>
    </Card>
  );
}

// ─── Contact form ─────────────────────────────────────────────────────────────

type ContactStatus = "idle" | "loading" | "success" | "error" | "rate_limited";

function ContactForm({ membershipRole, chapterName }: { membershipRole: string; chapterName: string }) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<ContactStatus>("idle");
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shake, setShake] = useState(false);

  const handleSubmit = async () => {
    if (message.trim().length < 10) {
      setShake(true);
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = setTimeout(() => setShake(false), 300);
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "other",
          message: `[Ambassador Portal — ${roleLabel(membershipRole)} · ${chapterName}]\n\n${message.trim()}`,
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
          consoleErrors: [],
          metadata: {
            source: "ambassador_portal",
            role: membershipRole,
            chapter: chapterName,
          },
        }),
      });

      if (res.status === 429) {
        setStatus("rate_limited");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        return;
      }

      setStatus("success");
      setMessage("");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="flex items-center gap-3 p-5 border border-feedback-success/30 bg-feedback-success/5 rounded-sm">
        <CheckCircle2 className="h-5 w-5 text-feedback-success shrink-0" aria-hidden />
        <div>
          <p className="text-sm font-medium text-text-primary">Message sent</p>
          <p className="text-sm text-text-secondary">
            The Plano team will follow up with you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="portal-message" className="text-sm font-medium text-text-primary">
          Your message
        </Label>
        <Textarea
          id="portal-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="Share ideas, ask questions, or flag something that needs attention…"
          className={cn(
            "resize-y min-h-[96px]",
            shake && "animate-shake"
          )}
          disabled={status === "loading"}
        />
        <p className="text-2xs text-text-disabled uppercase tracking-widest">
          At least 10 characters
        </p>
      </div>

      {(status === "error" || status === "rate_limited") && (
        <p className="text-sm text-feedback-destructive bg-feedback-destructive/5 border border-feedback-destructive/20 rounded-sm px-3 py-2">
          {status === "rate_limited"
            ? "Too many messages — please try again shortly."
            : "Could not send your message. Please try again."}
        </p>
      )}

      <Button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={status === "loading"}
        size="sm"
      >
        {status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          "Send message"
        )}
      </Button>
    </div>
  );
}

// ─── Main content ─────────────────────────────────────────────────────────────

function PortalContent() {
  const { user } = useAuth();
  const [membership, setMembership] = useState<MembershipWithChapter | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMembership = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ambassador_memberships")
        .select("*, chapter:ambassador_chapters(*)")
        .eq("user_id", user.id)
        .in("status", ["active", "pending_review"])
        .maybeSingle();
      if (error) throw error;
      setMembership((data ?? null) as MembershipWithChapter | null);
    } catch {
      toast.error("Could not load your ambassador profile");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadMembership();
  }, [loadMembership]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-text-disabled" aria-hidden />
      </div>
    );
  }

  if (!membership?.chapter || !user) {
    return (
      <div className="space-y-4">
        <p className="text-text-secondary">
          We could not find an active ambassador membership for your account.
        </p>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link to="/become-ambassador">Learn about the program</Link>
        </Button>
      </div>
    );
  }

  const chapterName = membership.chapter.name;
  const memberRole = membership.role;
  const membershipActive = membership.status === "active";
  const isLeader = memberRole === "president" || memberRole === "exco";

  return (
    <div className="space-y-14 pb-24">
      {/* ── Header ── */}
      <div className="border-b border-border-default pb-10 space-y-5">
        <div className="flex flex-wrap items-start gap-3">
          <Landmark className="h-8 w-8 text-text-primary mt-0.5 shrink-0" strokeWidth={1.5} aria-hidden />
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-text-primary leading-none">
            Ambassador Portal
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge
            variant={membershipActive ? "default" : "secondary"}
            className="text-xs"
          >
            {roleLabel(memberRole)}
          </Badge>
          <span className="text-text-secondary text-sm">{chapterName}</span>
          {!membershipActive && (
            <Badge variant="secondary" className="text-xs text-text-disabled">
              Membership under review
            </Badge>
          )}
        </div>

        <p className="text-text-secondary max-w-2xl text-sm leading-relaxed">
          This is your direct line to the Plano central team. Use it to share ideas, ask
          questions, or flag issues. Below you'll also find ways to contribute and
          resources to support your work as an ambassador.
        </p>
      </div>

      {/* ── Membership under review notice ── */}
      {!membershipActive && (
        <div className="border border-border-default rounded-sm p-4 bg-surface-muted/30 text-sm text-text-secondary">
          Your membership is under review following a location change. The chapter
          leadership has been notified. Some features below will be available again once
          your membership is reactivated. You can still use this portal to contact the
          central team.
        </div>
      )}

      {/* ── How you can help ── */}
      <section className="space-y-5" aria-labelledby="portal-contribute-heading">
        <div className="space-y-1">
          <h2 id="portal-contribute-heading" className="text-xl font-bold text-text-primary">
            Ways to contribute
          </h2>
          <p className="text-sm text-text-secondary">
            Your chapter depends on you to keep the data accurate and the community growing.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <ActionCard
            icon={<Building2 className="h-5 w-5" strokeWidth={1.5} aria-hidden />}
            title="Fix building data"
            description="Complete missing metadata — architect credits, build year, styles — for buildings in your chapter's area."
            cta="Open chapter tasks"
            to="/embassy"
          />
          <ActionCard
            icon={<Camera className="h-5 w-5" strokeWidth={1.5} aria-hidden />}
            title="Add photos"
            description="Photograph buildings in your area that don't have images yet, and upload them directly to Plano."
            cta="Find buildings to photograph"
            to="/embassy"
          />
          <ActionCard
            icon={<UserPlus className="h-5 w-5" strokeWidth={1.5} aria-hidden />}
            title="Grow the community"
            description="Invite architects, firms, and enthusiasts in your area to join Plano and contribute to the database."
            cta="Go to Connect"
            to="/connect"
          />
          {isLeader ? (
            <ActionCard
              icon={<Users className="h-5 w-5" strokeWidth={1.5} aria-hidden />}
              title="Review applications"
              description="Check for pending membership applications from people who want to join your chapter."
              cta="Review applications"
              to="/embassy?tab=applications"
            />
          ) : (
            <ActionCard
              icon={<Landmark className="h-5 w-5" strokeWidth={1.5} aria-hidden />}
              title="Add missing buildings"
              description="Know a significant building in your area that isn't on Plano yet? Add it to the database."
              cta="Add a building"
              to="/add-building"
            />
          )}
        </div>
      </section>

      {/* ── Resources ── */}
      <section className="space-y-5" aria-labelledby="portal-resources-heading">
        <h2 id="portal-resources-heading" className="text-xl font-bold text-text-primary">
          Resources
        </h2>
        <ul className="space-y-3">
          {[
            {
              label: "Ambassador programme overview",
              description: "Learn about the programme, what ambassadors do, and how chapters are structured.",
              to: "/support",
            },
            {
              label: "Chapter tasks dashboard",
              description: "Buildings missing photos, incomplete metadata, and unclaimed firms in your area.",
              to: "/embassy",
            },
            {
              label: "Your profile",
              description: "Keep your location and profile up to date — this is how your chapter membership is verified.",
              to: "/settings",
            },
          ].map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className="flex items-start gap-4 p-4 border border-border-default rounded-sm hover:border-brand-primary/40 transition-colors group"
              >
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-sm font-semibold text-text-primary group-hover:text-brand-primary transition-colors">
                    {item.label}
                  </p>
                  <p className="text-sm text-text-secondary">{item.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-text-disabled group-hover:text-text-primary transition-colors shrink-0 mt-0.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Contact central team ── */}
      <section className="space-y-5" aria-labelledby="portal-contact-heading">
        <div className="space-y-1">
          <h2 id="portal-contact-heading" className="text-xl font-bold text-text-primary">
            Message the central team
          </h2>
          <p className="text-sm text-text-secondary">
            Have a suggestion, a question about the programme, or something you'd like to flag?
            Send it directly to the Plano team.
          </p>
        </div>

        <Card className="border border-border-default rounded-sm p-5">
          <div className="flex items-start gap-4 mb-5">
            <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-sm bg-surface-muted text-text-secondary">
              <MessageSquare className="h-5 w-5" strokeWidth={1.5} aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">
                {roleLabel(memberRole)} · {chapterName}
              </p>
              <p className="text-xs text-text-disabled mt-0.5">
                Your role and chapter will be included with your message.
              </p>
            </div>
          </div>

          <ContactForm membershipRole={memberRole} chapterName={chapterName} />
        </Card>
      </section>

      {/* ── Profile reminder ── */}
      <section className="border border-border-default rounded-sm p-5 bg-surface-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback className="text-sm font-bold bg-surface-muted text-text-primary">
              {(user.email ?? "A").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary">Keep your profile current</p>
            <p className="text-sm text-text-secondary">
              Your chapter membership is tied to your location. If you move, update your
              profile so your membership can be verified.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" className="shrink-0 self-start sm:self-center" asChild>
            <Link to="/settings">Edit profile</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

// ─── Page export ─────────────────────────────────────────────────────────────

import { redirect } from "react-router";

export async function loader() {
  return redirect("/embassy");
}

export default function AmbassadorPortal() {
  return null;
}
