const MARQUEE_SEEDS = [
  { initials: "FL", dark: false },
  { initials: "ZH", dark: true },
  { initials: "RP", dark: false },
  { initials: "HM", dark: false },
  { initials: "AG", dark: true },
  { initials: "NK", dark: false },
  { initials: "DL", dark: false },
  { initials: "MV", dark: true },
  { initials: "IP", dark: false },
  { initials: "BC", dark: true },
  { initials: "GD", dark: false },
  { initials: "SO", dark: false },
  { initials: "YT", dark: false },
  { initials: "DH", dark: false },
] as const;

function MarqueeAvatar({
  initials,
  dark,
}: {
  initials: string;
  dark?: boolean;
}) {
  return (
    <span
      className={
        dark
          ? "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary text-[10px] font-bold text-text-inverse"
          : "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[10px] font-bold text-text-primary"
      }
      aria-hidden
    >
      {initials}
    </span>
  );
}

export const LandingMarquee = () => {
  const line = [...MARQUEE_SEEDS, ...MARQUEE_SEEDS, ...MARQUEE_SEEDS];

  return (
    <section className="relative w-full overflow-hidden border-y border-border-default py-5">
      <style>{`
        @keyframes plano-marquee {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-33.333%, 0, 0); }
        }
      `}</style>
      <div
        className="flex w-max items-center gap-6"
        style={{ animation: "plano-marquee 60s linear infinite" }}
      >
        {line.map((seed, idx) => (
          <div
            key={`${seed.initials}-${idx}`}
            className="inline-flex shrink-0 items-center gap-2.5"
          >
            <MarqueeAvatar initials={seed.initials} dark={seed.dark} />
            <span className="font-mono text-[11px] tracking-[0.04em] text-text-disabled">
              {(idx * 12 + 17).toString(36).toUpperCase()}
            </span>
          </div>
        ))}
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-surface-default to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-surface-default to-transparent"
        aria-hidden
      />
    </section>
  );
};
