import { DoorOpen, Building2, Layers, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BuildingAttributesProps {
  accessType?: string | null;
  typologies?: string[] | null;
  materials?: string[] | null;
  status?: string | null;
  className?: string;
}

export const BuildingAttributes = ({
  accessType,
  typologies,
  materials,
  status,
  className,
}: BuildingAttributesProps) => {
  const hasData =
    accessType ||
    (typologies && typologies.length > 0) ||
    (materials && materials.length > 0) ||
    status;

  if (!hasData) return null;

  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {accessType && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider">
            <DoorOpen className="w-4 h-4" />
            <span>Access</span>
          </div>
          <span className="text-sm font-medium">{accessType}</span>
        </div>
      )}

      {status && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider">
            <Activity className="w-4 h-4" />
            <span>Status</span>
          </div>
          <span className="text-sm font-medium">{status}</span>
        </div>
      )}

      {typologies && typologies.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider">
            <Building2 className="w-4 h-4" />
            <span>Typology</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {typologies.map((t) => (
              <Badge key={t} variant="outline" className="text-xs font-normal">
                {t}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {materials && materials.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider">
            <Layers className="w-4 h-4" />
            <span>Materials</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {materials.map((m) => (
              <Badge key={m} variant="outline" className="text-xs font-normal">
                {m}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
