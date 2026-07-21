import {
  Activity,
  BarChart2,
  Building2,
  CalendarDays,
  Factory,
  FileCheck,
  Flag,
  Globe2,
  HeartPulse,
  History,
  Home,
  Image,
  LayoutDashboard,
  Map,
  Megaphone,
  Merge,
  MessageSquare,
  Newspaper,
  Settings,
  Shield,
  ShieldAlert,
  Siren,
  Target,
  Trash2,
  Trophy,
  UserCircle,
  UserPlus,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

export const adminTopLevelItems: AdminNavItem[] = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Return to app", url: "/", icon: Home },
];

export const programmeItems: AdminNavItem[] = [
  { title: "Health Dashboard", url: "/admin/programme/health", icon: HeartPulse },
  { title: "Interventions", url: "/admin/programme/interventions", icon: Siren },
  { title: "Presidents", url: "/admin/programme/presidents", icon: UsersRound },
  { title: "Broadcasts", url: "/admin/programme/broadcasts", icon: Megaphone },
  { title: "Rankings", url: "/admin/programme/rankings", icon: BarChart2 },
];

export const contentItems: AdminNavItem[] = [
  { title: "Buildings", url: "/admin/buildings", icon: Building2 },
  { title: "Events", url: "/admin/events", icon: CalendarDays },
  { title: "Updates", url: "/admin/updates", icon: Newspaper },
  { title: "Merge Duplicates", url: "/admin/merge", icon: Merge },
];

export const communityItems: AdminNavItem[] = [
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Ambassadors", url: "/admin/ambassadors", icon: Shield },
  { title: "Ambassador Coverage", url: "/admin/ambassadors/coverage", icon: Globe2 },
  { title: "Campaigns", url: "/admin/ambassadors/campaigns", icon: Target },
  { title: "Feedback", url: "/admin/feedback", icon: MessageSquare },
  { title: "Waiting List", url: "/admin/waitlist", icon: UserPlus },
];

export const awardsItems: AdminNavItem[] = [
  { title: "Awards", url: "/admin/awards", icon: Trophy },
  { title: "Award Claims", url: "/admin/awards/claims", icon: Trophy },
  { title: "Award Suggestions", url: "/admin/awards/suggestions", icon: Trophy },
];

export const creditsItems: AdminNavItem[] = [
  { title: "People", url: "/admin/credits/people", icon: UserCircle },
  { title: "Companies", url: "/admin/credits/companies", icon: Factory },
  { title: "Entity Claims", url: "/admin/claims", icon: FileCheck },
  { title: "Flagged Credits", url: "/admin/credits/flagged", icon: Flag },
];

export const mediaItems: AdminNavItem[] = [
  { title: "Image Wall", url: "/admin/images", icon: Image },
  { title: "Photo Analytics", url: "/admin/photos", icon: Map },
  { title: "Storage Jobs", url: "/admin/storage-jobs", icon: Trash2 },
];

export const systemItems: AdminNavItem[] = [
  { title: "Moderation", url: "/admin/moderation", icon: ShieldAlert },
  { title: "Audit Logs", url: "/admin/audit", icon: History },
  { title: "API Requests", url: "/admin/api-requests", icon: Activity },
  { title: "System", url: "/admin/system", icon: Settings },
];

export const adminNavGroups: AdminNavGroup[] = [
  { label: "Programme", items: programmeItems },
  { label: "Content", items: contentItems },
  { label: "Community", items: communityItems },
  { label: "Awards", items: awardsItems },
  { label: "Credits", items: creditsItems },
  { label: "Media", items: mediaItems },
  { label: "System", items: systemItems },
];
