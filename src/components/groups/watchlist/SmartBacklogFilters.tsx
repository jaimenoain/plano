import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, Clock, Filter, Tv } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface FilterState {
  excludeSeen: boolean;
  maxRuntime: number | null; // in minutes
  providers: string[]; // provider names
}

interface SmartBacklogFiltersProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
}

const AVAILABLE_PROVIDERS = [
  "Netflix",
  "Amazon Prime Video",
  "Disney Plus",
  "HBO Max",
  "Hulu",
  "Apple TV Plus",
  "Peacock",
  "Paramount Plus",
];

export function SmartBacklogFilters({ filters, onFilterChange }: SmartBacklogFiltersProps) {
  const handleToggleSeen = (checked: boolean) => {
    onFilterChange({ ...filters, excludeSeen: checked });
  };

  const handleRuntimeChange = (value: number[]) => {
    onFilterChange({ ...filters, maxRuntime: value[0] === 180 ? null : value[0] });
  };

  const toggleProvider = (provider: string) => {
    const newProviders = filters.providers.includes(provider)
      ? filters.providers.filter(p => p !== provider)
      : [...filters.providers, provider];
    onFilterChange({ ...filters, providers: newProviders });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full overflow-x-auto pb-2">
      <div className="flex items-center space-x-2 bg-muted/40 p-2 rounded-lg border">
        <Switch
          id="exclude-seen"
          checked={filters.excludeSeen}
          onCheckedChange={handleToggleSeen}
        />
        <Label htmlFor="exclude-seen" className="text-sm cursor-pointer whitespace-nowrap">
          Hide Seen
        </Label>
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 border-dashed">
            <Clock className="mr-2 h-4 w-4" />
            Runtime
            {filters.maxRuntime && (
                <Badge variant="secondary" className="ml-2 px-1 rounded-sm text-xs">
                    &le; {Math.floor(filters.maxRuntime / 60)}h {filters.maxRuntime % 60}m
                </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="start">
          <div className="space-y-4">
             <div className="flex justify-between items-center">
               <h4 className="font-medium leading-none">Max Runtime</h4>
               <span className="text-sm text-muted-foreground">
                 {filters.maxRuntime ? `${Math.floor(filters.maxRuntime / 60)}h ${filters.maxRuntime % 60}m` : "Any"}
               </span>
             </div>
             <Slider
               defaultValue={[filters.maxRuntime || 180]}
               max={180}
               min={30}
               step={15}
               onValueCommit={handleRuntimeChange}
             />
             <p className="text-xs text-muted-foreground">
               Slide to right (3h) for any length.
             </p>
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 border-dashed">
             <Tv className="mr-2 h-4 w-4" />
             Platforms
             {filters.providers.length > 0 && (
                <Badge variant="secondary" className="ml-2 px-1 rounded-sm text-xs">
                   {filters.providers.length}
                </Badge>
             )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
           <Command>
             <CommandInput placeholder="Search platforms..." />
             <CommandList>
                <CommandEmpty>No platform found.</CommandEmpty>
                <CommandGroup>
                  {AVAILABLE_PROVIDERS.map(provider => (
                     <CommandItem
                       key={provider}
                       onSelect={() => toggleProvider(provider)}
                     >
                       <div
                         className={cn(
                           "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                           filters.providers.includes(provider)
                             ? "bg-primary text-primary-foreground"
                             : "opacity-50 [&_svg]:invisible"
                         )}
                       >
                         <Check className={cn("h-4 w-4")} />
                       </div>
                       {provider}
                     </CommandItem>
                  ))}
                </CommandGroup>
             </CommandList>
           </Command>
        </PopoverContent>
      </Popover>

      {/* Clear Filters */}
      {(filters.excludeSeen || filters.maxRuntime || filters.providers.length > 0) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFilterChange({ excludeSeen: false, maxRuntime: null, providers: [] })}
            className="h-9 px-2 lg:px-3"
          >
             Reset
             <span className="sr-only">Reset filters</span>
          </Button>
      )}
    </div>
  );
}
