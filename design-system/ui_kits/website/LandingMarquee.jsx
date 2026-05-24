/* Landing · marquee · infinite scroll of community avatars */

function LandingMarquee() {
  const seeds = [
    { i: "JP", g: { from: "#525252", to: "#171717" } },
    { i: "AM", g: { from: "#A3A3A3", to: "#525252" } },
    { i: "RH", g: null, dark: true },
    { i: "ZK", g: { from: "#404040", to: "#171717" } },
    { i: "EL", g: null },
    { i: "TF", g: { from: "#737373", to: "#262626" } },
    { i: "BC", g: null, dark: true },
    { i: "MN", g: { from: "#525252", to: "#0A0A0A" } },
    { i: "GD", g: null },
    { i: "RP", g: { from: "#A3A3A3", to: "#404040" } },
    { i: "LV", g: null, dark: true },
    { i: "SO", g: { from: "#404040", to: "#171717" } },
    { i: "YT", g: null },
    { i: "DH", g: { from: "#525252", to: "#171717" } },
  ];
  const line = [...seeds, ...seeds, ...seeds];

  return (
    <section
      style={{
        width: "100%",
        padding: "20px 0",
        borderTop: "1px solid var(--border-default)",
        borderBottom: "1px solid var(--border-default)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <style>{`
        @keyframes plano-marquee {
          0% { transform: translate3d(0,0,0); }
          100% { transform: translate3d(-33.333%, 0, 0); }
        }
        .plano-marquee-line { animation: plano-marquee 60s linear infinite; }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 24, width: "fit-content" }} className="plano-marquee-line">
        {line.map((s, idx) => (
          <div key={idx} style={{ display: "inline-flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <Avatar initials={s.i} size={32} dark={s.dark} gradient={s.g} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-disabled)", letterSpacing: "0.04em" }}>
              {(idx * 12 + 17).toString(36).toUpperCase()}
            </span>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 80, background: "linear-gradient(to right, var(--surface-default), transparent)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 80, background: "linear-gradient(to left, var(--surface-default), transparent)", pointerEvents: "none" }} />
    </section>
  );
}

Object.assign(window, { LandingMarquee });
