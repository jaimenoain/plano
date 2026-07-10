import type { MouseEventHandler, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MapChromeButtonProps {
  /** A lucide icon, sized `h-4 w-4` with `strokeWidth={1.5}` by the caller. */
  icon: ReactNode;
  /** Optional label, hidden below `sm` — rendered as a mono-cased chrome label. */
  label?: string;
  /** Native `title` (also the accessible name when there's no visible label). */
  title: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
  /** Positioning only (`absolute top-2 …`, z-index) — never restyle the shell. */
  className?: string;
}

/**
 * The single map-overlay control button (satellite toggle, fullscreen toggle).
 * Every map wrapper — `PlanoMap`, `CollectionMapGL`, `BuildingLocationMap` —
 * shared the *idea* of this button but hand-rolled three divergent shells
 * (shadow present/absent, `rounded-sm`/`rounded-none`, `backdrop-blur-xs`/`-sm`,
 * `surface-card`/`surface-default`, uppercase label or not). This locks the
 * treatment to the flat, editorial convention: frosted card surface, hairline
 * border, sharp corners, **no shadow**, uppercase-tracked label. Positioning
 * stays at the call site via `className`.
 */
export function MapChromeButton({
  icon,
  label,
  title,
  onClick,
  className,
}: MapChromeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "flex items-center gap-2 border border-border-default bg-surface-card/90 p-2 backdrop-blur-xs transition-colors hover:bg-surface-muted",
        className,
      )}
    >
      {icon}
      {label && (
        <span className="hidden text-xs font-medium uppercase tracking-wide sm:inline">
          {label}
        </span>
      )}
    </button>
  );
}
