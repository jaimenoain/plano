/* App · top nav · for signed-in views */

function AppTopNav({ activeView, onNavigate, hasUnread = true }) {
  const items = [
    { key: "feed", label: "Feed" },
    { key: "explore", label: "Explore" },
    { key: "guides", label: "Guides" },
    { key: "search", label: "Search" },
    { key: "connect", label: "Connect" },
  ];

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 64,
        padding: "0 32px",
        background: "rgba(250,250,250,0.92)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderBottom: "1px solid var(--border-default)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 32, minWidth: 0 }}>
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); onNavigate("feed"); }}
          style={{ flexShrink: 0, color: "var(--text-primary)" }}
          aria-label="Plano · Home"
        >
          <PlanoLogo style={{ height: 16 }} />
        </a>
        <nav style={{ display: "flex", alignItems: "center", gap: 22 }}>
          {items.map((it) => {
            const active = it.key === activeView;
            return (
              <a
                key={it.key}
                href="#"
                onClick={(e) => { e.preventDefault(); onNavigate(it.key); }}
                style={{
                  position: "relative",
                  fontSize: 14,
                  fontWeight: active ? 700 : 500,
                  color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  textDecoration: "none",
                  padding: "4px 0",
                  transition: "color 120ms ease",
                }}
              >
                {it.label}
                {active ? (
                  <span style={{ position: "absolute", left: 0, bottom: -2, width: "100%", height: 1, background: "var(--text-primary)" }} />
                ) : null}
              </a>
            );
          })}
        </nav>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          aria-label="Search"
          style={{ width: 36, height: 36, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "transparent", border: 0, color: "var(--text-secondary)", cursor: "pointer" }}
        >
          <Icon name="search" size={16} />
        </button>
        <Button variant="ghost" size="sm">Log a visit</Button>
        <button
          aria-label="Notifications"
          style={{ width: 36, height: 36, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "transparent", border: 0, color: "var(--text-secondary)", cursor: "pointer", position: "relative" }}
        >
          <Icon name="bell" size={16} />
          {hasUnread ? (
            <span style={{ position: "absolute", top: 8, right: 8, width: 7, height: 7, borderRadius: "50%", background: "var(--brand-accent)", border: "1.5px solid var(--surface-default)" }} />
          ) : null}
        </button>
        <Avatar initials="J" size={32} dark />
      </div>
    </header>
  );
}

Object.assign(window, { AppTopNav });
