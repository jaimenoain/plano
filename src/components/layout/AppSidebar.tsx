import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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
  Settings,
  LogOut,
  Bell,
} from "lucide-react";
import { useLocation, Link, useNavigate } from "react-router";
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

// ─── Nav data ────────────────────────────────────────────────────────────────

const mainNavItems = [
  { icon: Activity, label: "Feed",    path: "/" },
  { icon: Play,     label: "Explore", path: "/explore" },
  { icon: Search,   label: "Search",  path: "/search" },
  { icon: Users,    label: "Connect", path: "/connect" },
];

const accountNavItems = [
  { icon: Bell,     label: "Notifications", path: "/notifications" },
  { icon: UserIcon, label: "Profile",       path: "/profile" },
  { icon: Settings, label: "Settings",      path: "/settings" },
];

// ─── NavItem ─────────────────────────────────────────────────────────────────

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  path: string;
  isActive: boolean;
}

/**
 * A single nav link. When the sidebar is in icon-only (collapsed) mode,
 * clicking any item expands the panel before navigating.
 * The label is hidden by shadcn's group-data-[collapsible=icon] pattern.
 */
function NavItem({ icon: Icon, label, path, isActive }: NavItemProps) {
  const { open, setOpen } = useSidebar();

  return (
    <SidebarMenuItem>
      <Link
        to={path}
        onClick={() => { if (!open) setOpen(true); }}
        className={cn(
          // All items carry border-l-2 so content never shifts between states.
          "flex items-center gap-3 px-3 py-2 w-full text-sm border-l-2 transition-colors duration-150",
          isActive
            ? "border-brand-primary text-text-primary font-medium"
            : "border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-card"
        )}
      >
        <Icon
          className="h-[18px] w-[18px] flex-shrink-0"
          strokeWidth={isActive ? 2.25 : 1.75}
        />
        {/* Hidden when sidebar is in icon-only mode */}
        <span className="group-data-[collapsible=icon]:hidden truncate">
          {label}
        </span>
      </Link>
    </SidebarMenuItem>
  );
}

// ─── UserMenu ─────────────────────────────────────────────────────────────────

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

  const initials = (profile?.username || user?.email || "U")
    .charAt(0)
    .toUpperCase();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 px-3 py-2 text-sm text-text-primary hover:bg-surface-card transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2">
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarImage
                  src={profile?.avatar_url || ""}
                  alt={profile?.username || user?.email || ""}
                />
                <AvatarFallback className="text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {/* Name + email hidden in icon-only mode; avatar remains as the trigger */}
              <div className="group-data-[collapsible=icon]:hidden grid flex-1 text-left leading-tight min-w-0">
                <span className="truncate font-medium text-sm">
                  {profile?.username || "User"}
                </span>
                <span className="truncate text-xs text-text-secondary">
                  {user?.email || ""}
                </span>
              </div>
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
                Settings
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

// ─── AppSidebar ───────────────────────────────────────────────────────────────

/**
 * Two-tier sidebar: a narrow icon rail (collapsed) + label panel (expanded).
 *
 * collapsible="icon" replaces "offcanvas" so the rail persists on desktop
 * rather than disappearing entirely. shadcn still renders a Sheet overlay on
 * mobile (controlled by isMobile in the provider) so mobile UX is unchanged.
 *
 * --sidebar-width-icon is set to 3.75 rem (60 px) to match the design.
 * If MainLayout's SidebarProvider sets a different default, override it there
 * too (or via CSS: [data-sidebar] { --sidebar-width-icon: 3.75rem; }).
 */
export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar
      collapsible="icon"
      style={{ "--sidebar-width-icon": "3.75rem" } as React.CSSProperties}
      className="border-r border-sidebar-border bg-surface-muted"
    >
      {/* ── Logo ── */}
      <SidebarHeader className="px-3 py-4 border-b border-sidebar-border">
        <Link
          to="/"
          className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-sm"
        >
          {/* Full wordmark when expanded */}
          <PlanoLogo className="h-8 w-auto group-data-[collapsible=icon]:hidden" />
          {/* Monogram when icon-only — centred via the parent's justify-center */}
          <span className="hidden group-data-[collapsible=icon]:block text-base font-medium text-text-primary tracking-tight">
            Pl.
          </span>
        </Link>
      </SidebarHeader>

      {/* ── Nav ── */}
      <SidebarContent className="py-2">

        {/* Main navigation */}
        <SidebarGroup className="!p-0">
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden px-4 pt-3 pb-1 text-[10px] font-medium tracking-[0.1em] uppercase text-text-secondary">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-2 gap-0.5">
              {mainNavItems.map((item) => (
                <NavItem
                  key={item.path}
                  {...item}
                  isActive={location.pathname === item.path}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Account — visually separated with a border */}
        <SidebarGroup className="!p-0 mt-3 pt-3 border-t border-sidebar-border">
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden px-4 pb-1 text-[10px] font-medium tracking-[0.1em] uppercase text-text-secondary">
            Account
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-2 gap-0.5">
              {accountNavItems.map((item) => (
                <NavItem
                  key={item.path}
                  {...item}
                  isActive={location.pathname === item.path}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      {/* ── User footer ── */}
      <SidebarFooter className="!px-2 !py-3 border-t border-sidebar-border">
        <UserMenu />
      </SidebarFooter>

      {/* Rail provides the click-to-collapse strip and the resize handle */}
      <SidebarRail />
    </Sidebar>
  );
}