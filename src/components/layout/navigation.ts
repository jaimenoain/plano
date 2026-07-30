import {
  Activity,
  BookOpen,
  CalendarDays,
  Camera,
  CheckSquare,
  Flame,
  Folder,
  Landmark,
  LayoutDashboard,
  Map,
  Play,
  Search,
  Settings2,
  Target,
  Trophy,
  User,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type NavSurface = "top" | "sidebar" | "bottom";

export type AppNavItem = {
  label: string;
  path: string;
  icon?: LucideIcon;
  surfaces: NavSurface[];
  isActive?: (pathname: string) => boolean;
};

export const appNavItems: AppNavItem[] = [
  {
    label: "Feed",
    path: "/",
    icon: Activity,
    surfaces: ["top", "sidebar", "bottom"],
  },
  {
    // Events keeps top + sidebar; its bottom-bar slot went to My Map.
    label: "Events",
    path: "/events",
    icon: CalendarDays,
    surfaces: ["top", "sidebar"],
    isActive: (pathname) => pathname === "/events" || pathname.startsWith("/events/"),
  },
  {
    label: "Explore",
    path: "/explore",
    icon: Play,
    surfaces: ["top", "sidebar", "bottom"],
  },
  {
    // The member's own library as a first-class destination — beside
    // Explore/Search as the third leg of the map triad (world / discover / mine).
    label: "My Map",
    path: "/map",
    icon: Map,
    surfaces: ["top", "sidebar", "bottom"],
  },
  {
    label: "Guides",
    path: "/guides",
    icon: BookOpen,
    surfaces: ["top", "sidebar"],
  },
  {
    label: "Collections",
    path: "/collections",
    icon: Folder,
    surfaces: ["top", "sidebar"],
    isActive: (pathname) => pathname === "/collections",
  },
  {
    label: "Search",
    path: "/search",
    icon: Search,
    surfaces: ["top", "sidebar", "bottom"],
  },
  {
    label: "Connect",
    path: "/connect",
    icon: Users,
    surfaces: ["top", "sidebar", "bottom"],
  },
  {
    label: "Awards",
    path: "/awards",
    icon: Trophy,
    surfaces: ["top", "sidebar"],
    isActive: (pathname) => pathname === "/awards" || pathname.startsWith("/award/"),
  },
  {
    label: "Support",
    path: "/support",
    icon: Landmark,
    surfaces: ["top", "sidebar"],
    isActive: (pathname) => pathname === "/support" || pathname.startsWith("/become-ambassador"),
  },
  {
    label: "You",
    path: "/profile",
    icon: User,
    surfaces: ["bottom"],
    isActive: (pathname) => pathname === "/profile" || pathname.startsWith("/profile/"),
  },
];

export function navItemsFor(surface: NavSurface): AppNavItem[] {
  return appNavItems.filter((item) => item.surfaces.includes(surface));
}

export function isNavItemActive(item: AppNavItem, pathname: string): boolean {
  if (item.isActive) {
    return item.isActive(pathname);
  }
  return pathname === item.path;
}

/** Embassy workspace tab bar — single source for `EmbassyLayout`. */
export type EmbassyNavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  leaderOnly?: boolean;
};

export const embassyNavItems: EmbassyNavItem[] = [
  { label: "Dashboard", path: "/embassy/goals", icon: Target },
  { label: "My impact", path: "/embassy/impact", icon: Flame },
  { label: "Contribute", path: "/embassy/contribute", icon: LayoutDashboard },
  // Roadmap 4.3. Sits next to Contribute because it is the on-foot half of the same job;
  // kept in the tab bar rather than buried in the Photography tool so it is one tap on a phone.
  { label: "Field mode", path: "/embassy/field", icon: Camera },
  { label: "Chapter Projects", path: "/embassy/projects", icon: Users },
  { label: "Team", path: "/embassy/team", icon: UsersRound },
  { label: "Tasks", path: "/embassy/tasks", icon: CheckSquare },
  { label: "Leadership", path: "/embassy/leadership", icon: Settings2, leaderOnly: true },
];

export function embassyNavItemsFor(isLeader: boolean): EmbassyNavItem[] {
  return embassyNavItems.filter((item) => !item.leaderOnly || isLeader);
}

export function isEmbassyNavItemActive(item: EmbassyNavItem, pathname: string): boolean {
  return (
    pathname === item.path ||
    (item.path === "/embassy/goals" && (pathname === "/embassy" || pathname === "/embassy/"))
  );
}
