import { Button } from "@/components/ui/button";
import { List, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchModeToggleProps {
  mode: "map" | "list";
  onModeChange: (mode: "map" | "list") => void;
  className?: string;
}

export function SearchModeToggle({
  mode,
  onModeChange,
  className,
}: SearchModeToggleProps) {
  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center bg-background border shadow-lg rounded-full p-1",
        className
      )}
    >
      <Button
        variant={mode === "map" ? "secondary" : "ghost"}
        size="sm"
        className={cn(
          "rounded-full px-4 gap-2 transition-all",
          mode === "map" && "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
        onClick={() => onModeChange("map")}
      >
        <MapIcon className="h-4 w-4" />
        <span className="font-medium">Map</span>
      </Button>
      <Button
        variant={mode === "list" ? "secondary" : "ghost"}
        size="sm"
        className={cn(
          "rounded-full px-4 gap-2 transition-all",
          mode === "list" && "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
        onClick={() => onModeChange("list")}
      >
        <List className="h-4 w-4" />
        <span className="font-medium">List</span>
      </Button>
    </div>
  );
}
