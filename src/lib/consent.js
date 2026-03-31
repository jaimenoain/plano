import { GA_MEASUREMENT_ID } from "@/lib/analytics";
const CONSENT_KEY = "plano-analytics-consent";
export function getConsent() {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === "granted" || stored === "denied")
        return stored;
    return "pending";
}
export function setConsent(status) {
    localStorage.setItem(CONSENT_KEY, status);
    if (status === "granted") {
        loadAnalytics();
    }
}
export function loadAnalytics() {
    if (document.querySelector('script[src*="googletagmanager"]'))
        return;
    const script = document.createElement("script");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.async = true;
    document.head.appendChild(script);
    window.dataLayer = window.dataLayer || [];
    function gtag(...args) {
        window.dataLayer.push(args);
    }
    gtag("js", new Date());
    gtag("config", GA_MEASUREMENT_ID);
    window.gtag = gtag;
}
