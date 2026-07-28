import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SearchInputProps
  extends Omit<React.ComponentProps<"input">, "type" | "onChange" | "value"> {
  value: string;
  /** Receives the new value directly — callers filter, they don't read events. */
  onValueChange: (value: string) => void;
  /**
   * Accessible name. Required rather than optional: every one of these fields
   * is icon-only, so without it the input has no name at all.
   */
  label: string;
  className?: string;
}

/**
 * The canonical search field — magnifier on the left, a clear button on the
 * right once there's something to clear, and Escape to empty it.
 *
 * Deliberately dumb: it holds no state, does no debouncing and knows nothing
 * about what is being searched. The owner decides that.
 */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onValueChange, label, className, onKeyDown, ...props }, ref) => {
    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape" && value) {
        // Stop the Escape from also closing an enclosing sheet/dialog — the
        // first press belongs to the search field.
        event.preventDefault();
        event.stopPropagation();
        onValueChange("");
      }
      onKeyDown?.(event);
    };

    return (
      <div className={cn("relative", className)}>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
          strokeWidth={1.5}
          aria-hidden
        />
        <Input
          ref={ref}
          type="search"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-label={label}
          autoComplete="off"
          spellCheck={false}
          className={cn(
            "pl-9 [&::-webkit-search-cancel-button]:appearance-none",
            value ? "pr-11" : "pr-3",
          )}
          {...props}
        />
        {value && (
          <button
            type="button"
            onClick={() => onValueChange("")}
            aria-label="Clear search"
            className="absolute right-0 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center text-text-disabled transition-colors hover:text-text-primary"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        )}
      </div>
    );
  },
);
SearchInput.displayName = "SearchInput";
