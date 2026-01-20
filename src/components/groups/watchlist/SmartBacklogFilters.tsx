import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export interface FilterState {
  excludeSeen: boolean;
}

interface SmartBacklogFiltersProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
}

export function SmartBacklogFilters({ filters, onFilterChange }: SmartBacklogFiltersProps) {
  const handleToggleSeen = (checked: boolean) => {
    onFilterChange({ ...filters, excludeSeen: checked });
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
          Hide Visited
        </Label>
      </div>

      {/* Clear Filters */}
      {filters.excludeSeen && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFilterChange({ excludeSeen: false })}
            className="h-9 px-2 lg:px-3"
          >
             Reset
             <span className="sr-only">Reset filters</span>
          </Button>
      )}
    </div>
  );
}
