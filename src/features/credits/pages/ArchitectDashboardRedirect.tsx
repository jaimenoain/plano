import { Navigate } from "react-router";

/** Bookmarks: legacy dashboard entry → `/portfolio` (PersonDashboard). */
export default function ArchitectDashboardRedirect() {
  return <Navigate to="/portfolio" replace />;
}
