/* Landing · hero · the editorial centrepiece */

function LandingHero({ onWaitlist }) {
  return (
    <section
      style={{
        width: "100%",
        minHeight: "92vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "120px 32px 80px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 960, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--text-disabled)", marginBottom: 32 }}>
          Coming soon
        </p>

        <h1
          style={{
            fontSize: "clamp(44px, 7vw, 88px)",
            fontWeight: 700,
            letterSpacing: "-0.035em",
            color: "var(--text-primary)",
            lineHeight: 0.98,
            margin: 0,
            marginBottom: 32,
          }}
        >
          The world's<br />architecture database.
        </h1>

        <p
          style={{
            fontSize: "clamp(15px, 1.4vw, 19px)",
            color: "var(--text-secondary)",
            maxWidth: 640,
            lineHeight: 1.6,
            margin: "0 0 48px",
          }}
        >
          Like IMDb, but for buildings. We're cataloguing every structure on earth — so the
          architects, engineers, and studios who make them possible finally get the credit they
          deserve.
        </p>

        <Button variant="primary" size="lg" onClick={onWaitlist}>
          Join the waiting list
        </Button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginTop: 48,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--text-disabled)",
          }}
        >
          <span>Discover buildings</span>
          <span style={{ color: "var(--border-default)" }}>·</span>
          <span>Track visits</span>
          <span style={{ color: "var(--border-default)" }}>·</span>
          <span>Follow architects</span>
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { LandingHero });
