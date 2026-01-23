import { Bell, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PlanoLogo } from "@/components/common/PlanoLogo";

interface HeaderProps {
  title?: string;
  showLogo?: boolean;
  showBack?: boolean;
  action?: ReactNode;
}

export function Header({ title, showLogo = true, action }: HeaderProps) {
  const location = useLocation();
  const { user } = useAuth();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!user) return;

    const checkUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      
      setHasUnread(!!count && count > 0);
    };

    checkUnread();
  }, [user, location.pathname]);

  const showBadge = hasUnread && location.pathname !== "/notifications";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass safe-area-pt transition-all duration-300">
      <div className="flex items-center justify-between h-16 px-4 max-w-7xl mx-auto w-full">
        {/* Left Section: Logo or Title */}
        <div className="flex-1 flex items-center justify-start">
          {showLogo ? (
            <Link to="/">
              <PlanoLogo className="h-10 w-auto" />
            </Link>
          ) : (
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate max-w-[200px]">
              {title}
            </h1>
          )}
        </div>

        {/* Right Section: Notifications and Profile */}
        <div className="flex items-center gap-2">
          {action}

          {/* Increased touch target size (h-10 w-10) for accessibility */}
          <Link 
            to="/notifications" 
            className="relative h-10 w-10 flex items-center justify-center rounded-full text-foreground hover:text-primary hover:bg-accent transition-all"
            aria-label="Notifications"
          >
            <Bell className="h-6 w-6" />
            {showBadge && (
              <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-background shadow-sm"></span>
              </span>
            )}
          </Link>

          <Link 
            to="/profile" 
            className="h-10 w-10 flex items-center justify-center rounded-full text-foreground hover:text-primary hover:bg-accent transition-all"
            aria-label="My Profile"
          >
            <User className="h-6 w-6" />
          </Link>
        </div>
      </div>
    </header>
  );
}
