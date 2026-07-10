import React from 'react';

/* ── Nav model (mirrors src/components/layout/navigation.ts, `top` surface) ── */
const TOP_NAV = [
  { label: 'Feed', path: '/' },
  { label: 'Events', path: '/events' },
  { label: 'Explore', path: '/explore' },
  { label: 'Guides', path: '/guides' },
  { label: 'Search', path: '/search' },
  { label: 'Connect', path: '/connect' },
  { label: 'Awards', path: '/awards' },
  { label: 'Support', path: '/support' },
];

function isActive(path, current) {
  if (path === '/') return current === '/';
  return current === path || current.startsWith(path + '/');
}

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
);
const IconBell = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

function Wordmark() {
  return (
    <svg viewBox="0 0 338.087 74.709" role="img" aria-label="Plano"
      style={{ height: 16, width: 'auto', display: 'block', flexShrink: 0 }} xmlns="http://www.w3.org/2000/svg">
      <g fill="currentColor" fillRule="nonzero">
        <path d="M 0 73.731 L 0 0.977 L 28.369 0.977 Q 36.67 0.977 42.48 4.127 Q 48.291 7.276 51.343 12.818 Q 54.395 18.36 54.395 25.538 Q 54.395 32.765 51.294 38.258 Q 48.193 43.751 42.31 46.852 Q 36.426 49.952 28.027 49.952 L 14.893 49.952 L 14.893 73.731 L 0 73.731 Z" />
        <path d="M 111.084 73.731 L 64.795 73.731 L 64.795 0.977 L 79.688 0.977 L 79.688 61.378 L 111.084 61.378 L 111.084 73.731 Z" />
        <path d="M 117.139 73.731 L 141.992 0.977 L 161.523 0.977 L 187.012 73.731 L 170.459 73.731 L 164.845 56.837 L 132.666 56.837 L 138.994 56.837 L 133.594 73.731" />
        <path d="M 195.996 73.731 L 195.996 0.977 L 212.598 0.977 L 235.596 37.794 Q 237.354 40.626 239.16 43.946 Q 240.967 47.267 242.847 51.319 Q 244.727 55.372 246.582 60.45 L 245.068 60.45 Q 244.727 56.397 244.458 51.808 Q 244.189 47.218 243.994 43.018 Q 243.799 38.819 243.799 35.89 L 243.799 0.977 L 259.033 0.977 L 259.033 73.731 L 242.383 73.731 L 221.484 40.333 Q 219.189 36.573 217.236 33.033 Q 215.283 29.493 213.159 25.221 Q 211.035 20.948 208.105 14.991 L 210.01 14.991 Q 210.303 20.265 210.596 25.099 Q 210.889 29.933 211.06 33.863 Q 211.23 37.794 211.23 40.284 L 211.23 73.731 Z" />
        <path d="M 304.15 74.708 Q 294.531 74.708 286.841 70.313 Q 279.15 65.919 274.683 57.569 Q 270.215 49.22 270.215 37.403 Q 270.215 25.538 274.683 17.164 Q 279.15 8.79 286.841 4.395 Q 294.531 0.001 304.15 0.001 Q 313.818 0.001 321.484 4.395 Q 329.15 8.79 333.618 17.164 Q 338.086 25.538 338.086 37.403 Q 338.086 49.22 333.618 57.569 Q 329.15 65.919 321.484 70.313 Q 313.818 74.708 304.15 74.708 Z" />
      </g>
    </svg>
  );
}

const CSS = `
.pl-topnav{box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;width:100%;height:64px;padding:0 32px;background:rgba(250,250,250,0.92);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-bottom:1px solid var(--border-default);font-family:var(--font-sans)}
.pl-topnav *{box-sizing:border-box}
.pl-topnav__left{display:flex;align-items:center;gap:32px;min-width:0}
.pl-topnav__logo{display:flex;color:var(--text-primary);text-decoration:none;flex-shrink:0}
.pl-topnav__nav{display:flex;align-items:center;gap:22px}
.pl-navlink{position:relative;padding:4px 0;font-size:14px;font-weight:500;color:var(--text-secondary);text-decoration:none;transition:color 150ms ease;white-space:nowrap}
.pl-navlink:hover{color:var(--text-primary)}
.pl-navlink.is-active{font-weight:700;color:var(--text-primary)}
.pl-navlink__underline{position:absolute;left:0;bottom:-2px;width:100%;height:1px;background:var(--text-primary)}
.pl-topnav__right{display:flex;align-items:center;gap:8px;flex-shrink:0}
.pl-iconbtn{position:relative;display:flex;align-items:center;justify-content:center;height:36px;width:36px;border-radius:var(--radius-sm);color:var(--text-secondary);text-decoration:none;transition:color 150ms ease}
.pl-iconbtn:hover{color:var(--text-primary)}
.pl-ghostbtn{display:inline-flex;align-items:center;height:36px;padding:0 12px;border-radius:var(--radius-sm);font-size:14px;font-weight:500;color:var(--text-primary);text-decoration:none;background:transparent;border:0;cursor:pointer;font-family:inherit;transition:background 150ms ease;white-space:nowrap}
.pl-ghostbtn:hover{background:var(--surface-muted)}
.pl-badge{position:absolute;top:8px;right:8px;height:7px;width:7px;border-radius:9999px;background:var(--brand-accent);border:1.5px solid var(--surface-default)}
.pl-avatar{display:flex;align-items:center;justify-content:center;height:32px;width:32px;border-radius:9999px;overflow:hidden;background:var(--surface-muted);box-shadow:inset 0 0 0 1px var(--border-default);font-size:12px;font-weight:700;color:var(--text-primary)}
.pl-avatar img{height:100%;width:100%;object-fit:cover}
`;

/**
 * Desktop sticky header — logo, nav, and the right-hand action cluster.
 * Recreated from src/components/layout/AppTopNav.tsx. Presentational: `href`s
 * are inert placeholders; wire them in the consuming app.
 */
export function AppTopNav({ signedIn = true, activePath = '/', userInitial = 'A', avatarUrl = '', hasNotification = true }) {
  return (
    <header className="pl-topnav">
      <style>{CSS}</style>
      <div className="pl-topnav__left">
        <a href="#" className="pl-topnav__logo" aria-label="Plano · Home"><Wordmark /></a>
        <nav className="pl-topnav__nav">
          {TOP_NAV.map((item) => {
            const active = isActive(item.path, activePath);
            return (
              <a key={item.path} href="#" className={active ? 'pl-navlink is-active' : 'pl-navlink'}>
                {item.label}
                {active ? <span className="pl-navlink__underline" /> : null}
              </a>
            );
          })}
        </nav>
      </div>
      <div className="pl-topnav__right">
        <a href="#" className="pl-iconbtn" aria-label="Search"><IconSearch /></a>
        {signedIn ? (
          <>
            <a href="#" className="pl-ghostbtn">Log a visit</a>
            <a href="#" className="pl-iconbtn" aria-label="Notifications">
              <IconBell />
              {hasNotification ? <span className="pl-badge" /> : null}
            </a>
            <div className="pl-avatar">
              {avatarUrl ? <img src={avatarUrl} alt="" /> : userInitial}
            </div>
          </>
        ) : (
          <button type="button" className="pl-ghostbtn">Join the waiting list</button>
        )}
      </div>
    </header>
  );
}
