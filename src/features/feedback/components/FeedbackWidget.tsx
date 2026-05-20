import { useState, useRef } from "react";
import { Link } from "react-router";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { capturedErrors } from "@/components/providers/ConsoleErrorInterceptor";
import { cn } from "@/lib/utils";

type FeedbackType = "bug" | "ux_improvement" | "feature_idea" | "other";
type Status = "idle" | "loading" | "success" | "error" | "rate_limited";

const TYPES: { value: FeedbackType; emoji: string; label: string }[] = [
  { value: "bug", emoji: "🐛", label: "Bug report" },
  { value: "ux_improvement", emoji: "✨", label: "UX improvement" },
  { value: "feature_idea", emoji: "💡", label: "Feature idea" },
  { value: "other", emoji: "💬", label: "Other" },
];

export function FeedbackWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [triggerHovered, setTriggerHovered] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [shaking, setShaking] = useState(false);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!user) return null;

  const isTriggerExpanded = open || triggerHovered;

  function openDialog() {
    setOpen(true);
  }

  function closeDialog() {
    if (status === "loading") return;
    setOpen(false);
    // reset after close animation
    setTimeout(reset, 300);
  }

  function reset() {
    setFeedbackType("bug");
    setMessage("");
    setStatus("idle");
    setShaking(false);
  }

  async function handleSubmit() {
    if (message.trim().length < 10) {
      setShaking(true);
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
      shakeTimer.current = setTimeout(() => setShaking(false), 300);
      return;
    }

    setStatus("loading");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: feedbackType,
          message: message.trim(),
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
          consoleErrors: [...capturedErrors],
          metadata: {
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            language: navigator.language,
            referrer: document.referrer,
            page: window.location.pathname,
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
      if (typeof window.gtag === "function") {
        window.gtag("event", "feedback_submitted", {
          feedback_type: feedbackType,
          has_screenshot: false,
          page_url: window.location.pathname,
        });
      }
      setTimeout(() => {
        setOpen(false);
        setTimeout(reset, 3000);
      }, 3000);
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      {/* Corner trigger */}
      <div
        className={cn(
          "fixed bottom-0 right-0 z-50 overflow-hidden cursor-pointer",
          "transition-[width,height] duration-500 ease-in-out motion-reduce:transition-none",
          isTriggerExpanded ? "w-20 h-20" : "w-10 h-10"
        )}
        onMouseEnter={() => setTriggerHovered(true)}
        onMouseLeave={() => setTriggerHovered(false)}
        onClick={openDialog}
        role="button"
        aria-label="Send feedback"
      >
        <svg
          className="size-full block absolute inset-0"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          aria-hidden
        >
          <polygon
            points="100,0 100,100 0,100"
            fill="var(--brand-primary)"
            className="transition-all duration-500"
          />
        </svg>
        <span
          className={cn(
            "absolute bottom-3 right-3 flex items-center justify-center pointer-events-none text-brand-primary-foreground",
            "transition-all duration-500 ease-in-out motion-reduce:transition-none",
            isTriggerExpanded ? "opacity-100 scale-100 translate-x-0 translate-y-0" : "opacity-0 scale-50 translate-x-4 translate-y-4"
          )}
          aria-hidden
        >
          <MessageCircle className="size-6" strokeWidth={2} />
        </span>
      </div>

      {/* Dialog */}
      {open && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center sm:items-center items-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeDialog}
          />

          {/* Panel */}
          <div className="relative w-full max-w-[448px] rounded-t-2xl sm:rounded-2xl bg-surface-overlay border border-border-default shadow-2xl mx-0 sm:mx-4 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-10 duration-200">
            {status === "success" ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="size-16 rounded-full bg-feedback-success/10 flex items-center justify-center text-3xl">
                  ✅
                </div>
                <div className="text-xl font-semibold text-text-primary">
                  Feedback received!
                </div>
                <p className="text-text-secondary text-center px-8">
                  Thank you for helping us improve Plano.
                </p>
                <Link
                  to="/feedback"
                  className="text-sm font-medium text-brand-primary hover:underline"
                  onClick={() => {
                    setOpen(false);
                    setTimeout(reset, 300);
                  }}
                >
                  View my requests
                </Link>
              </div>
            ) : (
              <div className="p-6 flex flex-col gap-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-text-primary">
                      Feedback
                    </h2>
                    <p className="text-sm text-text-secondary">
                      Help us make Plano better
                    </p>
                  </div>
                  <button
                    onClick={closeDialog}
                    className="size-8 flex items-center justify-center rounded-full hover:bg-surface-muted text-text-secondary hover:text-text-primary transition-colors text-2xl leading-none"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                {/* Type selector */}
                <div className="grid grid-cols-2 gap-3">
                  {TYPES.map(({ value, emoji, label }) => (
                    <button
                      key={value}
                      onClick={() => setFeedbackType(value)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm transition-all duration-200",
                        feedbackType === value
                          ? "border-brand-primary bg-brand-primary/10 text-brand-primary font-semibold shadow-sm"
                          : "border-border-default bg-surface-default text-text-secondary hover:border-brand-primary/40 hover:bg-surface-muted"
                      )}
                    >
                      <span className="text-lg">{emoji}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                {/* Textarea */}
                <div className="space-y-2">
                  <textarea
                    rows={4}
                    className="w-full resize-none rounded-xl border border-border-default bg-surface-default px-4 py-3 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                    placeholder="Tell us what's on your mind…"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={status === "loading"}
                  />
                  <div className="text-[10px] text-text-disabled uppercase tracking-wider font-semibold">
                    At least 10 characters
                  </div>
                </div>

                {/* Error message */}
                {(status === "error" || status === "rate_limited") && (
                  <p className="text-sm text-feedback-destructive font-medium bg-feedback-destructive/10 p-3 rounded-lg">
                    {status === "rate_limited"
                      ? "For security, we have a cap on feedback submissions — please have a break and continue later. Thanks a lot for your feedback and support!"
                      : "Something went wrong. Please try again."}
                  </p>
                )}

                {/* Footer */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={closeDialog}
                    disabled={status === "loading"}
                    className="px-6 py-2.5 text-sm font-medium rounded-xl border border-border-default text-text-secondary hover:bg-surface-muted transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={status === "loading"}
                    className={cn(
                      "px-6 py-2.5 text-sm rounded-xl bg-brand-primary text-brand-primary-foreground font-bold shadow-lg shadow-brand-primary/20 transition-all hover:bg-brand-primary/90 active:scale-95 disabled:opacity-50",
                      shaking && "animate-shake"
                    )}
                  >
                    {status === "loading" ? "Sending…" : "Submit"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
