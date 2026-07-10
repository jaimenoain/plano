import { motion } from "framer-motion";
import { Link } from "react-router";
import { useWaitlistSignup } from "@/features/waitlist/WaitlistSignupProvider";
import { Button } from "@/components/ui/button";

export const LandingHero = () => {
  const { openWaitlistDialog } = useWaitlistSignup();

  return (
    <div className="flex min-h-[92vh] w-full flex-col justify-center px-5 pt-14 pb-24 md:px-8 md:pb-32">
      <div className="mx-auto w-full max-w-[1080px]">

        {/* The one sanctioned decorative lime on this view. */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <span className="accent-tag">Coming soon</span>
        </motion.div>

        <motion.h1
          className="display mb-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
        >
          The world&apos;s
          <br />
          <em>architecture</em>,
          <br />
          cataloged.
        </motion.h1>

        <motion.p
          className="body-relaxed mb-12 max-w-[52ch] text-lg"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        >
          Like IMDb, but for buildings. We&apos;re cataloging every structure on earth — so the
          architects, engineers, and studios who make them possible finally get the credit they
          deserve.
        </motion.p>

        <motion.div
          className="flex flex-wrap items-center gap-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
        >
          <Button type="button" variant="accent" size="lg" onClick={openWaitlistDialog}>
            Join the waiting list
          </Button>
          {/* The → is injected by .cta-link::after — never write it into the markup. */}
          <Link to="/search" className="cta-link">
            See the map
          </Link>
        </motion.div>

        <motion.div
          className="mt-12 flex items-center gap-6 text-[11px] font-medium uppercase tracking-widest text-text-disabled md:gap-8"
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
