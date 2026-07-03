import * as React from "react";
import { X, Loader2, Trophy } from "lucide-react";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/lib/utils";
import { searchAwards } from "@/features/awards/api/awards";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";

interface AwardFilterSelectProps {
  selectedAwardId: string | null;
  selectedAwardName?: string;
  onAwardChange: (award: { id: string; name: string } | null) => void;
  placeholder?: string;
  className?: string;
}

export function AwardFilterSelect({
  selectedAwardId,
  selectedAwardName,
  onAwardChange,
  placeholder = "Search awards...",
  className,
}: AwardFilterSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [awards, setAwards] = React.useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useLayoutEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target instanceof HTMLElement) {
            setContainerWidth(entry.target.offsetWidth);
          }
        }
      });
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
    return undefined;
  }, []);

  React.useEffect(() => {
    if (!open) {
      setAwards([]);
      return;
    }
    const q = inputValue.trim();
    if (q.length < 2) {
      setAwards([]);
      setIsLoading(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setIsLoading(true);
    debounceRef.current = setTimeout(() => {
      void (async () => {
        try {
          const rows = await searchAwards(q);
          setAwards(rows);
        } catch {
          setAwards([]);
        } finally {
          setIsLoading(false);
        }
      })();
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, open]);

  const handleSelect = (award: { id: string; name: string }) => {
    setInputValue("");
    onAwardChange(award);
    setOpen(false);
  };

  const handleClear = () => {
    onAwardChange(null);
    setInputValue("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current;
    if (input && (e.key === "Delete" || e.key === "Backspace") && input.value === "" && selectedAwardId) {
      handleClear();
    }
    if (e.key === "Escape") {
      input?.blur();
      setOpen(false);
    }
  };

  const showPopover = open && (awards.length > 0 || inputValue.length > 0);

  return (
    <Popover open={showPopover} onOpenChange={setOpen}>
      <Command
        onKeyDown={handleKeyDown}
        className={cn("overflow-visible bg-transparent", className)}
        shouldFilter={false}
      >
        <PopoverAnchor asChild>
          <div
            ref={containerRef}
            className={cn(
              "flex min-h-9 flex-wrap items-center gap-1 rounded-md border border-border-default bg-surface-card px-2 py-1",
            )}
          >
            {selectedAwardId ? (
              <span className="inline-flex items-center gap-1 rounded-sm bg-surface-muted px-2 py-0.5 text-xs text-text-primary">
                <Trophy className="h-3 w-3 shrink-0 text-amber-500" aria-hidden />
                <span className="max-w-[200px] truncate">{selectedAwardName || "Award"}</span>
                <button
                  type="button"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    handleClear();
                  }}
                  className="rounded-sm p-0.5 text-text-secondary hover:text-text-primary"
                  aria-label="Remove award filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : null}
            <CommandPrimitive.Input
              ref={inputRef}
              value={inputValue}
              onValueChange={setInputValue}
              onFocus={() => setOpen(true)}
              placeholder={selectedAwardId ? "" : placeholder}
              className="min-w-32 flex-1 bg-transparent py-1 text-sm outline-hidden placeholder:text-text-secondary"
            />
            {isLoading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-text-disabled" /> : null}
          </div>
        </PopoverAnchor>
        <PopoverContent
          className="p-0"
          style={{ width: containerWidth > 0 ? containerWidth : undefined }}
          align="start"
          onOpenAutoFocus={(ev) => ev.preventDefault()}
        >
          <CommandList className="max-h-52">
            {awards.length === 0 && inputValue.trim().length >= 2 && !isLoading ? (
              <div className="py-3 text-center text-xs text-text-secondary">No awards found</div>
            ) : null}
            <CommandGroup>
              {awards.map((a) => (
                <CommandItem
                  key={a.id}
                  value={a.id}
                  onSelect={() => handleSelect(a)}
                  className="cursor-pointer"
                >
                  <Trophy className="mr-2 h-4 w-4 text-amber-500" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm">{a.name}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </PopoverContent>
      </Command>
    </Popover>
  );
}
