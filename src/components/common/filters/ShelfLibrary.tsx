import * as React from "react";
import { Check, Circle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { MichelinRatingInput } from "@/components/ui/michelin-rating-input";
import { cn } from "@/lib/utils";

export interface ShelfLibraryProps {
  statusFilters: string[];
  onStatusFiltersChange: (value: string[]) => void;

  selectedCollections?: { id: string; name: string }[];
  onCollectionsChange?: (collections: { id: string; name: string }[]) => void;
  availableCollections?: { id: string; name: string }[];

  personalMinRating: number;
  onPersonalMinRatingChange: (value: number) => void;

  className?: string;
}

export function ShelfLibrary({
  statusFilters,
  onStatusFiltersChange,
  selectedCollections = [],
  onCollectionsChange,
  availableCollections = [],
  personalMinRating,
  onPersonalMinRatingChange,
  className,
}: ShelfLibraryProps) {

  // --- Status Logic ---
  const toggleStatus = (status: string) => {
    if (statusFilters.includes(status)) {
      onStatusFiltersChange(statusFilters.filter((s) => s !== status));
    } else {
      onStatusFiltersChange([...statusFilters, status]);
    }
  };

  // --- Collections Logic ---
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleUnselect = (id: string) => {
    onCollectionsChange?.(selectedCollections.filter((c) => c.id !== id));
    inputRef.current?.focus();
  };

  const handleSelect = (collection: { id: string; name: string }) => {
    setInputValue("");
    if (!selectedCollections.some((c) => c.id === collection.id)) {
      onCollectionsChange?.([...selectedCollections, collection]);
    }
    // Keep focus on input for sequential selection
    setTimeout(() => {
        inputRef.current?.focus();
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current;
    if (input) {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (input.value === "" && selectedCollections.length > 0) {
          handleUnselect(selectedCollections[selectedCollections.length - 1].id);
        }
      }
      if (e.key === "Escape") {
        input.blur();
      }
    }
  };

  const filteredCollections = availableCollections.filter(
    (c) =>
      !selectedCollections.some((sel) => sel.id === c.id) &&
      c.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className={cn("flex flex-col gap-6", className)}>

      {/* Filter 1: Status */}
      <div className="flex flex-col gap-3">
        <Label className="text-sm font-medium">Estado</Label>
        <div className="flex gap-2">
          <Badge
            variant={statusFilters.includes("visited") ? "default" : "outline"}
            className={cn(
                "cursor-pointer gap-1.5 pl-2 pr-3 py-1.5 h-8 text-sm transition-all",
                !statusFilters.includes("visited") && "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => toggleStatus("visited")}
          >
            {statusFilters.includes("visited") ? (
                <Check className="h-3.5 w-3.5" />
            ) : (
                <Check className="h-3.5 w-3.5 opacity-50" />
            )}
            Visitados
          </Badge>

          <Badge
            variant={statusFilters.includes("saved") ? "default" : "outline"}
            className={cn(
                "cursor-pointer gap-1.5 pl-2 pr-3 py-1.5 h-8 text-sm transition-all",
                !statusFilters.includes("saved") && "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => toggleStatus("saved")}
          >
             {statusFilters.includes("saved") ? (
                 <div className="h-3.5 w-3.5 flex items-center justify-center">
                    <div className="h-2 w-2 bg-current rounded-full" />
                 </div>
             ) : (
                 <Circle className="h-3.5 w-3.5 opacity-50" />
             )}
            Pendientes
          </Badge>
        </div>
      </div>

      {/* Filter 2: Collections */}
      <div className="flex flex-col gap-3">
        <Label className="text-sm font-medium">Filtrar por colección...</Label>
        <Command
            onKeyDown={handleKeyDown}
            className="overflow-visible bg-transparent"
        >
          <div className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 bg-background">
            <div className="flex flex-wrap gap-1">
              {selectedCollections.map((collection) => (
                <Badge key={collection.id} variant="secondary" className="pl-2 h-6 gap-1">
                  <span className="truncate max-w-[150px]">{collection.name}</span>
                  <button
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUnselect(collection.id);
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={() => handleUnselect(collection.id)}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </Badge>
              ))}
              <CommandPrimitive.Input
                ref={inputRef}
                value={inputValue}
                onValueChange={setInputValue}
                onBlur={() => setTimeout(() => setOpen(false), 200)}
                onFocus={() => setOpen(true)}
                placeholder={selectedCollections.length === 0 ? "Seleccionar..." : ""}
                className="ml-1 flex-1 bg-transparent outline-none placeholder:text-muted-foreground min-w-[50px]"
              />
            </div>
          </div>
          <div className="relative mt-2">
            {open && (filteredCollections.length > 0 || inputValue.length > 0) ? (
              <div className="absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95">
                <CommandList>
                  <CommandGroup className="h-full overflow-auto max-h-[200px]">
                    {filteredCollections.map((collection) => (
                      <CommandItem
                        key={collection.id}
                        onSelect={() => handleSelect(collection)}
                        className="cursor-pointer"
                      >
                        {collection.name}
                      </CommandItem>
                    ))}
                    {filteredCollections.length === 0 && (
                        <CommandItem disabled>No se encontraron colecciones</CommandItem>
                    )}
                  </CommandGroup>
                </CommandList>
              </div>
            ) : null}
          </div>
        </Command>
      </div>

      {/* Filter 3: Personal Rating */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Tus Puntos</Label>
        </div>
        <div className="bg-muted/10 p-4 rounded-lg border border-muted/20 flex justify-center">
            <MichelinRatingInput
              value={personalMinRating}
              onChange={onPersonalMinRatingChange}
              className="gap-6"
            />
        </div>
      </div>

    </div>
  );
}
