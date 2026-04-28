"use client";

import { useState, useRef } from "react";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { capturedErrors } from "@/components/providers/ConsoleErrorInterceptor";
import { cn } from "@/lib/utils";

type FeedbackType = "bug" | "ux_improvement" | "feature_idea" | "other";
type Status = "idle" | "loading" | "success" | "error" | "rate_limited";
type ScreenshotState = "none" | "capturing" | "attached";

const TYPES: { value: FeedbackType; emoji: string; label: string }[] = [
  { value: "bug", emoji: "🐛", label: "Bug report" },
  { value: "ux_improvement", emoji: "✨", label: "UX improvement" },
  { value: "feature_idea", emoji: "💡", label: "Feature idea" },
  { value: "other", emoji: "💬", label: "Other" },
];

async function captureScreenshot(): Promise<string | null> {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: "browser" } as MediaTrackConstraints,
    });
    const video = document.createElement("video");
    video.srcObject = stream;
    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => resolve();
    });
    await video.play();
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    stream.getTracks().forEach((t) => t.stop());
    return canvas.toDataURL("image/webp", 0.7);
  } catch {
    return null;
  }
}

export function FeedbackWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [triggerHovered, setTriggerHovered] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [screenshotState, setScreenshotState] = useState<ScreenshotState>("none");
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
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
    setScreenshotState("none");
    setScreenshotDataUrl(null);
    setShaking(false);
  }

  async function handleScreenshot() {
    setScreenshotState("capturing");
    const dataUrl = await captureScreenshot();
    if (dataUrl) {
      setScreenshotDataUrl(dataUrl);
      setScreenshotState("attached");
    } else {
      setScreenshotState("none");
    }
  }

  function removeScreenshot() {
    setScreenshotDataUrl(null);
    setScreenshotState("none");
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
          },
          ...(screenshotDataUrl ? { screenshotDataUrl } : {}),
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
      setTimeout(() => {
        setOpen(false);
        setTimeout(reset, 300);
      }, 1800);
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      {/* Corner trigger */}
      <div
        className={cn(
          "fixed bottom-0 right-0 z-50 overflow-hidden cursor-pointer relative",
          "transition-[width,height] duration-500 ease-out motion-reduce:transition-none",
          isTriggerExpanded ? "size-16" : "size-6"
        )}
        onMouseEnter={() => setTriggerHovered(true)}
        onMouseLeave={() => setTriggerHovered(false)}
        onClick={openDialog}
        role="button"
        aria-label="Send feedback"
      >
        <svg
          className="size-full block"
          viewBox="0 0 64 64"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <polygon
            points="64,0 64,64 0,64"
            fill="var(--brand-primary)"
            opacity="0.75"
          />
        </svg>
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center pointer-events-none text-brand-primary-foreground",
            "transition-opacity duration-500 ease-out motion-reduce:transition-none",
            isTriggerExpanded ? "opacity-100" : "opacity-0"
          )}
          aria-hidden
        >
          <MessageCircle className="size-5" strokeWidth={1.5} />
        </span>
      </div>

      {/* Dialog */}
      {open && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center sm:items-center items-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeDialog}
          />

          {/* Panel */}
          <div className="relative w-full max-w-[448px] rounded-t-lg sm:rounded-lg bg-surface-overlay border border-border-default shadow-xl mx-0 sm:mx-4">
            {status === "success" ? (
              <div className="flex items-center justify-center py-12 text-lg font-medium text-text-primary">
                ✅ Thanks for the feedback!
              </div>
            ) : (
              <div className="p-5 flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-text-primary">
                    Send feedback
                  </h2>
                  <button
                    onClick={closeDialog}
                    className="text-text-secondary hover:text-text-primary transition-colors text-xl leading-none"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                {/* Type selector */}
                <div className="grid grid-cols-2 gap-2">
                  {TYPES.map(({ value, emoji, label }) => (
                    <button
                      key={value}
                      onClick={() => setFeedbackType(value)}
                      className={[
                        "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                        feedbackType === value
                          ? "border-brand-primary bg-brand-primary/10 text-text-primary font-medium"
                          : "border-border-default bg-surface-default text-text-secondary hover:border-brand-primary/50",
                      ].join(" ")}
                    >
                      <span>{emoji}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                {/* Screenshot button */}
                <div className="flex items-center gap-2">
                  {screenshotState === "none" && (
                    <button
                      onClick={handleScreenshot}
                      className="text-sm border border-border-default rounded-md px-3 py-1.5 text-text-secondary hover:border-border-strong transition-colors"
                    >
                      📎 Attach screenshot
                    </button>
                  )}
                  {screenshotState === "capturing" && (
                    <span className="text-sm text-text-secondary flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 rounded-full border-2 border-text-secondary border-t-transparent animate-spin" />
                      Capturing…
                    </span>
                  )}
                  {screenshotState === "attached" && (
                    <span className="text-sm flex items-center gap-2">
                      <span className="text-feedback-success font-medium">✓ Screenshot attached</span>
                      <button
                        onClick={removeScreenshot}
                        className="text-text-secondary hover:text-text-primary transition-colors"
                      >
                        ✕ Remove
                      </button>
                    </span>
                  )}
                </div>

                {/* Textarea */}
                <textarea
                  rows={4}
                  className="w-full resize-none rounded-md border border-border-default bg-surface-default px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  placeholder="Describe what happened, what you expected, or your idea…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={status === "loading"}
                />

                {/* Error message */}
                {(status === "error" || status === "rate_limited") && (
                  <p className="text-sm text-feedback-destructive">
                    {status === "rate_limited"
                      ? "Too many submissions, please try again later."
                      : "Something went wrong. Please try again."}
                  </p>
                )}

                {/* Footer */}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={closeDialog}
                    disabled={status === "loading"}
                    className="px-4 py-2 text-sm rounded-md border border-border-default text-text-secondary hover:border-border-strong transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={status === "loading"}
                    className={[
                      "px-4 py-2 text-sm rounded-md bg-brand-primary text-brand-primary-foreground font-medium transition-colors hover:bg-brand-primary-hover disabled:opacity-50",
                      shaking ? "animate-shake" : "",
                    ].join(" ")}
                  >
                    {status === "loading" ? "Sending…" : "Send feedback"}
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
