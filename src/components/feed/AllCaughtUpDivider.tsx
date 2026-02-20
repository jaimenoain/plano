import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export function AllCaughtUpDivider() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col items-center justify-center py-12 px-4 space-y-4 text-center w-full max-w-xl mx-auto"
    >
      <CheckCircle2 className="w-12 h-12 text-muted-foreground/50" />
      <div className="space-y-1">
        <h3 className="text-xl font-bold text-foreground">You're all caught up!</h3>
        <p className="text-sm text-muted-foreground">
          Here's some inspiration from the community.
        </p>
      </div>
    </motion.div>
  );
}
