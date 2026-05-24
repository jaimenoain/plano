/* Plano UI kit · shared primitives ----------------------------------------- */
/* All components are exported to window at the bottom for cross-file access. */

const { useState, useEffect, useRef } = React;

/* ─── Logo + Symbol ─── */
function PlanoLogo({ className = "", style = {} }) {
  return (
    <svg
      viewBox="0 0 338.087 74.709"
      className={className}
      role="img"
      aria-label="Plano"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "inline-block", height: "1em", width: "auto", verticalAlign: "middle", color: "currentColor", ...style }}
    >
      <g fill="currentColor" fillRule="nonzero">
        <path d="M 0 73.731 L 0 0.977 L 28.369 0.977 Q 36.67 0.977 42.48 4.127 Q 48.291 7.276 51.343 12.818 Q 54.395 18.36 54.395 25.538 Q 54.395 32.765 51.294 38.258 Q 48.193 43.751 42.31 46.852 Q 36.426 49.952 28.027 49.952 L 14.893 49.952 L 14.893 73.731 L 0 73.731 Z" />
        <path d="M 111.084 73.731 L 64.795 73.731 L 64.795 0.977 L 79.688 0.977 L 79.688 61.378 L 111.084 61.378 L 111.084 73.731 Z" />
        <path d="M 117.139 73.731 L 141.992 0.977 L 161.523 0.977 L 187.012 73.731 L 170.459 73.731 L 164.845 56.837 L 132.666 56.837 L 138.994 56.837 L 133.594 73.731" />
        <path d="M 195.996 73.731 L 195.996 0.977 L 212.598 0.977 L 235.596 37.794 Q 237.354 40.626 239.16 43.946 Q 240.967 47.267 242.847 51.319 Q 244.727 55.372 246.582 60.45 L 245.068 60.45 Q 244.727 56.397 244.458 51.808 Q 244.189 47.218 243.994 43.018 Q 243.799 38.819 243.994 35.89 L 243.799 0.977 L 259.033 0.977 L 259.033 73.731 L 242.383 73.731 L 221.484 40.333 Q 219.189 36.573 217.236 33.033 Q 215.283 29.493 213.159 25.221 Q 211.035 20.948 208.105 14.991 L 210.01 14.991 Q 210.303 20.265 210.596 25.099 Q 210.889 29.933 211.06 33.863 Q 211.23 37.794 211.23 40.284 L 211.23 73.731 Z" />
        <path d="M 304.15 74.708 Q 294.531 74.708 286.841 70.313 Q 279.15 65.919 274.683 57.569 Q 270.215 49.22 270.215 37.403 Q 270.215 25.538 274.683 17.164 Q 279.15 8.79 286.841 4.395 Q 294.531 0.001 304.15 0.001 Q 313.818 0.001 321.484 4.395 Q 329.15 8.79 333.618 17.164 Q 338.086 25.538 338.086 37.403 Q 338.086 49.22 333.618 57.569 Q 329.15 65.919 321.484 70.313 Q 313.818 74.708 304.15 74.708 Z" />
      </g>
    </svg>
  );
}

function PlanoSymbol({ className = "", style = {} }) {
  return (
    <svg
      viewBox="0 0 55 75"
      className={className}
      role="img"
      aria-label="Plano Symbol"
      style={{ display: "inline-block", height: "1em", width: "auto", verticalAlign: "middle", color: "currentColor", ...style }}
    >
      <path
        fill="currentColor"
        fillRule="nonzero"
        d="M 0 73.731 L 0 0.977 L 28.369 0.977 Q 36.67 0.977 42.48 4.127 Q 48.291 7.276 51.343 12.818 Q 54.395 18.36 54.395 25.538 Q 54.395 32.765 51.294 38.258 Q 48.193 43.751 42.31 46.852 Q 36.426 49.952 28.027 49.952 L 14.893 49.952 L 14.893 73.731 L 0 73.731 Z"
      />
    </svg>
  );
}

/* ─── Lucide-style icons (inline SVG, stroke-only, 2px) ─── */
const ICON_PATHS = {
  bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>,
  search: <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>,
  "map-pin": <><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></>,
  "building-2": <><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></>,
  user: <><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  trophy: <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></>,
  "badge-check": <><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/></>,
  arrow: <><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></>,
  plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>,
  "chevron-down": <path d="m6 9 6 6 6-6"/>,
  share: <><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></>,
  bookmark: <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>,
  external: <><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></>,
};
function Icon({ name, size = 16, strokeWidth = 2, className = "", style = {} }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ display: "inline-block", flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      {ICON_PATHS[name] ?? null}
    </svg>
  );
}

/* ─── Primitives ─── */
function Eyebrow({ children, tone = "default", className = "" }) {
  const color = tone === "faint" ? "var(--text-disabled)" : tone === "strong" ? "var(--text-primary)" : "var(--text-secondary)";
  return (
    <span
      className={className}
      style={{
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        color,
        display: "inline-block",
      }}
    >
      {children}
    </span>
  );
}

function CtaLink({ children, onClick, href = "#", className = "" }) {
  const [hover, setHover] = useState(false);
  return (
    <a
      href={href}
      onClick={(e) => { if (onClick) { e.preventDefault(); onClick(e); } }}
      className={className}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        color: hover ? "var(--text-secondary)" : "var(--text-primary)",
        textDecoration: "none",
        transition: "color 120ms ease",
      }}
    >
      <span>{children}</span>
      <span style={{ color: "var(--text-primary)", transform: hover ? "translateX(2px)" : "none", transition: "transform 120ms ease" }}>→</span>
    </a>
  );
}

function Button({ children, variant = "primary", size = "md", onClick, className = "", as: As = "button", ...rest }) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontFamily: "var(--font-sans)",
    fontWeight: 500,
    lineHeight: 1,
    borderRadius: 2,
    border: 0,
    cursor: "pointer",
    transition: "background 120ms ease, color 120ms ease, border-color 120ms ease",
    textDecoration: "none",
    whiteSpace: "nowrap",
  };
  const sizes = {
    sm: { height: 32, padding: "0 12px", fontSize: 13 },
    md: { height: 40, padding: "0 16px", fontSize: 14 },
    lg: { height: 48, padding: "0 24px", fontSize: 14 },
  };
  const variants = {
    primary:   { background: "var(--brand-primary)", color: "var(--brand-primary-foreground)" },
    secondary: { background: "var(--brand-secondary)", color: "var(--brand-secondary-foreground)", border: "1px solid var(--border-default)" },
    outline:   { background: "var(--surface-card)", color: "var(--text-primary)", border: "1px solid var(--border-default)" },
    ghost:     { background: "transparent", color: "var(--text-primary)" },
  };
  const [hover, setHover] = useState(false);
  const hovers = {
    primary:   { background: "var(--brand-primary-hover)" },
    secondary: { background: "#EDEDED" },
    outline:   { background: "var(--surface-muted)" },
    ghost:     { background: "var(--surface-muted)" },
  };
  return (
    <As
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={className}
      style={{ ...base, ...sizes[size], ...variants[variant], ...(hover ? hovers[variant] : {}) }}
      {...rest}
    >
      {children}
    </As>
  );
}

function Badge({ children, variant = "default", icon }) {
  const variants = {
    default:   { background: "var(--surface-muted)", color: "var(--text-primary)", border: "1px solid var(--border-default)" },
    outline:   { background: "transparent", color: "var(--text-primary)", border: "1px solid var(--border-default)" },
    solid:     { background: "var(--brand-primary)", color: "var(--brand-primary-foreground)", border: "1px solid var(--brand-primary)" },
    secondary: { background: "var(--surface-muted)", color: "var(--text-secondary)", border: "1px solid var(--border-default)" },
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 2,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        ...variants[variant],
      }}
    >
      {icon ? <Icon name={icon} size={11} /> : null}
      {children}
    </span>
  );
}

function Avatar({ initials, size = 32, dark = false, gradient = null, verified = false, style = {} }) {
  let bg = dark ? "var(--brand-primary)" : "var(--surface-muted)";
  let color = dark ? "var(--brand-primary-foreground)" : "var(--text-primary)";
  let border = "1px solid var(--border-default)";
  if (gradient) {
    bg = `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`;
    color = "var(--text-inverse)";
    border = "0";
  }
  return (
    <span style={{ position: "relative", display: "inline-block", verticalAlign: "middle" }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: size,
          height: size,
          borderRadius: "50%",
          background: bg,
          color,
          border,
          fontSize: Math.max(9, size * 0.35),
          fontWeight: 700,
          fontFamily: "var(--font-sans)",
          ...style,
        }}
      >
        {initials}
      </span>
      {verified ? (
        <span
          style={{
            position: "absolute",
            right: -2,
            bottom: -2,
            width: Math.max(12, size * 0.36),
            height: Math.max(12, size * 0.36),
            borderRadius: "50%",
            background: "var(--brand-primary)",
            color: "var(--brand-primary-foreground)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid var(--surface-default)",
          }}
        >
          <Icon name="badge-check" size={Math.max(8, size * 0.22)} />
        </span>
      ) : null}
    </span>
  );
}

/* ─── Photo placeholder ─── */
/* We never draw illustrations. We render a flat gradient stand-in for any
   building photograph and label it with a monospace ID, the way a magazine
   plate would have a caption. */
function PhotoPlaceholder({ aspect = "16 / 9", tone = "graphite", caption, badge, children, className = "", style = {} }) {
  const tones = {
    graphite: "linear-gradient(155deg, #2A2A2A 0%, #404040 50%, #1A1A1A 100%)",
    concrete: "linear-gradient(180deg, #C5C5C5 0%, #A8A8A8 60%, #8C8C8C 100%)",
    chalk:    "linear-gradient(180deg, #D4D4D4 0%, #BFBFBF 100%)",
    midnight: "linear-gradient(160deg, #0A0A0A 0%, #262626 100%)",
    fog:      "linear-gradient(180deg, #E5E5E5 0%, #C5C5C5 100%)",
  };
  return (
    <div
      className={className}
      style={{
        position: "relative",
        aspectRatio: aspect,
        background: tones[tone] ?? tones.graphite,
        overflow: "hidden",
        ...style,
      }}
    >
      {/* faint diagonal etch — drafting reference */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "12px 12px", pointerEvents: "none" }} />
      {badge ? <div style={{ position: "absolute", top: 12, left: 12 }}>{badge}</div> : null}
      {children}
      {caption ? (
        <div style={{ position: "absolute", left: 14, bottom: 12, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.04em", color: "rgba(255,255,255,0.78)", textTransform: "uppercase" }}>
          {caption}
        </div>
      ) : null}
    </div>
  );
}

/* ─── Export to window ─── */
Object.assign(window, {
  PlanoLogo,
  PlanoSymbol,
  Icon,
  Eyebrow,
  CtaLink,
  Button,
  Badge,
  Avatar,
  PhotoPlaceholder,
});
