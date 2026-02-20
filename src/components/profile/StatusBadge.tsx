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
        "relative px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-medium transition-colors duration-300 select-none overflow-hidden min-w-[80px]",
        "border border-transparent",
        isOwnProfile ? "cursor-pointer hover:border-border/40 hover:bg-secondary/40" : "cursor-default opacity-80",
        isVisited ? "text-green-600" : "text-orange-500"
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
          {isVisited ? "Visited" : "Bucket List"}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
