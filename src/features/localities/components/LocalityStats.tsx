import { Building2, Users, Camera, BookOpen } from "lucide-react";

export interface LocalityStatsData {
  buildingsCount: number;
  collectionsCount: number;
  contributorsCount: number;
  photosCount: number;
}

// ---------------------------------------------------------------------------
// LocalityStats — four-up stat strip
// ---------------------------------------------------------------------------
export function LocalityStats({ stats }: { stats: LocalityStatsData }) {
  const items = [
    {
      icon: Building2,
      value: stats.buildingsCount.toLocaleString(),
      label: stats.buildingsCount === 1 ? "Building" : "Buildings",
    },
    {
      icon: BookOpen,
      value: stats.collectionsCount.toLocaleString(),
      label: stats.collectionsCount === 1 ? "Collection" : "Collections",
    },
    {
      icon: Users,
      value: stats.contributorsCount.toLocaleString(),
      label: stats.contributorsCount === 1 ? "Contributor" : "Contributors",
    },
    {
      icon: Camera,
      value: stats.photosCount.toLocaleString(),
      label: stats.photosCount === 1 ? "Photo" : "Photos",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-8 border-b border-border-default py-10 sm:grid-cols-4 sm:gap-x-4">
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-col gap-2">
          <span className="font-display text-4xl font-bold tabular-nums tracking-tight text-text-primary">
            {item.value}
          </span>
          <span className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-widest text-text-secondary">
            <item.icon className="h-3 w-3 shrink-0" aria-hidden />
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
