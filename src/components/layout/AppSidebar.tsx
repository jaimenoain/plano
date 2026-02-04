import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { PlanoLogo } from "@/components/common/PlanoLogo";
import { Activity, Users, User as UserIcon, Play, Search, ChevronsUpDown, Settings, LogOut } from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
  { icon: Activity, label: "Feed", path: "/" },
  { icon: Play, label: "Explore", path: "/explore" },
  { icon: Search, label: "Search", path: "/search" },
  { icon: Users, label: "Connect", path: "/connect" },
  { icon: UserIcon, label: "You", path: "/profile" },
];

function UserMenu({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const { user, signOut } = useAuth();
  const { profile } = useUserProfile();
  const { isMobile } = useSidebar();

  if (!user) return null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu onOpenChange={onOpenChange}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:!justify-center group-data-[collapsible=icon]:!mx-auto"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={profile?.avatar_url || ""} alt={profile?.username || user.email || ""} />
                <AvatarFallback className="rounded-lg">
                  {(profile?.username || user.email || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">{profile?.username || "User"}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuItem asChild>
              <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                <Settings className="size-4" />
                Edit profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function AppSidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const { state, setOpen, isMobile } = useSidebar();
  const isHoveringRef = useRef(false);

  const isMenuOpenRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    isHoveringRef.current = true;
    setOpen(true);
  };

  const handleMouseLeave = () => {
    isHoveringRef.current = false;
    timeoutRef.current = setTimeout(() => {
      if (!isHoveringRef.current && !isMenuOpenRef.current) {
        setOpen(false);
      }
    }, 300);
  };

  const handleMenuOpenChange = (open: boolean) => {
    isMenuOpenRef.current = open;
    if (!open && !isHoveringRef.current) {
      setOpen(false);
    }
  };

  const sidebarProps = !isMobile
    ? {
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
      }
    : {};

  if (!user) return null;

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border bg-sidebar"
      {...sidebarProps}
    >
      <SidebarHeader>
        <div className="flex h-12 items-center group-data-[collapsible=icon]:px-4 group-data-[collapsible=icon]:justify-center">
          <PlanoLogo
            viewBox={state === "collapsed" ? "-30 0 85 85" : undefined}
            className="h-8 w-auto -ml-2 group-data-[collapsible=icon]:ml-0"
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-4 group-data-[collapsible=icon]:items-center">
              {navItems.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  (item.path === "/connect" && location.pathname.startsWith("/groups"));

                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      size="lg"
                      tooltip={item.label}
                      isActive={isActive}
                      className={cn(
                        "relative transition-all duration-200 text-base [&>svg]:size-6 text-muted-foreground hover:bg-sidebar-accent/50 rounded-none",
                        "group-data-[collapsible=icon]:!justify-center group-data-[collapsible=icon]:!mx-auto",
                        "data-[active=true]:bg-sidebar-accent/40 data-[active=true]:text-sidebar-accent-foreground data-[active=true]:font-medium",
                        "before:absolute before:left-0 before:top-0 before:w-[2px] before:h-full before:bg-primary before:hidden data-[active=true]:before:block before:rounded-none"
                      )}
                    >
                      <Link to={item.path}>
                        <item.icon strokeWidth={isActive ? 2.5 : 2} />
                        <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarTrigger />
        <UserMenu onOpenChange={handleMenuOpenChange} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
