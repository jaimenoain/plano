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
  const isLost = currentStatus === 'lost';
  const isPending = currentStatus === 'pending';

  const getStyles = () => {
    if (isLost) {
      return cn(
        "bg-surface-muted text-text-disabled border border-border-default",
        isOwnProfile ? "hover:bg-surface-muted/80" : "opacity-80"
      );
    }
    if (isVisited) {
      return cn(
        "bg-brand-secondary text-brand-secondary-foreground border border-border-default",
        isOwnProfile ? "hover:bg-brand-secondary" : "opacity-80"
      );
    }
    if (isPending) {
      return cn(
        "bg-surface-muted text-text-secondary border border-border-default",
        isOwnProfile ? "hover:bg-surface-muted/80" : "opacity-80"
      );
    }
    return "bg-surface-muted text-text-secondary border border-border-default";
  };

  return (
    <motion.button
      layout
      onClick={(e) => {
        e.stopPropagation();
        if (isOwnProfile) onClick();
      }}
      className={cn(
        "relative px-2 py-0.5 rounded-sm text-xs font-medium uppercase tracking-wide transition-colors duration-300 select-none overflow-hidden flex items-center justify-center",
        isOwnProfile ? "cursor-pointer" : "cursor-default",
        getStyles()
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
          {isLost ? "Lost" : isVisited ? "Visited" : "Saved"}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
