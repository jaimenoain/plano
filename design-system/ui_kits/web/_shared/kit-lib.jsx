/* ============================================================
   Plano Web UI Kit — shared JS helpers
   Loaded as <script type="text/babel" src="../_shared/kit-lib.jsx"> BEFORE
   each screen's inline script. Everything is attached to `window` so the
   screen script (its own Babel scope) can read it.

   NOT here: PlanoLogo / AppTopNav / MobileTopBar / BottomNav / SiteFooter.
   Those are real design-system components — load _ds_bundle.js and read them
   off window.PlanoDesignSystem_e8d587.
   ============================================================ */
const { useState, useEffect } = React;

/* ─── Award dots ──────────────────────────────────────────────────────
   Render ONLY the earned dots (1–3 filled black circles). Zero dots renders
   NOTHING — never a ring, never "0/3". This is an award, not a rating. */
const Rating = ({ n, size }) => {
  if (!n || n < 1) return null;
  const cls = size === "sm" ? "rdot sm" : size === "lg" ? "rdot lg" : "rdot";
  return (
    <span className="rdots" aria-label={`${n} award dot${n > 1 ? "s" : ""}`}>
      {Array.from({ length: n }).map((_, i) => <i key={i} className={cls} />)}
    </span>
  );
};

/* ─── Lucide icon set (1.5px stroke, currentColor) ───────────────────
   Extensible: a screen can add its own before rendering, e.g.
     Object.assign(PLANO_ICONS, { compass: '<circle .../><polygon .../>' });
   then <Icon name="compass" />. */
const PLANO_ICONS = {
  search:   '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  bell:     '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  filter:   '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46"/>',
  mappin:   '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  check:    '<polyline points="20 6 9 17 4 12"/>',
  chevdown: '<polyline points="6 9 12 15 18 9"/>',
  chevleft: '<polyline points="15 18 9 12 15 6"/>',
  chevright:'<polyline points="9 18 15 12 9 6"/>',
  x:        '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  plus:     '<path d="M12 5v14"/><path d="M5 12h14"/>',
  minus:    '<path d="M5 12h14"/>',
  upload:   '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><path d="M12 3v12"/>',
  image:    '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
  edit:     '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>',
  trash:    '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  arrowleft:'<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  arrowright:'<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  heart:    '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  star:     '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/>',
  lock:     '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  users:    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  user:     '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  building: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
  briefcase:'<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
  message:  '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  play:     '<polygon points="6 3 20 12 6 21 6 3"/>',
  bookopen: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  clock:    '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  share:    '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><path d="M12 2v13"/>',
  walk:     '<circle cx="13" cy="4" r="1"/><path d="m9 20 3-6 2 2 2 5"/><path d="m6 12 4-4 3 3 3-1"/>',
  train:    '<rect width="16" height="16" x="4" y="3" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><path d="m8 19-2 3"/><path d="m18 22-2-3"/><path d="M8 15h.01"/><path d="M16 15h.01"/>',
  car:      '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
};
const Icon = ({ name, size = 18, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    style={style} dangerouslySetInnerHTML={{ __html: PLANO_ICONS[name] || "" }} />
);

/* Filled variants for like/save active states */
const HeartFill = ({ size = 16, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor"
    strokeWidth="1.5" strokeLinejoin="round" style={style}
    dangerouslySetInnerHTML={{ __html: PLANO_ICONS.heart }} />
);
const StarFill = ({ size = 16, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor"
    strokeWidth="1.5" strokeLinejoin="round" style={style}
    dangerouslySetInnerHTML={{ __html: PLANO_ICONS.star }} />
);

/* Verified entity badge (Lucide BadgeCheck) — never lime */
const BadgeCheck = ({ size = 16, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
);

/* ─── Sample architecture photography (Unsplash) ─────────────────────
   Stand-in imagery. Screens may add their own keys locally as needed. */
const IMG = {
  barbican:   "https://images.unsplash.com/photo-1460574283810-2aab119d8511?w=1600&q=80",
  villa:      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1600&q=80",
  unite:      "https://images.unsplash.com/photo-1459767129954-1b1c1f9b9ace?w=1600&q=80",
  guggenheim: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=1600&q=80",
  salk:       "https://images.unsplash.com/photo-1497604401993-f2e922e5cb0a?w=1600&q=80",
  pompidou:   "https://images.unsplash.com/photo-1574958269340-fa927503f3dd?w=1600&q=80",
  sagrada:    "https://images.unsplash.com/photo-1494145904049-0dca59b4bbad?w=1600&q=80",
  farnsworth: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=80",
  therme:     "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=1600&q=80",
  kimbell:    "https://images.unsplash.com/photo-1524230572899-a752b3835840?w=1600&q=80",
  sydney:     "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1600&q=80",
  teshima:    "https://images.unsplash.com/photo-1493397212122-2b85dda8106b?w=1600&q=80",
};

/* Expose to the global scope for screen scripts (separate Babel scope). */
Object.assign(window, { Rating, Icon, HeartFill, StarFill, BadgeCheck, PLANO_ICONS, IMG });
