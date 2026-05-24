import { motion } from "framer-motion";
import { useWaitlistSignup } from "@/features/waitlist/WaitlistSignupProvider";
import { Button } from "@/components/ui/button";

export const LandingHero = () => {
  const { openWaitlistDialog } = useWaitlistSignup();

  return (
    <div className="w-full min-h-[92vh] flex flex-col items-center justify-center px-5 md:px-8 pt-14">
      <div className="w-full max-w-4xl flex flex-col items-center text-center">

        {/* Eyebrow label */}
        <motion.p
          className="mb-8 text-[11px] font-medium uppercase tracking-[0.2em] text-text-disabled"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          Coming soon
        </motion.p>

        {/* Headline */}
        <motion.h1
          className="mb-8 text-[clamp(2.75rem,7vw,5.5rem)] font-bold tracking-[-0.035em] text-text-primary leading-[0.98]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
        >
          The world&apos;s
          <br />
          architecture database.
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          className="mb-12 max-w-[40rem] text-[clamp(0.9375rem,1.4vw,1.1875rem)] leading-[1.6] text-text-secondary"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        >
          Like IMDb, but for buildings. We're cataloging every structure on earth — so the architects, engineers, and studios who make them possible finally get the credit they deserve.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
        >
          <Button
            type="button"
            onClick={openWaitlistDialog}
            className="h-12 px-8 text-sm font-medium rounded-sm bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover"
          >
            Join the waiting list
          </Button>
        </motion.div>

        {/* Feature triptych */}
        <motion.div
          className="mt-12 flex items-center gap-6 text-[11px] font-medium uppercase tracking-[0.15em] text-text-disabled md:gap-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <span>Discover buildings</span>
          <span className="text-border-default">·</span>
          <span>Track visits</span>
          <span className="text-border-default">·</span>
          <span>Follow architects</span>
        </motion.div>
      </div>
    </div>
  );
};
