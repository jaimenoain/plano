import { Link } from "react-router";

import { RailHeader, RailModule } from "@/components/ui/rail";

/**
 * "My Library" — a rail shortcut into the member's personal map
 * (`/search?mode=library`): every building they've saved, visited, or rated.
 * Sits in the rail's personal cluster, just below the bucket list. Auth-gated
 * like the destination, so it renders only for signed-in members.
 */
export function MyLibraryModule({ userId }: { userId?: string }) {
  if (!userId) return null;

  return (
    <RailModule>
      <RailHeader label="My Library" />
      <p className="text-[13px] leading-snug text-text-secondary">
        Your saved, visited, and rated buildings on the map.
      </p>
      <div className="mt-4">
        <Link to="/search?mode=library" className="cta-link">
          Open My Library
        </Link>
      </div>
    </RailModule>
  );
}
