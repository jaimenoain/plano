import React from 'react';

/* ── `bottom` surface from src/components/layout/navigation.ts ── */
const BOTTOM_NAV = [
  { label: 'Feed', path: '/' },
  { label: 'Events', path: '/events' },
  { label: 'Explore', path: '/explore' },
  { label: 'Search', path: '/search' },
  { label: 'Connect', path: '/connect' },
  { label: 'You', path: '/profile' },
];

function isActive(path, current) {
  if (path === '/') return current === '/';
  return current === path || current.startsWith(path + '/');
}

const ICONS = {
  '/': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
  ),
  '/events': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /></svg>
  ),
  '/explore': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 3 20 12 6 21 6 3" /></svg>
  ),
  '/search': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
  ),
  '/connect': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  ),
  '/profile': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
  ),
};

const CSS = `
.pl-bnav{box-sizing:border-box;width:100%;font-family:var(--font-sans);border-top:1px solid var(--border-default);background:var(--surface-default)}
.pl-bnav.is-inverse{background:var(--surface-inverse);border-top-color:rgba(255,255,255,0.1)}
.pl-bnav *{box-sizing:border-box}
.pl-bnav__row{display:flex;align-items:stretch;justify-content:space-around;height:80px;max-width:512px;margin:0 auto;padding:0 8px 8px}
.pl-bnav__item{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-decoration:none;border-top:2px solid transparent;transition:color 300ms ease}
.pl-bnav__item svg{width:24px;height:24px}
.pl-bnav__label{font-size:10px;font-weight:500;letter-spacing:0.15em;text-transform:uppercase}
.pl-bnav .pl-bnav__item{color:var(--text-secondary)}
.pl-bnav .pl-bnav__item.is-active{color:var(--text-primary);border-top-color:var(--text-primary)}
.pl-bnav .pl-bnav__item.is-active svg{stroke-width:2.5}
.pl-bnav.is-inverse .pl-bnav__item{color:rgba(255,255,255,0.55)}
.pl-bnav.is-inverse .pl-bnav__item.is-active{color:#fff;border-top-color:#fff}
`;

/**
 * Mobile bottom tab bar. Recreated from src/components/layout/BottomNav.tsx.
 * `variant="inverse"` is the pitch-black treatment used over the Explore feed.
 */
export function BottomNav({ activePath = '/', variant = 'default' }) {
  return (
    <nav className={variant === 'inverse' ? 'pl-bnav is-inverse' : 'pl-bnav'} aria-label="Primary">
      <style>{CSS}</style>
      <div className="pl-bnav__row">
        {BOTTOM_NAV.map((item) => {
          const active = isActive(item.path, activePath);
          return (
            <a key={item.path} href="#" aria-label={item.label} className={active ? 'pl-bnav__item is-active' : 'pl-bnav__item'}>
              {ICONS[item.path]}
              <span className="pl-bnav__label">{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
