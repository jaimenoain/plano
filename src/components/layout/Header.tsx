import { Bell, ArrowLeft, Search } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PlanoLogo } from "@/components/common/PlanoLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title?: string;
  variant?: 'default' | 'home' | 'map';
  searchBar?: ReactNode;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
  showBack?: boolean;
  // Legacy/Compatibility props - mapped internally
  showLogo?: boolean;
  action?: ReactNode;
}

export function Header({
  title,
  variant = 'default',
  searchBar,
  leftAction,
  rightAction,
  showBack = false,
  showLogo = true,
  action
}: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
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

  // Resolve Variant and Compatibility
  // If variant is default, but showLogo is true (and it's not overridden),
  // we might want to behave like 'home' if that was the old behavior?
  // Actually, old behavior: showLogo=true -> Logo in center.
  // New behavior: variant='home' -> Logo in center.
  // So if showLogo is explicitly false, we are likely in 'default' (Title) mode.
  // If showLogo is true (default), we might be in 'home' mode OR 'default' mode with logo?
  // The old header showed logo by default.
  // Let's assume if variant is passed, it wins.
  // If variant is 'default' (the default value), we check showLogo.
  // If showLogo is true, we treat it as 'home' for backward compat?
  // But wait, 'default' variant usually implies Title.
  // Let's stick to explicit variant usage in new code, but handle legacy:

  const effectiveVariant = variant !== 'default' ? variant : (showLogo ? 'home' : 'default');

  // Left Content Logic
  let leftContent = leftAction;
  if (!leftContent && showBack) {
    leftContent = (
      <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2">
        <ArrowLeft className="h-5 w-5" />
      </Button>
    );
  }

  // Center Content Logic
  let centerContent;
  if (effectiveVariant === 'home') {
    centerContent = (
      <Link to="/" className="min-w-0">
        <PlanoLogo className="h-6 md:h-8 w-auto shrink-0" />
      </Link>
    );
  } else if (effectiveVariant === 'map') {
    centerContent = searchBar || (
      <div className="relative w-full max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search map..."
          className="pl-9 h-9 bg-muted/50 border-none focus-visible:ring-1"
        />
      </div>
    );
  } else {
    // Default / Title
    centerContent = (
      <h1 className="text-xl font-bold tracking-tight text-foreground truncate max-w-[200px] md:max-w-md text-center">
        {title}
      </h1>
    );
  }

  // Right Content Logic
  let rightContent = rightAction || action; // Prefer rightAction, fallback to action (legacy)

  // Always append Bell/Profile if not explicitly replaced?
  // The requirement says "Right Slot: Reserved for global actions".
  // Usually this means Bell is always there unless suppressed.
  // Current implementation had `action` (custom) THEN `Bell`.
  // I will preserve that behavior.

  const defaultGlobalActions = (
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
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b h-16 px-4 transition-all duration-300">
      <div className={cn(
        "h-full w-full max-w-7xl mx-auto items-center",
        effectiveVariant === 'map' ? "flex justify-between gap-4" : "grid grid-cols-3"
      )}>

        {/* Left Slot */}
        <div className="flex items-center justify-start shrink-0">
          {leftContent}
        </div>

        {/* Center Slot */}
        <div className={cn(
          "flex items-center justify-center min-w-0",
          effectiveVariant === 'map' ? "flex-1" : "w-full"
        )}>
          {centerContent}
        </div>

        {/* Right Slot */}
        <div className="flex items-center justify-end gap-2 shrink-0">
          {rightContent}
          {/* We always show Bell for now unless explicitly decided otherwise,
              but maybe we should group 'rightAction' with it.
              If 'rightAction' is strictly the ONLY thing, we lose the Bell.
              Let's append Bell to rightAction.
          */}
          {defaultGlobalActions}
        </div>
      </div>
    </header>
  );
}
