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
  Tag
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface BuildingAttributesData {
  access_type?: string | null;
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
    { key: 'access_type', label: 'Access', icon: Key, value: building.access_type },
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

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3", className)}>
      {activeFields.map((field) => (
        <div
          key={field.key}
          className="flex flex-col p-3 rounded-xl bg-muted/10 border border-dashed border-border/60 hover:bg-muted/20 transition-colors"
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
    </div>
  );
};
