import { Link, Outlet, useLocation } from "react-router";
import { AmbassadorGuard } from "./AmbassadorGuard";
import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Target, Users, Settings2 } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { redirect, type LoaderFunctionArgs } from "react-router";
import { createSupabaseServerClient } from "@/lib/supabase.server";

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
    return redirect("/embassy/contribute", { headers: responseHeaders });
  }
  return null;
}

export default function EmbassyLayout() {
  const { user } = useAuth();
  const location = useLocation();

  // Fetch membership to check roles for Leadership tab visibility
  const { data: membership } = useQuery({
    queryKey: ["ambassador-membership", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ambassador_memberships")
        .select("role, status, onboarded_at, chapter_id")
        .eq("user_id", user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const isLeader = membership?.role === "exco" || membership?.role === "president";

  const navItems = [
    { label: "Contribute", href: "/embassy/contribute", icon: LayoutDashboard },
    { label: "My Goals", href: "/embassy/goals", icon: Target },
    { label: "Chapter Projects", href: "/embassy/projects", icon: Users },
    ...(isLeader ? [{ label: "Leadership", href: "/embassy/leadership", icon: Settings2 }] : []),
  ];

  return (
    <AmbassadorGuard>
      <AppLayout title="Embassy" showLogo={false}>
        <div className="flex flex-col min-h-screen bg-background">
          {/* Shared Navigation Tab Bar */}
          <header className="sticky top-0 z-40 w-full border-b border-border-default bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center overflow-x-auto no-scrollbar">
              <nav className="flex items-center space-x-6 text-sm font-medium">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.href || (item.href === "/embassy/contribute" && location.pathname === "/embassy");
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        "flex items-center gap-2 transition-colors hover:text-foreground/80 py-4 border-b-2",
                        isActive 
                          ? "border-brand-primary text-foreground" 
                          : "border-transparent text-foreground/60"
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
            <div className="container py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </main>
        </div>
      </AppLayout>
    </AmbassadorGuard>
  );
}
