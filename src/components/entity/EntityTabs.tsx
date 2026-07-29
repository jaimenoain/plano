import { cn } from "@/lib/utils";

/**
 * Quiet text tabs — a label, a mono count beside it, a 2px rule under the active one.
 * Never pills. Shared by profile and entity (person/company) pages; the sticky bar is
 * full-bleed, so mount it outside any max-width container.
 */
export interface EntityTab<K extends string> {
  key: K;
  label: string;
  count: number | null;
}

interface EntityTabsProps<K extends string> {
  tabs: EntityTab<K>[];
  activeKey: K;
  onChange: (key: K) => void;
}

export function EntityTabs<K extends string>({ tabs, activeKey, onChange }: EntityTabsProps<K>) {
  return (
    <div className="sticky top-0 z-20 border-b border-border-default bg-surface-default">
      <div className="mx-auto max-w-[1120px] px-4 sm:px-6 lg:px-8">
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
