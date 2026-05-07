import {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  LogOut,
  Merge,
  ShieldAlert,
  Image,
  Map,
  History,
  Trash2,
  FileCheck,
  Flag,
  UserCircle,
  Factory,
  Home,
  MessageSquare,
  CalendarDays,
  Shield,
  Globe2,
  Trophy,
} from "lucide-react";
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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useAuth } from "@/features/auth/hooks/useAuth";

const managementItems = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Buildings",
    url: "/admin/buildings",
    icon: Building2,
  },
  {
    title: "Merge Duplicates",
    url: "/admin/merge",
    icon: Merge,
  },
  {
    title: "Users",
    url: "/admin/users",
    icon: Users,
  },
  {
    title: "Ambassadors",
    url: "/admin/ambassadors",
    icon: Shield,
  },
  {
    title: "Ambassador coverage",
    url: "/admin/ambassadors/coverage",
    icon: Globe2,
  },
  {
    title: "Moderation",
    url: "/admin/moderation",
    icon: ShieldAlert,
  },
  {
    title: "Image Wall",
    url: "/admin/images",
    icon: Image,
  },
  {
    title: "Photo Analytics",
    url: "/admin/photos",
    icon: Map,
  },
  {
    title: "Storage Jobs",
    url: "/admin/storage-jobs",
    icon: Trash2,
  },
  {
    title: "Audit Logs",
    url: "/admin/audit",
    icon: History,
  },
  {
    title: "System",
    url: "/admin/system",
    icon: Settings,
  },
  {
    title: "Feedback",
    url: "/admin/feedback",
    icon: MessageSquare,
  },
  {
    title: "Events",
    url: "/admin/events",
    icon: CalendarDays,
  },
  {
    title: "Awards",
    url: "/admin/awards",
    icon: Trophy,
  },
  {
    title: "Award Claims",
    url: "/admin/awards/claims",
    icon: Trophy,
  },
  {
    title: "Award Suggestions",
    url: "/admin/awards/suggestions",
    icon: Trophy,
  },
];

const creditsItems = [
  {
    title: "Flagged credits",
    url: "/admin/credits/flagged",
    icon: Flag,
  },
  {
    title: "Entity claims",
    url: "/admin/claims",
    icon: FileCheck,
  },
  {
    title: "People",
    url: "/admin/credits/people",
    icon: UserCircle,
  },
  {
    title: "Companies",
    url: "/admin/credits/companies",
    icon: Factory,
  },
];

import { useSuggestions, useAwardClaimRequests } from "@/features/awards/hooks/useAwards";

export function AdminSidebar() {
  const location = useLocation();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { data: suggestions = [] }    = useSuggestions('pending');
  const { data: claimRequests = [] }  = useAwardClaimRequests('pending');
  const pendingCount      = suggestions.length;
  const pendingClaimCount = claimRequests.length;

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
                <div className="flex flex-col gap-0.5 leading-none">
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
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      item.url === "/admin/ambassadors"
                        ? location.pathname.startsWith("/admin/ambassadors") &&
                            location.pathname !== "/admin/ambassadors/coverage"
                        : location.pathname === item.url
                    }
                    tooltip={item.title}
                  >
                    <Link to={item.url} className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <item.icon />
                        <span>{item.title}</span>
                      </div>
                      {item.url === "/admin/awards/suggestions" && pendingCount > 0 && (
                        <span className="bg-brand-primary text-text-inverse text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center shrink-0">
                          {pendingCount}
                        </span>
                      )}
                      {item.url === "/admin/awards/claims" && pendingClaimCount > 0 && (
                        <span className="bg-brand-primary text-text-inverse text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center shrink-0">
                          {pendingClaimCount}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Credits</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {creditsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut}>
              <LogOut />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
