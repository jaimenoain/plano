import { cn } from "@/lib/utils";

interface BuildingHeroProps {
  src: string | null;
  alt: string;
  className?: string;
}

export function BuildingHero({ src, alt, className }: BuildingHeroProps) {
  if (!src) return null;

  return (
    <div className={cn("relative w-full overflow-hidden animate-in fade-in duration-700", className)}>
      <img
        src={src}
        alt={alt}
        className="w-full aspect-[16/9] md:aspect-[21/9] object-cover rounded-sm transition-opacity duration-700 ease-in-out"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 /* Photo overlay — bg-black/60 approved per COMPONENT_SPEC §8 backdrop convention */ via-transparent to-transparent pointer-events-none opacity-50" />
    </div>
  );
}
