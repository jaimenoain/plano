import { useState } from "react";
import {
  Building2,
  Layers,
  Activity,
  Key,
  Hammer,
  Palette,
  Calendar,
  Map as MapIcon,
  Wrench,
  Tag,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const THRESHOLD = 4;

export interface BuildingAttributesData {
  typology?: string[] | null;
  materials?: string[] | null;
  styles?: string[] | { name: string }[] | null;
  context?: string | null;
  intervention?: string | null;
  category?: string | null;
  year_completed?: number | null;
  status?: string | null;
}

interface BuildingAttributesProps {
  building: BuildingAttributesData;
  className?: string;
}

export const BuildingAttributes = ({
  building,
  className,
}: BuildingAttributesProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Helper to check if a value is effectively empty
  const isEmpty = (val: unknown) => {
    if (val === null || val === undefined) return true;
    if (Array.isArray(val) && val.length === 0) return true;
    if (typeof val === 'string' && val.trim() === '') return true;
    return false;
  };

  // Helper to render array content
  const renderArray = (arr: (string | { name: string })[]) => {
    if (!arr || arr.length === 0) return null;

    // Check if it's an array of objects (for styles)
    const isObjectArray = typeof arr[0] === 'object' && arr[0] !== null && 'name' in arr[0];
    const items = isObjectArray
      ? (arr as { name: string }[]).map((item) => item.name)
      : (arr as string[]);

    return (
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {items.map((item, i) => (
           <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-secondary/60 text-secondary-foreground">
             {item}
           </span>
        ))}
      </div>
    );
  };

  const fields = [
    { key: 'typology', label: 'Typology', icon: Building2, value: building.typology, isArray: true },
    { key: 'materials', label: 'Materials', icon: Hammer, value: building.materials, isArray: true },
    { key: 'styles', label: 'Style', icon: Palette, value: building.styles, isArray: true },
    { key: 'context', label: 'Context', icon: MapIcon, value: building.context },
    { key: 'intervention', label: 'Intervention', icon: Wrench, value: building.intervention },
    { key: 'category', label: 'Category', icon: Tag, value: building.category },
    { key: 'year_completed', label: 'Year', icon: Calendar, value: building.year_completed?.toString() },
    { key: 'status', label: 'Status', icon: Activity, value: building.status },
  ];

  // Filter out empty fields
  const activeFields = fields.filter(f => !isEmpty(f.value));

  if (activeFields.length === 0) return null;

  const visibleFields = isExpanded ? activeFields : activeFields.slice(0, THRESHOLD);

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3", className)}>
      {visibleFields.map((field, index) => (
        <div
          key={field.key}
          className={cn(
            "flex flex-col p-3 rounded-xl bg-muted/10 border border-dashed border-border/60 hover:bg-muted/20 transition-colors",
            // Add animation only for items beyond threshold when expanded
            isExpanded && index >= THRESHOLD && "animate-in fade-in slide-in-from-top-1 duration-300"
          )}
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
            <field.icon className="w-3.5 h-3.5 opacity-70" />
            <span className="text-[10px] uppercase tracking-wider font-semibold">{field.label}</span>
          </div>

          <div className="text-sm font-medium leading-tight">
            {field.isArray ? (
               renderArray(field.value as (string | { name: string })[])
            ) : (
               <span className="ml-0.5">{field.value as string}</span>
            )}
          </div>
        </div>
      ))}

      {activeFields.length > THRESHOLD && (
        <div className="col-span-full flex justify-center mt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full h-auto py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            {isExpanded ? (
              <>
                Show less <ChevronUp className="ml-1.5 h-3 w-3" />
              </>
            ) : (
              <>
                Show all details <ChevronDown className="ml-1.5 h-3 w-3" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
