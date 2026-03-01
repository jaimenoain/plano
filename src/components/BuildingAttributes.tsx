import {
  Building2,
  Activity,
  Hammer,
  Palette,
  Calendar,
  Map as MapIcon,
  Wrench,
  Tag
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  // Helper to check if a value is effectively empty
  const isEmpty = (val: unknown) => {
    if (val === null || val === undefined) return true;
    if (Array.isArray(val) && val.length === 0) return true;
    if (typeof val === 'string' && val.trim() === '') return true;
    return false;
  };

  // Helper to get formatted string from value
  const getFormattedValue = (val: unknown): string => {
    if (Array.isArray(val)) {
      if (val.length === 0) return '';
      const isObjectArray = typeof val[0] === 'object' && val[0] !== null && 'name' in val[0];
      if (isObjectArray) {
        return (val as { name: string }[]).map((item) => item.name).join(', ');
      }
      return (val as string[]).join(', ');
    }
    return String(val);
  };

  const fields = [
    { key: 'year_completed', icon: Calendar, value: building.year_completed?.toString() },
    { key: 'category', icon: Tag, value: building.category },
    { key: 'typology', icon: Building2, value: building.typology },
    { key: 'context', icon: MapIcon, value: building.context },
    { key: 'intervention', icon: Wrench, value: building.intervention },
    { key: 'materials', icon: Hammer, value: building.materials },
    { key: 'styles', icon: Palette, value: building.styles },
    { key: 'status', icon: Activity, value: building.status },
  ];

  // Filter out empty fields
  const activeFields = fields.filter(f => !isEmpty(f.value));

  if (activeFields.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-foreground", className)}>
      {activeFields.map((field) => (
        <div key={field.key} className="flex items-center gap-1.5">
          <field.icon className="w-4 h-4 text-muted-foreground" />
          <span>{getFormattedValue(field.value)}</span>
        </div>
      ))}
    </div>
  );
};
