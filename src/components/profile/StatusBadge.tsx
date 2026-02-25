import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string | undefined;
  isOwnProfile: boolean;
  onClick: () => void;
}

export function StatusBadge({ status, isOwnProfile, onClick }: StatusBadgeProps) {
  const currentStatus = status || 'visited';
  const isVisited = currentStatus === 'visited';

  return (
    <motion.button
      layout
      onClick={(e) => {
        e.stopPropagation();
        if (isOwnProfile) onClick();
      }}
      className={cn(
        "relative px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-300 select-none overflow-hidden flex items-center justify-center",
        "border border-transparent bg-secondary text-secondary-foreground",
        isOwnProfile ? "cursor-pointer hover:bg-secondary/80" : "cursor-default opacity-80"
      )}
      whileTap={isOwnProfile ? { scale: 0.95 } : {}}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={currentStatus}
          initial={{ opacity: 0, y: -10, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 10, filter: "blur(4px)" }}
          transition={{ duration: 0.2 }}
          className="block"
        >
          {isVisited ? "Visited" : "Saved"}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
