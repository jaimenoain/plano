import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export function AllCaughtUpDivider() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative flex items-center justify-center w-full"
    >
      <div className="w-full border-t border-border-default" />
      <div className="absolute -translate-y-1/2 px-4 bg-surface-default flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-text-secondary" />
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">
          You're all caught up
        </span>
      </div>
    </motion.div>
  );
}
