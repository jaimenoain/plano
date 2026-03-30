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
        className="w-full h-[40vh] md:h-[50vh] object-cover transition-opacity duration-700 ease-in-out"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none opacity-50" />
    </div>
  );
}
