import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, MapPin, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export interface DiscoveryFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedCity: string;
  onCityChange: (value: string) => void;
  availableCities: string[];
  selectedStyles: string[];
  onStylesChange: (styles: string[]) => void;
  availableStyles: string[];
  sortBy: 'distance' | 'relevance';
  onSortChange: (sort: 'distance' | 'relevance') => void;
}

export function DiscoveryFilterBar({
  searchQuery,
  onSearchChange,
  selectedCity,
  onCityChange,
  availableCities,
  selectedStyles,
  onStylesChange,
  availableStyles,
  sortBy,
  onSortChange,
}: DiscoveryFilterBarProps) {
  const [openStyles, setOpenStyles] = useState(false);

  const toggleStyle = (style: string) => {
    if (selectedStyles.includes(style)) {
      onStylesChange(selectedStyles.filter((s) => s !== style));
    } else {
      onStylesChange([...selectedStyles, style]);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-background border-b md:flex-row md:items-center md:justify-between sticky top-0 z-10">
      {/* Search Input */}
      <div className="flex-1 min-w-[200px]">
        <Input
          placeholder="Search buildings, architects..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {/* City Filter */}
        <Select value={selectedCity} onValueChange={onCityChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Select City" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {(availableCities || []).map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Style Filter (Multi-select) */}
        <Popover open={openStyles} onOpenChange={setOpenStyles}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openStyles}
              className="w-full sm:w-[200px] justify-between"
            >
              {selectedStyles.length === 0
                ? "Select Styles"
                : `${selectedStyles.length} selected`}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder="Search style..." />
              <CommandList>
                <CommandEmpty>No style found.</CommandEmpty>
                <CommandGroup>
                  {(availableStyles || []).map((style) => (
                    <CommandItem
                      key={style}
                      value={style}
                      onSelect={() => toggleStyle(style)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedStyles.includes(style)
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      {style}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Sort Toggle */}
        <div className="flex items-center border rounded-md overflow-hidden h-10 bg-muted/20">
            <Button
                variant={sortBy === 'distance' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-full rounded-none px-3"
                onClick={() => onSortChange('distance')}
                title="Sort by Distance"
            >
                <MapPin className="h-4 w-4 mr-2" />
                <span className="sr-only md:not-sr-only">Distance</span>
            </Button>
            <div className="w-[1px] h-full bg-border" />
            <Button
                variant={sortBy === 'relevance' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-full rounded-none px-3"
                onClick={() => onSortChange('relevance')}
                title="Sort by Relevance"
            >
                <Sparkles className="h-4 w-4 mr-2" />
                <span className="sr-only md:not-sr-only">Relevance</span>
            </Button>
        </div>
      </div>
    </div>
  );
}
