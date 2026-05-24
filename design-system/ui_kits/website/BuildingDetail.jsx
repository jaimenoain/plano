/* Building detail page · the canonical content-detail surface */

const DEFAULT_BUILDING = {
  building: "Unité d'Habitation",
  altName: "Cité radieuse",
  architect: "Le Corbusier",
  year: 1952,
  city: "Marseille",
  country: "France",
  status: "Built",
  tier: "Top 1%",
  rating: 3,
  ratingCount: 18402,
  pllId: "PLN-04812",
  coords: "43.2611° N · 5.3963° E",
  category: "Residential",
  typologies: ["Mass housing", "Mixed-use"],
  materials: ["Concrete", "Steel", "Glass"],
  styles: ["Brutalism", "Modernism"],
  context: ["Urban"],
  access: "Public exterior · paid interior tours",
  statement:
    "I sought to design a vertical garden city where every family lives in a duplex apartment that draws sunlight from both façades. The building stands on pilotis, raised above the ground, returning the parkland to the city. The roof terrace is not a service area but a public room — a running track, a paddling pool, a school for the children of the residents, a gymnasium open to the sky.",
};

function BuildingDetail({ building = DEFAULT_BUILDING, onBack }) {
  const b = building;
  return (
    <div>
      {/* hero */}
      <div style={{ position: "relative" }}>
        <PhotoPlaceholder
          aspect="auto"
          tone="midnight"
          style={{ height: "clamp(360px, 55vh, 560px)" }}
        >
          {/* cinematic overlay gradient */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 50%)" }} />

          {/* hero text */}
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "32px 40px 36px" }}>
            <div style={{ maxWidth: 1080, margin: "0 auto", width: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <Badge variant="solid" icon="trophy">Top 1% in {b.city}</Badge>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.08em", color: "rgba(255,255,255,0.7)", textTransform: "uppercase" }}>
                  {b.pllId} · {b.coords}
                </span>
              </div>
              <h1 style={{ fontSize: "clamp(48px, 7vw, 88px)", fontWeight: 700, letterSpacing: "-0.038em", color: "#FFFFFF", lineHeight: 0.98, margin: 0 }}>
                {b.building}.
              </h1>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.78)", marginTop: 8, letterSpacing: "0.01em" }}>
                <span style={{ fontWeight: 500, color: "#FFFFFF" }}>{b.architect}</span> · {b.year} · {b.city}, {b.country}
              </p>
            </div>
          </div>
        </PhotoPlaceholder>
      </div>

      {/* body */}
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "56px 40px 96px" }}>
        {/* tab strip */}
        <div style={{ display: "flex", gap: 28, borderBottom: "1px solid var(--border-default)", paddingBottom: 14, marginBottom: 40 }}>
          {[
            { l: "Overview", active: true },
            { l: "Photos", count: 128 },
            { l: "Reviews", count: 412 },
            { l: "Links", count: 18 },
            { l: "Map", active: false },
          ].map((t) => (
            <span key={t.l} style={{
              fontSize: 12, fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase",
              color: t.active ? "var(--text-primary)" : "var(--text-disabled)",
              position: "relative", paddingBottom: 14,
            }}>
              {t.l}
              {t.count != null ? <span style={{ marginLeft: 6, fontFamily: "var(--font-mono)" }}>{t.count}</span> : null}
              {t.active ? <span style={{ position: "absolute", left: 0, bottom: -14, height: 1, width: "100%", background: "var(--text-primary)" }} /> : null}
            </span>
          ))}
          <button onClick={onBack} style={{ marginLeft: "auto", background: "transparent", border: 0, fontSize: 11, fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-secondary)", cursor: "pointer", paddingBottom: 14 }}>
            ← Back to feed
          </button>
        </div>

        {/* section: architect statement */}
        <section style={{ marginBottom: 56 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, paddingBottom: 8, borderBottom: "1px solid var(--text-primary)", marginBottom: 22 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.06em", color: "var(--text-disabled)" }}>§ 01</span>
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-primary)" }}>Architect statement</span>
            <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 500, color: "var(--text-primary)" }}>
              <Icon name="badge-check" size={14} />
              Verified
            </span>
          </div>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.75, margin: 0, maxWidth: 680 }}>
            {b.statement}
          </p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.04em", color: "var(--text-disabled)", marginTop: 18, textTransform: "uppercase" }}>
            — {b.architect}, 1952
          </p>
        </section>

        {/* section: attributes */}
        <section style={{ marginBottom: 56 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, paddingBottom: 8, borderBottom: "1px solid var(--text-primary)", marginBottom: 22 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.06em", color: "var(--text-disabled)" }}>§ 02</span>
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-primary)" }}>Attributes</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", rowGap: 18, columnGap: 24 }}>
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-secondary)" }}>Category</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><Badge>{b.category}</Badge></div>

            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-secondary)" }}>Typologies</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{b.typologies.map((x) => <Badge key={x} variant="outline">{x}</Badge>)}</div>

            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-secondary)" }}>Materials</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{b.materials.map((x) => <Badge key={x} variant="outline">{x}</Badge>)}</div>

            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-secondary)" }}>Style</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{b.styles.map((x) => <Badge key={x} variant="outline">{x}</Badge>)}</div>

            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-secondary)" }}>Access</span>
            <div style={{ fontSize: 14, color: "var(--text-primary)" }}>{b.access}</div>

            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-secondary)" }}>Status</span>
            <div style={{ fontSize: 14, color: "var(--text-primary)" }}>{b.status}</div>
          </div>
        </section>

        {/* section: rating */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, paddingBottom: 8, borderBottom: "1px solid var(--text-primary)", marginBottom: 22 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.06em", color: "var(--text-disabled)" }}>§ 03</span>
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-primary)" }}>Community distinction</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <div style={{ display: "flex", gap: 8 }}>
              {Array.from({ length: b.rating }).map((_, i) => (
                <span key={i} style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--text-primary)" }} />
              ))}
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.025em", color: "var(--text-primary)", lineHeight: 1 }}>
                Masterpiece
              </div>
              <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-disabled)", marginTop: 6, fontWeight: 500 }}>
                {b.ratingCount.toLocaleString()} awarded this distinction
              </div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
              <Button variant="outline" size="md">Award a distinction</Button>
              <Button variant="primary" size="md">Log a visit</Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

Object.assign(window, { BuildingDetail, DEFAULT_BUILDING });
