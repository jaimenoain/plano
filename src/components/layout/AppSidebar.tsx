import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { PlanoLogo } from "@/components/common/PlanoLogo";
import {
  Activity,
  Users,
  User as UserIcon,
  Play,
  Search,
  ChevronsUpDown,
  Settings,
  LogOut,
  Bell,
} from "lucide-react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUserProfile } from "@/features/profile/hooks/useUserProfile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
  { icon: Activity, label: "Feed",          path: "/" },
  { icon: Play,     label: "Explore",       path: "/explore" },
  { icon: Search,   label: "Search",        path: "/search" },
  { icon: Users,    label: "Connect",       path: "/connect" },
  { icon: Bell,     label: "Notifications", path: "/notifications" },
  { icon: UserIcon, label: "You",           path: "/profile" },
];

function UserMenu() {
  const { user, signOut } = useAuth();
  const { profile } = useUserProfile();
  const { isMobile } = useSidebar();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (!user) return null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-sm px-3 py-2 text-sm font-medium text-text-primary hover:bg-surface-card transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2">
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarImage
                  src={profile?.avatar_url || ""}
                  alt={profile?.username || user?.email || ""}
                />
                <AvatarFallback className="text-xs">
                  {(profile?.username || user?.email || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left leading-tight min-w-0">
                <span className="truncate font-semibold text-sm">
                  {profile?.username || "User"}
                </span>
                <span className="truncate text-xs text-text-secondary">
                  {user?.email || ""}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto h-4 w-4 flex-shrink-0 text-text-secondary" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuItem asChild>
              <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                <UserIcon className="h-4 w-4" />
                Your profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                <Settings className="h-4 w-4" />
                Edit profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="gap-2 cursor-pointer text-feedback-destructive focus:text-feedback-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar
      collapsible="offcanvas"
      className="border-r border-sidebar-border bg-sidebar"
    >
      {/* Logo area — p-6 per COMPONENT_SPEC §9. !p-6 overrides SidebarHeader default p-2. */}
      <SidebarHeader className="!p-6">
        <Link to="/" className="inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-sm">
          <PlanoLogo className="h-8 w-auto" />
        </Link>
      </SidebarHeader>

      {/* Nav list — flex-1 overflow-y-auto handled by SidebarContent */}
      <SidebarContent>
        {/* !p-0 overrides SidebarGroup default p-2; nav items carry their own px-3 py-2 */}
        <SidebarGroup className="!p-0">
          <SidebarGroupContent>
            {/* px-3 py-4 per spec; gap-1 is SidebarMenu default */}
            <SidebarMenu className="px-3 py-4">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <Link
                      to={item.path}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-sm w-full text-sm font-medium text-text-primary transition-colors duration-150",
                        isActive
                          ? "bg-surface-card border border-border-default border-l-2 border-brand-primary font-semibold"
                          : "bg-transparent hover:bg-surface-card"
                      )}
                    >
                      <item.icon
                        className="h-5 w-5 flex-shrink-0"
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer — p-4 border-t per COMPONENT_SPEC §9. !p-4 overrides SidebarFooter default p-2. */}
      <SidebarFooter className="!p-4 border-t border-sidebar-border">
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
