import { GA_MEASUREMENT_ID } from "@/lib/analytics";

const CONSENT_KEY = "plano-analytics-consent";

export type ConsentStatus = "granted" | "denied" | "pending";

export function getConsent(): ConsentStatus {
  const stored = localStorage.getItem(CONSENT_KEY);
  if (stored === "granted" || stored === "denied") return stored;
  return "pending";
}

export function setConsent(status: "granted" | "denied"): void {
  localStorage.setItem(CONSENT_KEY, status);
  if (status === "granted") {
    loadAnalytics();
    window.dispatchEvent(new Event("plano-consent-granted"));
  }
}

export function loadAnalytics(): void {
  if (!GA_MEASUREMENT_ID) return;
  if (document.querySelector('script[src*="googletagmanager"]')) return;

  const script = document.createElement("script");
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  script.async = true;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  }
  gtag("js", new Date());
  gtag("config", GA_MEASUREMENT_ID);

  window.gtag = gtag;
}
