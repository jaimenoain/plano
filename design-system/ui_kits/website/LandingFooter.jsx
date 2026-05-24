/* Landing · footer */

function LandingFooter() {
  const dim = { fontSize: 11, color: "var(--text-disabled)", letterSpacing: "0.04em", textDecoration: "none" };
  const social = { fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-disabled)", textDecoration: "none" };
  return (
    <footer style={{ borderTop: "1px solid var(--border-default)", padding: "32px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span style={dim}>© 2026 Plano</span>
          <a href="#" style={dim}>Privacy</a>
          <a href="#" style={dim}>Terms</a>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <a href="#" style={social}>Instagram</a>
          <span style={{ color: "var(--text-disabled)", fontSize: 12 }}>·</span>
          <a href="#" style={social}>X</a>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, { LandingFooter });
