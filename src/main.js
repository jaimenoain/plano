import { jsx as _jsx } from "react/jsx-runtime";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { getConsent, loadAnalytics } from "@/lib/consent";
import { initSentry } from "@/lib/sentry";
initSentry();
if (getConsent() === "granted") {
    loadAnalytics();
}
createRoot(document.getElementById("root")).render(_jsx(App, {}));
