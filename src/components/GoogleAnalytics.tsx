import { useEffect } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { GA_MEASUREMENT_ID } from "@/lib/analytics";
import { getConsent, loadAnalytics } from "@/lib/consent";

export const GoogleAnalytics = (): null => {
  const { user, loading } = useAuth();

  useEffect((): void => {
    if (loading) return;
    if (!GA_MEASUREMENT_ID) return;
    if (getConsent() !== "granted") return;

    loadAnalytics();

    if (typeof window.gtag === "function") {
      if (user) {
        window.gtag("config", GA_MEASUREMENT_ID, { user_id: user.id });
      } else {
        window.gtag("config", GA_MEASUREMENT_ID);
      }
    }
  }, [user, loading]);

  return null;
};
