import { PlanoLogo } from "@/components/common/PlanoLogo";

/**
 * The black editorial panel on the left of the split sign-in screen
 * (`design-system/ui_kits/web/screens/sign-in.html`, `.auth-left`). Pure
 * presentational: a dark `.photo-placeholder` hatch (`surface-inverse`) with a
 * white logo, an editorial `.headline` tagline, and a quiet uppercase caption.
 * Hidden below 900px, where the form stands alone.
 */
export function AuthEditorialPanel() {
  return (
    <aside className="photo-placeholder-dark relative hidden flex-col justify-between p-14 min-[900px]:flex">
      <div className="relative z-10 flex h-full flex-col justify-between">
        <PlanoLogo className="text-2xl text-white" />

        <div>
          <h2 className="headline max-w-[8em] text-white">
            The world&rsquo;s <em>architecture</em>, cataloged.
          </h2>
          <p className="mt-6 max-w-[34ch] text-[15px] leading-relaxed text-white/60">
            Every building, every architect, one shared record. Sign in to log
            what you&rsquo;ve seen and pick up where you left off.
          </p>
        </div>

        <p className="eyebrow text-white/40">Est. 2024 · Architecture, cataloged</p>
      </div>
    </aside>
  );
}
