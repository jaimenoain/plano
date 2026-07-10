import { cn } from "@/lib/utils";

/**
 * Quiet text tabs — a label, a mono count beside it, a 2px rule under the active one.
 * Never pills.
 */
export interface ProfileTab<K extends string> {
  key: K;
  label: string;
  count: number | null;
}

interface ProfileTabsProps<K extends string> {
  tabs: ProfileTab<K>[];
  activeKey: K;
  onChange: (key: K) => void;
}

export function ProfileTabs<K extends string>({ tabs, activeKey, onChange }: ProfileTabsProps<K>) {
  return (
    <div className="sticky top-0 z-20 border-b border-border-default bg-surface-default">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="flex gap-7 overflow-x-scroll-touch">
          {tabs.map((tab) => {
            const isActive = activeKey === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onChange(tab.key)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative shrink-0 py-4 text-sm font-medium transition-colors",
                  isActive ? "text-text-primary" : "text-text-secondary hover:text-text-primary",
                )}
              >
                {tab.label}
                {tab.count !== null && (
                  <span className="meta-code ml-1.5 text-text-disabled">{tab.count.toLocaleString()}</span>
                )}
                {isActive && (
                  <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 bg-text-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
