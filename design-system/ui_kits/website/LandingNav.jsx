/* Landing · top nav · logo + CTA */

function LandingNav({ onSignIn, onWaitlist }) {
  return (
    <header
      style={{
        position: "fixed",
        inset: "0 0 auto 0",
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 56,
        padding: "0 32px",
        background: "rgba(250,250,250,0.95)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        borderBottom: "1px solid var(--border-default)",
      }}
    >
      <a href="#" onClick={(e) => { e.preventDefault(); onSignIn && onSignIn(false); }} style={{ color: "var(--text-primary)", textDecoration: "none" }}>
        <PlanoLogo style={{ height: 14 }} />
      </a>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Button variant="ghost" size="sm" onClick={() => onSignIn && onSignIn(true)}>
          Sign in
        </Button>
        <Button variant="primary" size="sm" onClick={onWaitlist}>
          Join the waiting list
        </Button>
      </div>
    </header>
  );
}

Object.assign(window, { LandingNav });
