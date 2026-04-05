import { cn } from "@/lib/utils";

interface BuildingHeroProps {
  src: string | null;
  alt: string;
  className?: string;
  /** Content rendered inside the hero (e.g. title/metadata overlay) */
  children?: React.ReactNode;
}

export function BuildingHero({ src, alt, className, children }: BuildingHeroProps) {
  return (
    <div className={cn("relative w-full overflow-hidden", className)}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-[clamp(260px,48vh,500px)] object-cover animate-in fade-in duration-700"
        />
      ) : (
        <div className="w-full h-[clamp(260px,48vh,500px)] bg-neutral-900" />
      )}
      {/* Dark scrim — keeps overlay text legible regardless of image brightness */}
      <div className="absolute inset-0 bg-black/50 pointer-events-none" />
      {children}
    </div>
  );
}