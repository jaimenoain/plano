import { Link, useNavigate } from "react-router";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUserProfile } from "@/features/profile/hooks/useUserProfile";
import { PlanoLogo } from "@/components/common/PlanoLogo";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useWaitlistSignup } from "@/features/waitlist/WaitlistSignupProvider";
import { useUnreadNotifications, NotificationBell } from "@/features/notifications";

export function MobileTopBar() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { openWaitlistDialog } = useWaitlistSignup();
  const navigate = useNavigate();
  const { count: unreadCount } = useUnreadNotifications();

  const initials = (profile?.username || user?.email || "U")
    .charAt(0)
    .toUpperCase();

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-surface-default border-b border-border-default safe-area-pt">
      <div className="h-14 flex items-center justify-between px-1">
        {/* Left: Hamburger */}
        <SidebarTrigger className="h-auto min-h-11 min-w-11 w-auto border-0 bg-transparent p-2 shadow-none hover:bg-transparent active:scale-100 [&_svg]:size-6!" />

        {/* Center: Logo (absolutely centred so left/right slots don't shift it) */}
        <Link
          to="/"
          className="absolute left-1/2 -translate-x-1/2 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
          aria-label="Plano · Home"
        >
          <PlanoLogo className="text-base text-text-primary" />
        </Link>

        {/* Right: signed-in — Bell + Avatar; signed-out — waitlist + Log in */}
        <div className="flex items-center gap-1 pr-1 shrink-0">
          {user ? (
            <>
              <Link
                to="/notifications"
                className="relative h-11 w-11 flex items-center justify-center rounded-sm text-text-primary"
                aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
              >
                <NotificationBell count={unreadCount} iconClassName="h-5 w-5" />
              </Link>
              <Link
                to="/profile"
                className="h-11 w-11 flex items-center justify-center rounded-sm"
                aria-label="Profile"
              >
                <Avatar className="h-7 w-7 ring-1 ring-border-default">
                  <AvatarImage
                    src={profile?.avatar_url || ""}
                    alt={profile?.username || user?.email || ""}
                  />
                  <AvatarFallback className="text-xs font-bold bg-surface-muted text-text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 px-2 text-xs font-semibold text-text-primary"
                onClick={openWaitlistDialog}
              >
                Join list
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 px-2 text-xs font-semibold text-text-primary"
                onClick={() => navigate("/login")}
              >
                Log in
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
