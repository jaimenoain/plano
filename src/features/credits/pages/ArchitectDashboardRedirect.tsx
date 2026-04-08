import { Navigate } from "react-router";

/** Bookmarks: `/architect/dashboard` → `/portfolio` (PersonDashboard). */
export default function ArchitectDashboardRedirect() {
  return <Navigate to="/portfolio" replace />;
}
