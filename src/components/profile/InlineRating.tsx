import { useState } from "react";
import { Star } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface InlineRatingProps {
  rating: number | null;
  onRate: (rating: number | null) => void;
  readOnly?: boolean;
}

export function InlineRating({ rating, onRate, readOnly = false }: InlineRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const handleRate = (star: number) => {
    if (readOnly) return;
    if (rating === star) {
      onRate(null);
    } else {
      onRate(star);
    }
  };

  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => setHoverRating(null)}>
      {[1, 2, 3].map((star) => {
        const isFilled = (hoverRating !== null ? star <= hoverRating : (rating || 0) >= star);

        return (
          <motion.button
            key={star}
            type="button"
            onClick={(e) => { e.stopPropagation(); handleRate(star); }}
            onMouseEnter={() => !readOnly && setHoverRating(star)}
            className={cn(
              "p-0.5 focus:outline-none transition-colors",
              readOnly ? "cursor-default" : "cursor-pointer"
            )}
            whileTap={!readOnly ? { scale: 0.8 } : undefined}
          >
             <motion.div
               initial={false}
               animate={isFilled ? { scale: [1, 1.2, 1] } : { scale: 1 }}
               transition={{ duration: 0.2 }}
             >
              <Star
                className={cn(
                  "w-4 h-4 transition-colors",
                  isFilled
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground/20 fill-transparent"
                )}
              />
            </motion.div>
          </motion.button>
        );
      })}
    </div>
  );
}
