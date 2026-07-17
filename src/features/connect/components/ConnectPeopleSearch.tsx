/**
 * ConnectPeopleSearch.tsx — the discovery entry point for /connect.
 *
 * A24 editorial: a single flat search field (no card chrome) that, once the
 * query reaches the search threshold, replaces the discovery grid with a flat
 * border-separated list of followable users. Reuses the existing username
 * `useUserSearch` hook and the shared `UserRow` (so Follow works inline).
 *
 * `query` is controlled by the parent (Connect) so the page can hide the
 * discovery grid while a search is active — both sides use MIN_QUERY_LEN as the
 * single "search is active" threshold.
 */
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { useUserSearch } from "@/features/search";
import { UserRow } from "./UserRow";

/** Minimum characters before a search fires — matches `useUserSearch`. */
export const MIN_QUERY_LEN = 3;

/** True once `query` is long enough that search results should own the page. */
export function isSearchActive(query: string) {
  return query.trim().length >= MIN_QUERY_LEN;
}

interface ConnectPeopleSearchProps {
  query: string;
  onQueryChange: (next: string) => void;
}

export function ConnectPeopleSearch({ query, onQueryChange }: ConnectPeopleSearchProps) {
  const active = isSearchActive(query);
  const { users, isLoading } = useUserSearch({ searchQuery: query, limit: 12, enabled: active });

  return (
    <div>
      {/* ── Search field ── */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        <Input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search people by username"
          aria-label="Search people by username"
          className="h-11 rounded-sm border-border-default pl-10 pr-10"
        />
        {active && isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-text-secondary" />
        )}
      </div>

      {/* ── Results — only while a search is active ── */}
      {active && (
        <div className="mt-8">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-4 w-4 animate-spin text-text-disabled" />
            </div>
          ) : users.length > 0 ? (
            <div>
              <p className="eyebrow tracking-widest mb-4">
                {users.length} {users.length === 1 ? "result" : "results"}
              </p>
              <div>
                {users.map((u) => (
                  <UserRow key={u.id} user={u} showFollowButton />
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              eyebrow="No people found"
              message={`No one matching “${query.trim()}”. Try a different username.`}
            />
          )}
        </div>
      )}
    </div>
  );
}
