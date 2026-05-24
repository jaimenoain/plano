/* Plano UI kit · app router */

function App() {
  const [view, setView] = useState("landing"); // landing | feed | building
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  const goFeed = () => setView("feed");
  const goLanding = () => setView("landing");
  const goBuilding = (post) => {
    // Use the post's building info if we have it, else fall back to the default
    if (post && post.building) {
      setSelectedBuilding({
        ...window.DEFAULT_BUILDING,
        building: post.building,
        architect: post.architect,
        year: post.year,
        city: post.above ? (post.above.split(" · ")[2] || window.DEFAULT_BUILDING.city) : window.DEFAULT_BUILDING.city,
      });
    } else {
      setSelectedBuilding(window.DEFAULT_BUILDING);
    }
    setView("building");
  };

  return (
    <div data-screen-label={view === "landing" ? "01 Landing" : view === "feed" ? "02 Feed" : "03 Building Detail"}>
      {/* Demo bar — lets the user jump between screens. Not part of the real product. */}
      <div
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          zIndex: 60,
          display: "flex",
          gap: 6,
          padding: 8,
          background: "rgba(23,23,23,0.92)",
          backdropFilter: "blur(6px)",
          color: "#FFFFFF",
        }}
      >
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", alignSelf: "center", padding: "0 8px" }}>
          UI kit demo
        </span>
        {[
          { k: "landing",  l: "Landing" },
          { k: "feed",     l: "Feed" },
          { k: "building", l: "Detail" },
        ].map((b) => (
          <button
            key={b.k}
            onClick={() => (b.k === "building" ? goBuilding() : setView(b.k))}
            style={{
              height: 28,
              padding: "0 10px",
              background: view === b.k ? "#FFFFFF" : "transparent",
              color: view === b.k ? "#171717" : "#FFFFFF",
              border: "1px solid rgba(255,255,255,0.3)",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
            }}
          >
            {b.l}
          </button>
        ))}
      </div>

      {view === "landing" && (
        <>
          <LandingNav onSignIn={goFeed} onWaitlist={goFeed} />
          <main style={{ paddingTop: 56 }}>
            <LandingHero onWaitlist={goFeed} />
            <LandingMarquee />
            <LandingFeatureGrid />
          </main>
          <LandingFooter />
        </>
      )}

      {view === "feed" && (
        <>
          <AppTopNav activeView="feed" onNavigate={(k) => k === "feed" ? null : null} />
          <FeedPage onOpenBuilding={goBuilding} />
        </>
      )}

      {view === "building" && (
        <>
          <AppTopNav activeView="feed" onNavigate={(k) => k === "feed" ? goFeed() : null} />
          <BuildingDetail building={selectedBuilding ?? window.DEFAULT_BUILDING} onBack={goFeed} />
        </>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
