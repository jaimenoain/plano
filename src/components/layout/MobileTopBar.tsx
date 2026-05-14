import { Bell } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUserProfile } from "@/features/profile/hooks/useUserProfile";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PlanoLogo } from "@/components/common/PlanoLogo";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useWaitlistSignup } from "@/features/waitlist/WaitlistSignupProvider";

export function MobileTopBar() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { openWaitlistDialog } = useWaitlistSignup();
  const navigate = useNavigate();
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
    checkUnread();
  }, [user, location.pathname]);

  const showBadge = hasUnread && location.pathname !== "/notifications";

  const initials = (profile?.username || user?.email || "U")
    .charAt(0)
    .toUpperCase();

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-surface-default border-b border-border-default safe-area-pt">
      <div className="h-14 flex items-center justify-between px-1">
        {/* Left: Hamburger */}
        <SidebarTrigger className="h-auto min-h-11 min-w-11 w-auto border-0 bg-transparent p-2 shadow-none hover:bg-transparent active:scale-100 [&_svg]:!size-6" />

        {/* Center: Logo (absolutely centred so left/right slots don't shift it) */}
        <Link
          to="/"
          className="absolute left-1/2 -translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border-default rounded-sm"
          aria-label="Home"
        >
          <PlanoLogo className="text-xl text-text-primary" />
        </Link>

        {/* Right: signed-in — Bell + Avatar; signed-out — waitlist + Log in */}
        <div className="flex items-center gap-1 pr-1 shrink-0">
          {user ? (
            <>
              <Link
                to="/notifications"
                className="relative h-11 w-11 flex items-center justify-center rounded-sm text-text-primary"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {showBadge && (
                  <span className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-feedback-destructive border border-surface-default" />
                )}
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
                onClick={() => navigate("/auth")}
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
