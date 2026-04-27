import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
    <div className={cn("relative w-full overflow-hidden bg-surface-muted", className)}>
      <motion.div
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="w-full h-[clamp(300px,55vh,650px)]"
      >
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
          fetchPriority="high"
          loading="eager"
        />
        {/* Cinematic Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
      </motion.div>
      
      <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6 lg:p-8">
        <AnimatePresence mode="wait">
          {children && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
