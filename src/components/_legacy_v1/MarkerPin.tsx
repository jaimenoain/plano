import { CollectionMarkerCategory } from "@/types/collection";
import { Bed, Utensils, Bus, Camera, MapPin as MapPinIcon } from "lucide-react";

interface MarkerPinProps {
  category?: CollectionMarkerCategory;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function MarkerPin({ category, color, className, style }: MarkerPinProps) {
  let IconComponent = MapPinIcon;

  switch (category) {
    case 'accommodation': IconComponent = Bed; break;
    case 'dining': IconComponent = Utensils; break;
    case 'transport': IconComponent = Bus; break;
    case 'attraction': IconComponent = Camera; break;
    case 'other': IconComponent = MapPinIcon; break;
  }

  return (
    <div
      className={`flex items-center justify-center w-7 h-7 rounded-full bg-white border border-gray-200 shadow-md ${className || ''}`}
      style={style}
    >
      <IconComponent
        className="w-4 h-4"
        style={{ color: color || "#6B7280" }}
      />
    </div>
  );
}
