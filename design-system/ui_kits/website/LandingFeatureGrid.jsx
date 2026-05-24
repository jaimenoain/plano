/* Landing · three-column feature grid */

const FEATURE_DATA = [
  {
    tag: "Discover",
    icon: "building-2",
    title: "Every building, documented.",
    description:
      "Browse thousands of buildings across every city, style, and era. Search by architect, movement, material, or location.",
    items: [
      { label: "Bauhaus", meta: "Movement" },
      { label: "Tadao Ando", meta: "Architect" },
      { label: "Brutalism", meta: "Style" },
    ],
  },
  {
    tag: "Credit",
    icon: "users",
    title: "Architects get the credit they deserve.",
    description:
      "Every building attributed to the architects, engineers, and studios behind it. A permanent record of who made what.",
    items: [
      { label: "Renzo Piano", meta: "223 buildings" },
      { label: "Zaha Hadid Architects", meta: "Studio · 89 buildings" },
      { label: "Arup", meta: "Engineering · 1,400+ projects" },
    ],
  },
  {
    tag: "Track",
    icon: "map-pin",
    title: "Your architecture journey.",
    description:
      "Log every building you visit. Rate them, collect favourites, and follow the architects whose work inspires you.",
    items: [
      { label: "Fallingwater", meta: "Visited" },
      { label: "Unité d'Habitation", meta: "Want to visit" },
      { label: "Barbican Centre", meta: "In 'Brutalist Gems'" },
    ],
  },
];

function LandingFeatureGrid() {
  return (
    <section style={{ maxWidth: 1080, margin: "0 auto", padding: "120px 32px" }}>
      <div style={{ marginBottom: 80 }}>
        <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-disabled)", margin: 0, marginBottom: 14 }}>
          What we're building
        </p>
        <h2
          style={{
            fontSize: "clamp(30px, 4.2vw, 48px)",
            fontWeight: 700,
            letterSpacing: "-0.025em",
            color: "var(--text-primary)",
            lineHeight: 1.05,
            margin: 0,
            maxWidth: 560,
          }}
        >
          A permanent record of the built world.
        </h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40 }}>
        {FEATURE_DATA.map(({ tag, icon, title, description, items }) => (
          <div key={tag} style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name={icon} size={14} strokeWidth={1.5} style={{ color: "var(--text-disabled)" }} />
                <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-disabled)" }}>{tag}</span>
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text-primary)", lineHeight: 1.25, margin: 0 }}>{title}</h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>{description}</p>
            </div>
            <div>
              {items.map((it, i) => (
                <div
                  key={it.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid var(--border-default)",
                    padding: "12px 0",
                    opacity: 1 - i * 0.28,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{it.label}</span>
                  <span style={{ fontSize: 11, color: "var(--text-disabled)" }}>{it.meta}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

Object.assign(window, { LandingFeatureGrid });
