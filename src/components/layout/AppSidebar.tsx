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
  CalendarDays,
  Users,
  User as UserIcon,
  Play,
  Search,
  Settings,
  LogOut,
  Bell,
  X,
  Briefcase,
  Building2,
  ChevronDown,
  type LucideIcon,
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
import { useClaimedPersonForNav } from "@/features/credits/hooks/useClaimedPersonForNav";
import { useStewardCompaniesForNav } from "@/features/credits/hooks/useStewardCompaniesForNav";

// ─── Nav data ────────────────────────────────────────────────────────────────
type MainNavItem = {
  icon: LucideIcon;
  label: string;
  path: string;
  /** Defaults to exact `pathname === path`. */
  isActive?: (pathname: string) => boolean;
};

const mainNavItems: MainNavItem[] = [
  { icon: Activity, label: "Feed", path: "/" },
  {
    icon: CalendarDays,
    label: "Events",
    path: "/events",
    isActive: (pathname) => pathname === "/events" || pathname.startsWith("/events/"),
  },
  { icon: Play, label: "Explore", path: "/explore" },
  { icon: Search, label: "Search", path: "/search" },
  { icon: Users, label: "Connect", path: "/connect" },
];

// ─── NavItem ─────────────────────────────────────────────────────────────────
interface NavItemProps {
  label: string;
  path: string;
  isActive: boolean;
  icon?: LucideIcon;
}

function NavItem({ label, path, isActive, icon: Icon }: NavItemProps) {
  return (
    <SidebarMenuItem className="list-none">
      <Link
        to={path}
        className={cn(
          "group flex items-center gap-3 px-8 py-3 w-full transition-colors duration-150",
          "text-2xl font-bold tracking-tight leading-none",
          isActive
            ? "text-white"
            : "text-white/50 hover:text-white"
        )}
      >
        {Icon ? <Icon className="h-6 w-6 shrink-0 opacity-80" strokeWidth={1.5} aria-hidden /> : null}
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
  const { data: claimedPersonNav } = useClaimedPersonForNav();
  const { data: stewardCompanies = [] } = useStewardCompaniesForNav();
  const ownProfilePath = profile?.username
    ? `/profile/${encodeURIComponent(profile.username)}`
    : "/profile";

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
              <Link
                to="/notifications"
                className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white focus:text-white focus:bg-white/10"
              >
                <Bell className="h-4 w-4" />
                Notifications
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={ownProfilePath} className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white focus:text-white focus:bg-white/10">
                <UserIcon className="h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            {claimedPersonNav ? (
              <DropdownMenuItem asChild>
                <Link
                  to="/portfolio"
                  className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white focus:text-white focus:bg-white/10"
                >
                  <Briefcase className="h-4 w-4" />
                  My portfolio
                </Link>
              </DropdownMenuItem>
            ) : null}
            {stewardCompanies.length > 0 ? (
              <DropdownMenuItem asChild>
                <Link
                  to="/company-portfolio"
                  className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white focus:text-white focus:bg-white/10"
                >
                  <Building2 className="h-4 w-4" />
                  Company portfolio
                </Link>
              </DropdownMenuItem>
            ) : null}
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
      type="button"
      onClick={() => (isMobile ? setOpenMobile(false) : setOpen(false))}
      className={cn(
        "p-1 rounded-sm text-white/40 hover:text-white",
        "transition-[opacity,color] duration-150",
        // Mobile sheet: no hover affordance — keep visible. Desktop overlay: show only while hovering the menu (see `group` on sidebar shell in `sidebar.tsx`) or when this control is keyboard-focused.
        "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30",
      )}
      aria-label="Close menu"
    >
      <X className="h-5 w-5" strokeWidth={1.5} />
    </button>
  );
}

// ─── AppSidebar ───────────────────────────────────────────────────────────────
/**
 * Pitch-black overlay sidebar. Triggered by the floating menu control in MainLayout.
 * Uses collapsible="offcanvas" so the sidebar slides in/out as a full overlay
 * with no icon-rail remnant on desktop.
 */
export function AppSidebar() {
  const location = useLocation();
  const { isMobile } = useSidebar();
  const { data: claimedPersonNav } = useClaimedPersonForNav();
  const { data: stewardCompanies = [] } = useStewardCompaniesForNav();
  const showAccountExtras = Boolean(claimedPersonNav) || stewardCompanies.length > 0;

  return (
    <Sidebar
      collapsible="offcanvas"
      className="border-r-0 text-white"
      style={{ "--sidebar-background": "0 0% 0%" } as React.CSSProperties}
    >
      {/* ── Header: logo + close ── */}
      <SidebarHeader className="flex flex-row items-center justify-between px-8 py-6 border-b border-white/10">
        <Link
          to="/"
          className="flex items-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 rounded-sm"
        >
          <PlanoLogo className="text-[2.5em] leading-none text-white" />
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
                  isActive={(item.isActive ?? ((p) => p === item.path))(location.pathname)}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {showAccountExtras ? (
          <SidebarGroup className="!p-0 mt-6 pt-6 border-t border-white/10">
            <SidebarGroupContent>
              <SidebarMenu className="gap-0">
                {claimedPersonNav ? (
                  <NavItem
                    label="My portfolio"
                    path="/portfolio"
                    icon={Briefcase}
                    isActive={location.pathname === "/portfolio"}
                  />
                ) : null}
                {stewardCompanies.length === 1 ? (
                  <NavItem
                    label={stewardCompanies[0].name}
                    path="/company-portfolio"
                    icon={Building2}
                    isActive={location.pathname === "/company-portfolio"}
                  />
                ) : stewardCompanies.length > 1 ? (
                  <SidebarMenuItem className="list-none">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "group flex w-full items-center gap-3 px-8 py-3 text-left transition-colors duration-150",
                            "text-2xl font-bold tracking-tight leading-none",
                            location.pathname === "/company-portfolio"
                              ? "text-white"
                              : "text-white/50 hover:text-white"
                          )}
                        >
                          <Building2 className="h-6 w-6 shrink-0 opacity-80" strokeWidth={1.5} aria-hidden />
                          <span className="relative min-w-0 flex-1 truncate">
                            My companies
                            {location.pathname === "/company-portfolio" ? (
                              <span className="absolute -bottom-0.5 left-0 h-[2px] w-full max-w-[min(100%,12rem)] bg-white" />
                            ) : null}
                          </span>
                          <ChevronDown className="h-5 w-5 shrink-0 opacity-70" strokeWidth={1.5} aria-hidden />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        className="min-w-56 bg-zinc-900 border border-white/10 text-white"
                        side={isMobile ? "bottom" : "right"}
                        align="start"
                        sideOffset={4}
                      >
                        {stewardCompanies.map((c) => (
                          <DropdownMenuItem key={c.companyId} asChild>
                            <Link
                              to={`/company-portfolio?company=${encodeURIComponent(c.slug)}`}
                              className="cursor-pointer text-white/80 hover:text-white focus:text-white focus:bg-white/10"
                            >
                              {c.name}
                            </Link>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
                ) : null}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>

      {/* ── User footer ── */}
      <SidebarFooter className="border-t border-white/10 py-4">
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}