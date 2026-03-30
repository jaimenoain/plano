import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getConsent, setConsent } from "@/lib/consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getConsent() !== "pending") return undefined;
    const timer = setTimeout(() => setVisible(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const handleAccept = () => {
    setConsent("granted");
    setVisible(false);
  };

  const handleDecline = () => {
    setConsent("denied");
    setVisible(false);
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border-default bg-surface-default p-4 shadow-lg"
      role="dialog"
      aria-label="Cookie preferences"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text-secondary">
          We use cookies to understand how you use Plano and improve your experience.{" "}
          <a href="/terms" className="underline hover:text-text-primary">
            Learn more
          </a>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="ghost" size="sm" onClick={handleDecline}>
            Decline
          </Button>
          <Button size="sm" onClick={handleAccept}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
