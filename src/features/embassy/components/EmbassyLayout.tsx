import { useEffect } from "react";
import { Link, Outlet, useLocation, redirect, type LoaderFunctionArgs } from "react-router";
import { AmbassadorGuard } from "./AmbassadorGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";
import {
  embassyNavItemsFor,
  isEmbassyNavItemActive,
} from "@/components/layout/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createSupabaseServerClient } from "@/lib/supabase.server";

// Module-level caches so the same SPA session doesn't re-fire on every layout remount.
const searchTriggeredForChapters = new Set<string>();
const researchQueueTriggeredForChapters = new Set<string>();

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const responseHeaders = new Headers();
  const supabaseServer = createSupabaseServerClient(request, responseHeaders);

  const { data: { user } } = await supabaseServer.auth.getUser();
  if (user) {
    const { data: membership } = await supabaseServer
      .from("ambassador_memberships")
      .select("status, onboarded_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      membership &&
      membership.status === "active" &&
      !membership.onboarded_at &&
      url.pathname !== "/embassy/welcome"
    ) {
      return redirect("/embassy/welcome", { headers: responseHeaders });
    }
  }

  if (url.pathname === "/embassy" || url.pathname === "/embassy/") {
    return redirect("/embassy/goals", { headers: responseHeaders });
  }
  return null;
}

export default function EmbassyLayout() {
  const { user } = useAuth();
  const location = useLocation();

  // Fetch membership to check roles for Leadership tab visibility.
  // Also selects chapter name so /embassy/goals can share this cache entry
  // without an extra round-trip (same queryKey = TanStack Query deduplicates).
  const { data: membership } = useQuery({
    queryKey: ["ambassador-membership", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ambassador_memberships")
        .select("role, status, onboarded_at, chapter_id, chapter:ambassador_chapters(name)")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .order("joined_at", { ascending: false })
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const isLeader = ["exco", "president", "global_team", "global_leaders", "global_president"].includes(membership?.role ?? "");

  // Server enforces the 4-day gate. This is opportunistic — never block the layout on it.
  useEffect(() => {
    const chapterId = membership?.chapter_id;
    if (!membership || membership.status !== "active" || !chapterId) return;
    if (location.pathname === "/embassy/welcome") return;
    if (searchTriggeredForChapters.has(chapterId)) return;
    searchTriggeredForChapters.add(chapterId);
    fetch("/api/embassy/event-search", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "run", chapter_id: chapterId }),
    })
      .then((r) => {
        // Opportunistic kick-off: never block the layout, but don't hide the
        // failure either — the Events tool reads run status for the user-facing
        // state; this warning is the operator breadcrumb.
        if (!r.ok) console.warn(`[embassy] event-search kick-off failed (${r.status})`);
      })
      .catch(() => undefined);
  }, [membership, location.pathname]);

  // Fire-and-forget: fill the research queue up to 10 items per chapter per session.
  // The server returns immediately if the queue is already full (cheap check).
  useEffect(() => {
    const chapterId = membership?.chapter_id;
    if (!membership || membership.status !== "active" || !chapterId) return;
    if (location.pathname === "/embassy/welcome") return;
    if (researchQueueTriggeredForChapters.has(chapterId)) return;
    researchQueueTriggeredForChapters.add(chapterId);
    fetch("/api/embassy/research-queue", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "fill", chapter_id: chapterId }),
    })
      .then((r) => {
        if (!r.ok) console.warn(`[embassy] research-queue kick-off failed (${r.status})`);
      })
      .catch(() => undefined);
  }, [membership, location.pathname]);

  const navItems = embassyNavItemsFor(isLeader);

  return (
    <AmbassadorGuard>
      <AppLayout title="Embassy" showLogo={false}>
        <div className="flex flex-col min-h-screen bg-surface-default">
          {/* Shared Navigation Tab Bar */}
          <header className="sticky top-0 z-40 w-full border-b border-border-default bg-surface-default/95 backdrop-blur-sm supports-backdrop-filter:bg-surface-default/70">
            <div className="mx-auto w-full max-w-[1120px] px-4 sm:px-6 lg:px-8 flex h-14 items-center overflow-x-auto no-scrollbar">
              <nav className="flex items-center space-x-6 text-sm font-medium">
                {navItems.map((item) => {
                  const isActive = isEmbassyNavItemActive(item, location.pathname);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "flex items-center gap-2 transition-colors hover:text-text-primary py-4 border-b-2",
                        isActive
                          ? "border-text-primary text-text-primary"
                          : "border-transparent text-text-secondary"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </header>

          <main className="flex-1">
            <div className="mx-auto w-full max-w-[1120px] py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </main>
        </div>
      </AppLayout>
    </AmbassadorGuard>
  );
}
