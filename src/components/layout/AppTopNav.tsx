import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  Bell,
  Bookmark,
  Briefcase,
  Building2,
  Landmark,
  Layers,
  LogOut,
  Search,
  Settings,
  User as UserIcon,
} from "lucide-react";
import { PlanoLogo } from "@/components/common/PlanoLogo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUserProfile } from "@/features/profile/hooks/useUserProfile";
import { useClaimedPersonForNav } from "@/features/credits/hooks/useClaimedPersonForNav";
import { useStewardCompaniesForNav } from "@/features/credits/hooks/useStewardCompaniesForNav";
import { useAmbassadorNavAccess } from "@/features/ambassadors/hooks/useAmbassadorNavAccess";
import { supabase } from "@/integrations/supabase/client";
import { useWaitlistSignup } from "@/features/waitlist/WaitlistSignupProvider";
import { isNavItemActive, navItemsFor } from "./navigation";

function TopNavLink({
  label,
  path,
  isActive,
}: {
  label: string;
  path: string;
  isActive: boolean;
}) {
  return (
    <Link
      to={path}
      className={cn(
        "relative py-1 text-sm transition-colors duration-150",
        isActive
          ? "font-bold text-text-primary"
          : "font-medium text-text-secondary hover:text-text-primary",
      )}
    >
      {label}
      {isActive && (
        <span className="absolute -bottom-0.5 left-0 w-full h-px bg-text-primary" />
      )}
    </Link>
  );
}

// ─── User menu dropdown ───────────────────────────────────────────────────────

function UserMenuDropdown() {
  const { user, signOut } = useAuth();
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const { data: claimedPersonNav } = useClaimedPersonForNav();
  const { data: stewardCompanies = [] } = useStewardCompaniesForNav();
  const { data: isAmbassador } = useAmbassadorNavAccess();

  if (!user) return null;

  const initials = (profile?.username || user?.email || "U")
    .charAt(0)
    .toUpperCase();

  const ownProfilePath = profile?.username
    ? `/profile/${encodeURIComponent(profile.username)}`
    : "/profile";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
          aria-label="Account menu"
        >
          <Avatar className="h-8 w-8 ring-1 ring-border-default">
            <AvatarImage
              src={profile?.avatar_url || ""}
              alt={profile?.username || user?.email || ""}
            />
            <AvatarFallback className="text-xs font-bold bg-surface-muted text-text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" sideOffset={8} className="w-56">
        <DropdownMenuItem asChild>
          <Link to={ownProfilePath} className="flex items-center gap-2 cursor-pointer">
            <UserIcon className="h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/search?mode=library" className="flex items-center gap-2 cursor-pointer">
            <Bookmark className="h-4 w-4" />
            My Library
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={`${ownProfilePath}?section=collections`} className="flex items-center gap-2 cursor-pointer">
            <Layers className="h-4 w-4" />
            My collections
          </Link>
        </DropdownMenuItem>
        {isAmbassador ? (
          <DropdownMenuItem asChild>
            <Link to="/embassy/contribute" className="flex items-center gap-2 cursor-pointer">
              <Landmark className="h-4 w-4" />
              Ambassador Portal
            </Link>
          </DropdownMenuItem>
        ) : null}
        {claimedPersonNav ? (
          <DropdownMenuItem asChild>
            <Link to="/portfolio" className="flex items-center gap-2 cursor-pointer">
              <Briefcase className="h-4 w-4" />
              My portfolio
            </Link>
          </DropdownMenuItem>
        ) : null}
        {stewardCompanies.length > 0 ? (
          <DropdownMenuItem asChild>
            <Link to="/company-portfolio" className="flex items-center gap-2 cursor-pointer">
              <Building2 className="h-4 w-4" />
              Company portfolio
            </Link>
          </DropdownMenuItem>
        ) : null}
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
  );
}

// ─── AppTopNav ────────────────────────────────────────────────────────────────

export function AppTopNav() {
  const { user } = useAuth();
  const { openWaitlistDialog } = useWaitlistSignup();
  const location = useLocation();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!user) return;
    const checkUnread = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      setHasUnread(!!count && count > 0);
    };
    void checkUnread();
  }, [user, location.pathname]);

  const showBadge = hasUnread && location.pathname !== "/notifications";
  const topNavItems = navItemsFor("top");

  return (
    <header className="hidden md:flex fixed top-0 inset-x-0 z-50 h-16 items-center justify-between px-8 bg-surface-default/92 backdrop-blur-md border-b border-border-default">
      {/* Left: Logo + nav */}
      <div className="flex items-center gap-8 min-w-0">
        <Link
          to="/"
          className="shrink-0 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
          aria-label="Plano · Home"
        >
          <PlanoLogo className="text-base text-text-primary" />
        </Link>

        <nav className="flex items-center gap-[22px]">
          {topNavItems.map((item) => {
            const isActive = isNavItemActive(item, location.pathname);
            return (
              <TopNavLink
                key={item.path}
                label={item.label}
                path={item.path}
                isActive={isActive}
              />
            );
          })}
        </nav>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Link
          to="/search"
          className="h-9 w-9 flex items-center justify-center rounded-sm text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </Link>

        {user ? (
          <>
            <Button asChild variant="ghost" size="sm" className="text-sm font-medium">
              <Link to="/post">Log a visit</Link>
            </Button>

            <Link
              to="/notifications"
              className="relative h-9 w-9 flex items-center justify-center rounded-sm text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {showBadge && (
                <span className="absolute top-2 right-2 h-[7px] w-[7px] rounded-full bg-brand-accent border-[1.5px] border-surface-default" />
              )}
            </Link>
          </>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-sm font-medium"
            onClick={openWaitlistDialog}
          >
            Join the waiting list
          </Button>
        )}

        <UserMenuDropdown />
      </div>
    </header>
  );
}
