import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
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
  X,
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
  label: string;
  path: string;
  isActive: boolean;
}

function NavItem({ label, path, isActive }: NavItemProps) {
  const { setOpenMobile, isMobile, setOpen } = useSidebar();

  const handleClick = () => {
    if (isMobile) setOpenMobile(false);
    else setOpen(false);
  };

  return (
    <SidebarMenuItem className="list-none">
      <Link
        to={path}
        onClick={handleClick}
        className={cn(
          "group flex items-center px-8 py-3 w-full transition-colors duration-150",
          "text-2xl font-bold tracking-tight leading-none",
          isActive
            ? "text-white"
            : "text-white/50 hover:text-white"
        )}
      >
        <span className="relative">
          {label}
          {/* Active indicator: a thin white underline */}
          {isActive && (
            <span className="absolute -bottom-0.5 left-0 w-full h-[2px] bg-white" />
          )}
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
            <button className="flex w-full items-center gap-3 px-8 py-3 text-sm text-white/60 hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30">
              <Avatar className="h-7 w-7 flex-shrink-0 ring-1 ring-white/20">
                <AvatarImage
                  src={profile?.avatar_url || ""}
                  alt={profile?.username || user?.email || ""}
                />
                <AvatarFallback className="text-xs font-bold bg-white/10 text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left leading-tight min-w-0">
                <span className="truncate font-bold text-sm text-white">
                  {profile?.username || "User"}
                </span>
                <span className="truncate text-xs text-white/40">
                  {user?.email || ""}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56 bg-zinc-900 border border-white/10 text-white"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuItem asChild>
              <Link to="/profile" className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white focus:text-white focus:bg-white/10">
                <UserIcon className="h-4 w-4" />
                Your profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings" className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white focus:text-white focus:bg-white/10">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="gap-2 cursor-pointer text-red-400 focus:text-red-300 focus:bg-white/10"
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

// ─── CloseButton ─────────────────────────────────────────────────────────────
function CloseButton() {
  const { setOpen, setOpenMobile, isMobile } = useSidebar();
  return (
    <button
      onClick={() => isMobile ? setOpenMobile(false) : setOpen(false)}
      className="p-1 text-white/40 hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 rounded-sm"
      aria-label="Close menu"
    >
      <X className="h-5 w-5" strokeWidth={1.5} />
    </button>
  );
}

// ─── AppSidebar ───────────────────────────────────────────────────────────────
/**
 * Pitch-black overlay sidebar. Triggered by the hamburger in MainLayout's header.
 * Uses collapsible="offcanvas" so the sidebar slides in/out as a full overlay
 * with no icon-rail remnant on desktop.
 */
export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar
      collapsible="offcanvas"
      className="border-r-0 bg-black"
      style={{ "--sidebar-background": "0 0% 0%" } as React.CSSProperties}
    >
      {/* ── Header: logo + close ── */}
      <SidebarHeader className="flex flex-row items-center justify-between px-8 py-6 border-b border-white/10">
        <Link
          to="/"
          className="flex items-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 rounded-sm"
        >
          {/* Invert the logo to white on black */}
          <PlanoLogo className="h-7 w-auto brightness-0 invert" />
        </Link>
        <CloseButton />
      </SidebarHeader>

      {/* ── Nav ── */}
      <SidebarContent className="py-6">
        {/* Main navigation */}
        <SidebarGroup className="!p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0">
              {mainNavItems.map((item) => (
                <NavItem
                  key={item.path}
                  label={item.label}
                  path={item.path}
                  isActive={location.pathname === item.path}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Account — separated by a faint rule */}
        <SidebarGroup className="!p-0 mt-6 pt-6 border-t border-white/10">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0">
              {accountNavItems.map((item) => (
                <NavItem
                  key={item.path}
                  label={item.label}
                  path={item.path}
                  isActive={location.pathname === item.path}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── User footer ── */}
      <SidebarFooter className="border-t border-white/10 py-4">
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}