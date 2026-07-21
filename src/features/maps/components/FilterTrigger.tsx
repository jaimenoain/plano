import * as React from 'react';
import { ListFilter } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * The filter-drawer trigger. `compact` renders an icon-only square (mobile
 * floating bar); the default is a labelled "Filters" button (desktop sidebar)
 * so it reads clearly as an openable control. `count` is the active-filter
 * count — a corner dot when compact, an inline pill when labelled.
 *
 * forwardRef + prop spread let this sit under `<SheetTrigger asChild>`, which
 * clones the child and forwards its ref, onClick, and aria state.
 */
export const FilterTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<'button'> & { compact?: boolean; count?: number }
>(({ compact = false, count = 0, ...props }, ref) => (
  <Button
    ref={ref}
    variant="outline"
    size={compact ? 'icon' : 'sm'}
    aria-label="Filters"
    className={`relative flex h-9 items-center gap-1.5 border border-border-default bg-surface-card/90 backdrop-blur-xs rounded-none hover:bg-surface-muted ${compact ? 'w-9 justify-center' : ''}`}
    {...props}
  >
    <ListFilter className="h-4 w-4" />
    {!compact && <span className="text-sm font-medium">Filters</span>}
    {count > 0 && (
      <span
        className={
          compact
            ? 'absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-brand-primary text-[8px] text-brand-primary-foreground'
            : 'flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-primary px-1 text-[10px] font-medium text-brand-primary-foreground'
        }
      >
        {count}
      </span>
    )}
  </Button>
));
FilterTrigger.displayName = 'FilterTrigger';
