/* Editorial feed page · the signed-in home */

const FEED_POSTS = [
  {
    id: "p1",
    author: { name: "Jules Pernaud", initials: "JP", gradient: { from: "#525252", to: "#171717" } },
    verb: "rated",
    rating: 3,
    time: "3h",
    above: "BRUTALISM · RESIDENTIAL · MARSEILLE",
    building: "Unité d'Habitation",
    architect: "Le Corbusier",
    year: 1952,
    pull:
      "A neighbourhood in the sky — a manifesto in concrete, with a rooftop running track and a school for the children of the residents.",
    photo: { tone: "graphite", aspect: "16 / 9", caption: "PLN-04812 · 43.2611° N · 5.3963° E" },
    badge: "TOP 1%",
  },
  {
    id: "p2",
    author: { name: "Anouk Mehta", initials: "AM", gradient: { from: "#A3A3A3", to: "#525252" } },
    verb: "visited",
    rating: 2,
    time: "yesterday",
    above: "HIGH-TECH · CULTURAL · PARIS",
    building: "Centre Pompidou",
    architect: "Piano · Rogers",
    year: 1977,
    pull:
      "Plumbing on the outside. Everyone joked about it; nobody copied it. Forty-eight years later it still feels finished tomorrow.",
    photo: { tone: "fog", aspect: "16 / 9", caption: "PLN-00219 · 48.8606° N · 2.3522° E" },
    badge: "TOP 5%",
  },
  {
    id: "p3",
    author: { name: "Rohan Hadid", initials: "RH", dark: true },
    verb: "saved",
    rating: null,
    time: "2d",
    above: "MODERNISM · RESIDENTIAL · MILL RUN, PA",
    building: "Fallingwater",
    architect: "Frank Lloyd Wright",
    year: 1939,
    pull: null,
    photo: { tone: "chalk", aspect: "16 / 9", caption: "PLN-00088 · 39.9061° N · 79.4683° W" },
    badge: null,
  },
];

function RatingDots({ rating }) {
  if (!rating) return null;
  return (
    <span style={{ display: "inline-flex", gap: 3, verticalAlign: "middle", marginLeft: 8 }} aria-label={`${rating} distinction${rating > 1 ? "s" : ""}`}>
      {Array.from({ length: rating }).map((_, i) => (
        <span
          key={i}
          style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--text-primary)" }}
        />
      ))}
    </span>
  );
}

function FeedPost({ post, onOpenBuilding }) {
  return (
    <article style={{ padding: "26px 0 28px", borderBottom: "1px solid var(--border-default)" }}>
      {/* EDITORIAL EYEBROW — about the building */}
      <p style={{
        fontSize: 11, fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase",
        color: "var(--text-secondary)", margin: "0 0 14px",
      }}>
        {post.above}
        <span style={{ color: "var(--text-disabled)", margin: "0 6px" }}>/</span>
        <span style={{ color: "var(--text-primary)" }}>{post.architect} · {post.year}</span>
      </p>

      {/* TITLE */}
      <h2
        onClick={() => onOpenBuilding && onOpenBuilding(post)}
        style={{
          fontSize: "clamp(38px, 5.4vw, 64px)",
          fontWeight: 700,
          letterSpacing: "-0.038em",
          color: "var(--text-primary)",
          lineHeight: 0.96,
          margin: "0 0 14px",
          cursor: "pointer",
        }}
      >
        {post.building}.
      </h2>

      {/* PULL-QUOTE */}
      {post.pull ? (
        <p
          onClick={() => onOpenBuilding && onOpenBuilding(post)}
          style={{
            fontSize: "clamp(18px, 1.9vw, 24px)",
            fontWeight: 500,
            letterSpacing: "-0.022em",
            color: "var(--text-secondary)",
            lineHeight: 1.25,
            maxWidth: "88%",
            margin: "0 0 22px",
            cursor: "pointer",
          }}
        >
          {post.pull}
        </p>
      ) : null}

      {/* PHOTO */}
      <div onClick={() => onOpenBuilding && onOpenBuilding(post)} style={{ cursor: "pointer" }}>
        <PhotoPlaceholder
          aspect={post.photo.aspect}
          tone={post.photo.tone}
          badge={post.badge ? <Badge variant="solid">{post.badge}</Badge> : null}
        />
      </div>

      {/* BYLINE — about the post */}
      <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase",
          color: "var(--text-secondary)",
        }}>
          <Avatar initials={post.author.initials} size={22} dark={post.author.dark} gradient={post.author.gradient} />
          <span style={{ color: "var(--text-disabled)" }}>By</span>
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{post.author.name}</span>
          <RatingDots rating={post.rating} />
          <span style={{ color: "var(--text-disabled)", letterSpacing: "0.06em" }}>{post.time}</span>
        </div>
        <a href="#" style={{
          fontSize: 11, fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase",
          color: "var(--text-secondary)", textDecoration: "none",
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
          Save
        </a>
      </div>
    </article>
  );
}

function FeedSidebar() {
  const stats = [
    { value: "1,284,902", label: "Buildings" },
    { value: "38,219", label: "Architects" },
    { value: "412,840", label: "Reviews" },
  ];
  const trending = [
    { rank: "01", name: "Notre-Dame du Haut", city: "Ronchamp" },
    { rank: "02", name: "Therme Vals", city: "Vals" },
    { rank: "03", name: "Sagrada Família", city: "Barcelona" },
    { rank: "04", name: "Sydney Opera House", city: "Sydney" },
  ];
  return (
    <aside style={{ position: "sticky", top: 88, alignSelf: "flex-start", width: 280, flexShrink: 0 }}>
      <div style={{ marginBottom: 36 }}>
        <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-disabled)", margin: "0 0 14px" }}>The catalogue</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {stats.map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.025em", color: "var(--text-primary)", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-disabled)", marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-disabled)", margin: "0 0 14px" }}>Trending this week</p>
        {trending.map((t) => (
          <div key={t.rank} style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border-default)" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-disabled)", letterSpacing: "0.04em" }}>{t.rank}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3 }}>{t.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>{t.city}</div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function FeedPage({ onOpenBuilding }) {
  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "40px 32px 96px", display: "flex", gap: 56, alignItems: "flex-start" }}>
      <main style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 32, paddingBottom: 10, borderBottom: "1px solid var(--text-primary)" }}>
          <h1 style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-primary)", margin: 0 }}>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-disabled)", marginRight: 10 }}>§ 01</span>
            Latest from your circle
          </h1>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-disabled)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            12 new this week
          </span>
        </div>

        {FEED_POSTS.map((post) => (
          <FeedPost key={post.id} post={post} onOpenBuilding={onOpenBuilding} />
        ))}
      </main>
      <FeedSidebar />
    </div>
  );
}

Object.assign(window, { FeedPage, FeedPost, FeedSidebar });
