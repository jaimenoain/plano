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
import { Badge } from "@/components/ui/badge";

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
    { key: 'year_completed', label: 'Year', icon: Calendar, value: building.year_completed?.toString() },
    { key: 'category', label: 'Category', icon: Tag, value: building.category },
    { key: 'typology', label: 'Typology', icon: Building2, value: building.typology },
    { key: 'context', label: 'Context', icon: MapIcon, value: building.context },
    { key: 'intervention', label: 'Intervention', icon: Wrench, value: building.intervention },
    { key: 'materials', label: 'Materials', icon: Hammer, value: building.materials },
    { key: 'styles', label: 'Styles', icon: Palette, value: building.styles },
    { key: 'status', label: 'Status', icon: Activity, value: building.status },
  ];

  // Filter out empty fields
  const activeFields = fields.filter(f => !isEmpty(f.value));

  if (activeFields.length === 0) return null;

  return (
    <dl
      className={cn(
        "grid grid-cols-[120px_1fr] gap-y-3 gap-x-4 text-sm text-text-primary",
        className
      )}
    >
      {activeFields.map((field) => {
        const value = field.value;
        const isMultiValue = Array.isArray(value) && (value as unknown[]).length > 0;

        if (isMultiValue) {
          const items = value as unknown[];
          const isObjectArray =
            typeof items[0] === "object" &&
            items[0] !== null &&
            "name" in (items[0] as { name: string });

          const labels = isObjectArray
            ? (items as { name: string }[]).map((item) => item.name)
            : (items as string[]);

          return (
            <div key={field.key} className="contents">
              <dt className="text-xs font-medium text-text-secondary uppercase tracking-wide flex items-center gap-1.5">
                <field.icon className="w-3.5 h-3.5" />
                {field.label}
              </dt>
              <dd className="flex flex-wrap gap-2">
                {labels.map((label) => (
                  <Badge key={label} variant="outline" className="text-xs">
                    {label}
                  </Badge>
                ))}
              </dd>
            </div>
          );
        }

        return (
          <div key={field.key} className="contents">
            <dt className="text-xs font-medium text-text-secondary uppercase tracking-wide flex items-center gap-1.5">
              <field.icon className="w-3.5 h-3.5" />
              {field.label}
            </dt>
            <dd>{getFormattedValue(field.value)}</dd>
          </div>
        );
      })}
    </dl>
  );
};
