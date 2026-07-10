import * as React from "react";
import { X, Loader2, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/lib/utils";
import { searchPeople } from "@/features/credits/api/people";
import type { PersonSummary } from "@/features/credits/types";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";

interface PersonFilterSelectProps {
  selectedPeople: { id: string; name: string }[];
  setSelectedPeople: (people: { id: string; name: string }[]) => void;
  placeholder?: string;
  className?: string;
}

export function PersonFilterSelect({
  selectedPeople,
  setSelectedPeople,
  placeholder,
  className,
}: PersonFilterSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [people, setPeople] = React.useState<PersonSummary[]>([]);
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
      setPeople([]);
      return;
    }
    const q = inputValue.trim();
    if (q.length < 2) {
      setPeople([]);
      setIsLoading(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setIsLoading(true);
    debounceRef.current = setTimeout(() => {
      void (async () => {
        try {
          const rows = await searchPeople(q);
          setPeople(rows);
        } catch {
          setPeople([]);
        } finally {
          setIsLoading(false);
        }
      })();
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, open]);

  const handleSelect = (person: PersonSummary) => {
    setInputValue("");
    if (!selectedPeople.some((p) => p.id === person.id)) {
      setSelectedPeople([...selectedPeople, { id: person.id, name: person.name }]);
    }
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleUnselect = (id: string) => {
    setSelectedPeople(selectedPeople.filter((p) => p.id !== id));
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current;
    if (input) {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (input.value === "" && selectedPeople.length > 0) {
          handleUnselect(selectedPeople[selectedPeople.length - 1].id);
        }
      }
      if (e.key === "Escape") {
        input.blur();
        setOpen(false);
      }
    }
  };

  const filteredSuggestions = people.filter((p) => !selectedPeople.some((sel) => sel.id === p.id));

  const showPopover = open && (filteredSuggestions.length > 0 || inputValue.length > 0);

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
            className="group border border-border-default px-3 py-2 text-sm rounded-md focus-within:ring-2 focus-within:ring-brand-accent focus-within:ring-offset-2 bg-surface-default relative"
          >
            <div className="flex flex-wrap gap-1">
              {selectedPeople.map((person) => (
                <Badge key={person.id} variant="secondary" className="pl-1">
                  <UserRound className="h-3 w-3 mr-1" />
                  {person.name}
                  <button
                    type="button"
                    className="ml-1 rounded-full outline-hidden focus:ring-2 focus:ring-brand-accent focus:ring-offset-2"
                    onClick={() => handleUnselect(person.id)}
                  >
                    <X className="h-3 w-3 text-text-secondary hover:text-text-primary" />
                  </button>
                </Badge>
              ))}
              <CommandPrimitive.Input
                ref={inputRef}
                value={inputValue}
                onValueChange={setInputValue}
                onFocus={() => setOpen(true)}
                onBlur={() => {
                  if (!showPopover) {
                    setOpen(false);
                  }
                }}
                placeholder={placeholder}
                autoComplete="off"
                className="ml-2 flex-1 bg-transparent outline-hidden placeholder:text-text-secondary min-w-[50px]"
              />
            </div>
          </div>
        </PopoverAnchor>

        <PopoverContent
          className="p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          style={{ width: containerWidth > 0 ? containerWidth : "auto" }}
        >
          <CommandList>
            {isLoading && (
              <CommandItem disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </CommandItem>
            )}

            <CommandGroup className="h-full overflow-auto max-h-[200px]">
              {filteredSuggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion.id}
                  value={suggestion.name}
                  onSelect={() => handleSelect(suggestion)}
                >
                  <div className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-text-secondary" />
                    <div className="flex flex-col">
                      <span>{suggestion.name}</span>
                      {suggestion.knownBuilding ? (
                        <span className="text-2xs text-text-secondary truncate max-w-[200px]">
                          {suggestion.knownBuilding}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </CommandItem>
              ))}
              {!isLoading && inputValue.trim().length >= 2 && filteredSuggestions.length === 0 && (
                <CommandItem disabled>No people found</CommandItem>
              )}
              {!isLoading && inputValue.trim().length > 0 && inputValue.trim().length < 2 && (
                <CommandItem disabled>Type at least 2 characters to search</CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </PopoverContent>
      </Command>
    </Popover>
  );
}
