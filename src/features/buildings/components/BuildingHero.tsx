import { useState } from "react";
import { cn } from "@/lib/utils";

interface BuildingHeroProps {
  src: string | null;
  alt: string;
  className?: string;
  /** Content rendered inside the hero (e.g. title/metadata overlay) */
  children?: React.ReactNode;
}

export function BuildingHero({ src, alt, className, children }: BuildingHeroProps) {
  const [imgError, setImgError] = useState(false);
  const showImg = !!src && !imgError;

  if (!showImg) {
    return null;
  }

  return (
    <div className={cn("relative w-full overflow-hidden", className)}>
      <img
        src={src}
        alt={alt}
        className="w-full h-[clamp(260px,48vh,500px)] object-cover animate-in fade-in duration-700"
        onError={() => setImgError(true)}
        fetchPriority="high"
        loading="eager"
      />
      {children}
    </div>
  );
}
