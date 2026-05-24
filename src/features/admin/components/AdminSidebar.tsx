import { LayoutDashboard, LogOut, Home, ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { adminNavGroups } from "@/features/admin/components/adminNavItems";

import { useSuggestions, useAwardClaimRequests } from "@/features/awards/hooks/useAwards";
import { useQuery } from "@tanstack/react-query";
import { fetchInterventionFlags } from "@/features/admin/api/programme";

function SidebarCollapseChevron() {
  const { toggleSidebar, open, isMobile } = useSidebar();
  if (isMobile) return null;
  return (
    <button
      onClick={toggleSidebar}
      aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
      className="absolute right-0 top-[60px] z-20 flex h-5 w-5 translate-x-1/2 items-center justify-center rounded-full border border-border-default bg-surface-card shadow-sm transition-colors hover:bg-surface-muted"
    >
      {open ? (
        <ChevronLeft className="size-3 text-text-secondary" />
      ) : (
        <ChevronRight className="size-3 text-text-secondary" />
      )}
    </button>
  );
}

export function AdminSidebar() {
  const location = useLocation();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { data: suggestions = [] }    = useSuggestions('pending');
  const { data: claimRequests = [] }  = useAwardClaimRequests('pending');
  const { data: interventionFlags = [] } = useQuery({
    queryKey: ["admin", "intervention-flags"],
    queryFn: fetchInterventionFlags,
    staleTime: 5 * 60 * 1000,
  });
  const pendingCount         = suggestions.length;
  const pendingClaimCount    = claimRequests.length;
  const interventionCount    = interventionFlags.length;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/admin">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-brand-primary text-brand-primary-foreground">
                  <LayoutDashboard className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                  <span className="font-semibold">Plano Admin</span>
                  <span className="">Console</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === "/admin"}
                  tooltip="Dashboard"
                >
                  <Link to="/admin">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Return to app">
                  <Link to="/">
                    <Home />
                    <span>Return to app</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {adminNavGroups.map(({ label, items }) => (
          <SidebarGroup key={label}>
            <SidebarGroupLabel>{label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={
                        item.url === "/admin/ambassadors"
                          ? location.pathname.startsWith("/admin/ambassadors") &&
                              location.pathname !== "/admin/ambassadors/coverage" &&
                              location.pathname !== "/admin/ambassadors/campaigns" &&
                              location.pathname !== "/admin/ambassadors/applications"
                          : location.pathname === item.url
                      }
                      tooltip={item.title}
                    >
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.url === "/admin/programme/interventions" && interventionCount > 0 && (
                      <SidebarMenuBadge className="bg-feedback-destructive text-feedback-destructive-foreground">
                        {interventionCount}
                      </SidebarMenuBadge>
                    )}
                    {item.url === "/admin/awards/suggestions" && pendingCount > 0 && (
                      <SidebarMenuBadge className="bg-brand-primary text-text-inverse">
                        {pendingCount}
                      </SidebarMenuBadge>
                    )}
                    {item.url === "/admin/awards/claims" && pendingClaimCount > 0 && (
                      <SidebarMenuBadge className="bg-brand-primary text-text-inverse">
                        {pendingClaimCount}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              className="text-feedback-destructive hover:text-feedback-destructive hover:bg-feedback-destructive/10"
            >
              <LogOut />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarCollapseChevron />
    </Sidebar>
  );
}
