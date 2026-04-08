import { Navigate } from "react-router";

/** @deprecated Use `/portfolio` (PersonDashboard). Kept for bookmarks. */
export default function ArchitectDashboard() {
  return <Navigate to="/portfolio" replace />;
}
