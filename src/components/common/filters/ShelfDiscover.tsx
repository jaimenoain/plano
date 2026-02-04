import * as React from "react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface ShelfDiscoverProps {
  hideSaved: boolean;
  onHideSavedChange: (value: boolean) => void;
  communityQuality: number;
  onCommunityQualityChange: (value: number) => void;
  className?: string;
}

export function ShelfDiscover({
  hideSaved,
  onHideSavedChange,
  communityQuality,
  onCommunityQualityChange,
  className,
}: ShelfDiscoverProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {/* Filter 1: New Only */}
      <div className="flex items-center justify-between">
        <Label htmlFor="hide-saved" className="text-sm font-medium">
          Ocultar mis edificios guardados
        </Label>
        <Switch
          id="hide-saved"
          checked={hideSaved}
          onCheckedChange={onHideSavedChange}
        />
      </div>

      {/* Filter 2: Community Quality */}
      <div className="flex flex-col gap-4">
        <Label className="text-sm font-medium">
          Mostrar solo lo mejor
        </Label>
        <div className="px-1">
          <Slider
            min={0}
            max={2}
            step={1}
            value={[communityQuality]}
            onValueChange={([val]) => onCommunityQualityChange(val)}
            className="w-full"
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <span>Todos</span>
          <span>Destacados ★</span>
          <span>Iconos ★★★</span>
        </div>
      </div>
    </div>
  );
}
