/* @ds-bundle: {"format":4,"namespace":"PlanoDesignSystem_e8d587","components":[{"name":"AppTopNav","sourcePath":"components/AppTopNav/AppTopNav.jsx"},{"name":"BottomNav","sourcePath":"components/BottomNav/BottomNav.jsx"},{"name":"MobileTopBar","sourcePath":"components/MobileTopBar/MobileTopBar.jsx"},{"name":"PlanoLogo","sourcePath":"components/PlanoLogo/PlanoLogo.jsx"},{"name":"SiteFooter","sourcePath":"components/SiteFooter/SiteFooter.jsx"}],"sourceHashes":{"components/AppTopNav/AppTopNav.jsx":"9407891a6e03","components/BottomNav/BottomNav.jsx":"049d10c47cfa","components/MobileTopBar/MobileTopBar.jsx":"9ca5e596d99f","components/PlanoLogo/PlanoLogo.jsx":"662ca34d2e86","components/SiteFooter/SiteFooter.jsx":"10cfc4547ba3","ui_kits/web/_shared/kit-lib.jsx":"c89cb2d49586"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.PlanoDesignSystem_e8d587 = window.PlanoDesignSystem_e8d587 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/AppTopNav/AppTopNav.jsx
try { (() => {
/* ── Nav model (mirrors src/components/layout/navigation.ts, `top` surface) ── */
const TOP_NAV = [{
  label: 'Feed',
  path: '/'
}, {
  label: 'Events',
  path: '/events'
}, {
  label: 'Explore',
  path: '/explore'
}, {
  label: 'Guides',
  path: '/guides'
}, {
  label: 'Search',
  path: '/search'
}, {
  label: 'Connect',
  path: '/connect'
}, {
  label: 'Awards',
  path: '/awards'
}, {
  label: 'Support',
  path: '/support'
}];
function isActive(path, current) {
  if (path === '/') return current === '/';
  return current === path || current.startsWith(path + '/');
}
const IconSearch = () => /*#__PURE__*/React.createElement("svg", {
  width: "16",
  height: "16",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.75",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("circle", {
  cx: "11",
  cy: "11",
  r: "8"
}), /*#__PURE__*/React.createElement("path", {
  d: "m21 21-4.3-4.3"
}));
const IconBell = () => /*#__PURE__*/React.createElement("svg", {
  width: "16",
  height: "16",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.75",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"
}), /*#__PURE__*/React.createElement("path", {
  d: "M10.3 21a1.94 1.94 0 0 0 3.4 0"
}));
function Wordmark() {
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 338.087 74.709",
    role: "img",
    "aria-label": "Plano",
    style: {
      height: 16,
      width: 'auto',
      display: 'block',
      flexShrink: 0
    },
    xmlns: "http://www.w3.org/2000/svg"
  }, /*#__PURE__*/React.createElement("g", {
    fill: "currentColor",
    fillRule: "nonzero"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M 0 73.731 L 0 0.977 L 28.369 0.977 Q 36.67 0.977 42.48 4.127 Q 48.291 7.276 51.343 12.818 Q 54.395 18.36 54.395 25.538 Q 54.395 32.765 51.294 38.258 Q 48.193 43.751 42.31 46.852 Q 36.426 49.952 28.027 49.952 L 14.893 49.952 L 14.893 73.731 L 0 73.731 Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 111.084 73.731 L 64.795 73.731 L 64.795 0.977 L 79.688 0.977 L 79.688 61.378 L 111.084 61.378 L 111.084 73.731 Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 117.139 73.731 L 141.992 0.977 L 161.523 0.977 L 187.012 73.731 L 170.459 73.731 L 164.845 56.837 L 132.666 56.837 L 138.994 56.837 L 133.594 73.731"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 195.996 73.731 L 195.996 0.977 L 212.598 0.977 L 235.596 37.794 Q 237.354 40.626 239.16 43.946 Q 240.967 47.267 242.847 51.319 Q 244.727 55.372 246.582 60.45 L 245.068 60.45 Q 244.727 56.397 244.458 51.808 Q 244.189 47.218 243.994 43.018 Q 243.799 38.819 243.799 35.89 L 243.799 0.977 L 259.033 0.977 L 259.033 73.731 L 242.383 73.731 L 221.484 40.333 Q 219.189 36.573 217.236 33.033 Q 215.283 29.493 213.159 25.221 Q 211.035 20.948 208.105 14.991 L 210.01 14.991 Q 210.303 20.265 210.596 25.099 Q 210.889 29.933 211.06 33.863 Q 211.23 37.794 211.23 40.284 L 211.23 73.731 Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 304.15 74.708 Q 294.531 74.708 286.841 70.313 Q 279.15 65.919 274.683 57.569 Q 270.215 49.22 270.215 37.403 Q 270.215 25.538 274.683 17.164 Q 279.15 8.79 286.841 4.395 Q 294.531 0.001 304.15 0.001 Q 313.818 0.001 321.484 4.395 Q 329.15 8.79 333.618 17.164 Q 338.086 25.538 338.086 37.403 Q 338.086 49.22 333.618 57.569 Q 329.15 65.919 321.484 70.313 Q 313.818 74.708 304.15 74.708 Z"
  })));
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
function AppTopNav({
  signedIn = true,
  activePath = '/',
  userInitial = 'A',
  avatarUrl = '',
  hasNotification = true
}) {
  return /*#__PURE__*/React.createElement("header", {
    className: "pl-topnav"
  }, /*#__PURE__*/React.createElement("style", null, CSS), /*#__PURE__*/React.createElement("div", {
    className: "pl-topnav__left"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "pl-topnav__logo",
    "aria-label": "Plano \xB7 Home"
  }, /*#__PURE__*/React.createElement(Wordmark, null)), /*#__PURE__*/React.createElement("nav", {
    className: "pl-topnav__nav"
  }, TOP_NAV.map(item => {
    const active = isActive(item.path, activePath);
    return /*#__PURE__*/React.createElement("a", {
      key: item.path,
      href: "#",
      className: active ? 'pl-navlink is-active' : 'pl-navlink'
    }, item.label, active ? /*#__PURE__*/React.createElement("span", {
      className: "pl-navlink__underline"
    }) : null);
  }))), /*#__PURE__*/React.createElement("div", {
    className: "pl-topnav__right"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "pl-iconbtn",
    "aria-label": "Search"
  }, /*#__PURE__*/React.createElement(IconSearch, null)), signedIn ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "pl-ghostbtn"
  }, "Log a visit"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "pl-iconbtn",
    "aria-label": "Notifications"
  }, /*#__PURE__*/React.createElement(IconBell, null), hasNotification ? /*#__PURE__*/React.createElement("span", {
    className: "pl-badge"
  }) : null), /*#__PURE__*/React.createElement("div", {
    className: "pl-avatar"
  }, avatarUrl ? /*#__PURE__*/React.createElement("img", {
    src: avatarUrl,
    alt: ""
  }) : userInitial)) : /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "pl-ghostbtn"
  }, "Join the waiting list")));
}
Object.assign(__ds_scope, { AppTopNav });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/AppTopNav/AppTopNav.jsx", error: String((e && e.message) || e) }); }

// components/BottomNav/BottomNav.jsx
try { (() => {
/* ── `bottom` surface from src/components/layout/navigation.ts ── */
const BOTTOM_NAV = [{
  label: 'Feed',
  path: '/'
}, {
  label: 'Events',
  path: '/events'
}, {
  label: 'Explore',
  path: '/explore'
}, {
  label: 'Search',
  path: '/search'
}, {
  label: 'Connect',
  path: '/connect'
}, {
  label: 'You',
  path: '/profile'
}];
function isActive(path, current) {
  if (path === '/') return current === '/';
  return current === path || current.startsWith(path + '/');
}
const ICONS = {
  '/': /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M22 12h-4l-3 9L9 3l-3 9H2"
  })),
  '/events': /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8 2v4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 2v4"
  }), /*#__PURE__*/React.createElement("rect", {
    width: "18",
    height: "18",
    x: "3",
    y: "4",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 10h18"
  })),
  '/explore': /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("polygon", {
    points: "6 3 20 12 6 21 6 3"
  })),
  '/search': /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m21 21-4.3-4.3"
  })),
  '/connect': /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "7",
    r: "4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M22 21v-2a4 4 0 0 0-3-3.87"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 3.13a4 4 0 0 1 0 7.75"
  })),
  '/profile': /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "7",
    r: "4"
  }))
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
function BottomNav({
  activePath = '/',
  variant = 'default'
}) {
  return /*#__PURE__*/React.createElement("nav", {
    className: variant === 'inverse' ? 'pl-bnav is-inverse' : 'pl-bnav',
    "aria-label": "Primary"
  }, /*#__PURE__*/React.createElement("style", null, CSS), /*#__PURE__*/React.createElement("div", {
    className: "pl-bnav__row"
  }, BOTTOM_NAV.map(item => {
    const active = isActive(item.path, activePath);
    return /*#__PURE__*/React.createElement("a", {
      key: item.path,
      href: "#",
      "aria-label": item.label,
      className: active ? 'pl-bnav__item is-active' : 'pl-bnav__item'
    }, ICONS[item.path], /*#__PURE__*/React.createElement("span", {
      className: "pl-bnav__label"
    }, item.label));
  })));
}
Object.assign(__ds_scope, { BottomNav });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/BottomNav/BottomNav.jsx", error: String((e && e.message) || e) }); }

// components/MobileTopBar/MobileTopBar.jsx
try { (() => {
const IconMenu = () => /*#__PURE__*/React.createElement("svg", {
  width: "22",
  height: "22",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.75",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("line", {
  x1: "4",
  x2: "20",
  y1: "6",
  y2: "6"
}), /*#__PURE__*/React.createElement("line", {
  x1: "4",
  x2: "20",
  y1: "12",
  y2: "12"
}), /*#__PURE__*/React.createElement("line", {
  x1: "4",
  x2: "20",
  y1: "18",
  y2: "18"
}));
const IconBell = () => /*#__PURE__*/React.createElement("svg", {
  width: "20",
  height: "20",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.75",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"
}), /*#__PURE__*/React.createElement("path", {
  d: "M10.3 21a1.94 1.94 0 0 0 3.4 0"
}));
function Wordmark() {
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 338.087 74.709",
    role: "img",
    "aria-label": "Plano",
    style: {
      height: 16,
      width: 'auto',
      display: 'block',
      flexShrink: 0
    },
    xmlns: "http://www.w3.org/2000/svg"
  }, /*#__PURE__*/React.createElement("g", {
    fill: "currentColor",
    fillRule: "nonzero"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M 0 73.731 L 0 0.977 L 28.369 0.977 Q 36.67 0.977 42.48 4.127 Q 48.291 7.276 51.343 12.818 Q 54.395 18.36 54.395 25.538 Q 54.395 32.765 51.294 38.258 Q 48.193 43.751 42.31 46.852 Q 36.426 49.952 28.027 49.952 L 14.893 49.952 L 14.893 73.731 L 0 73.731 Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 111.084 73.731 L 64.795 73.731 L 64.795 0.977 L 79.688 0.977 L 79.688 61.378 L 111.084 61.378 L 111.084 73.731 Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 117.139 73.731 L 141.992 0.977 L 161.523 0.977 L 187.012 73.731 L 170.459 73.731 L 164.845 56.837 L 132.666 56.837 L 138.994 56.837 L 133.594 73.731"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 195.996 73.731 L 195.996 0.977 L 212.598 0.977 L 235.596 37.794 Q 237.354 40.626 239.16 43.946 Q 240.967 47.267 242.847 51.319 Q 244.727 55.372 246.582 60.45 L 245.068 60.45 Q 244.727 56.397 244.458 51.808 Q 244.189 47.218 243.994 43.018 Q 243.799 38.819 243.799 35.89 L 243.799 0.977 L 259.033 0.977 L 259.033 73.731 L 242.383 73.731 L 221.484 40.333 Q 219.189 36.573 217.236 33.033 Q 215.283 29.493 213.159 25.221 Q 211.035 20.948 208.105 14.991 L 210.01 14.991 Q 210.303 20.265 210.596 25.099 Q 210.889 29.933 211.06 33.863 Q 211.23 37.794 211.23 40.284 L 211.23 73.731 Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 304.15 74.708 Q 294.531 74.708 286.841 70.313 Q 279.15 65.919 274.683 57.569 Q 270.215 49.22 270.215 37.403 Q 270.215 25.538 274.683 17.164 Q 279.15 8.79 286.841 4.395 Q 294.531 0.001 304.15 0.001 Q 313.818 0.001 321.484 4.395 Q 329.15 8.79 333.618 17.164 Q 338.086 25.538 338.086 37.403 Q 338.086 49.22 333.618 57.569 Q 329.15 65.919 321.484 70.313 Q 313.818 74.708 304.15 74.708 Z"
  })));
}
const CSS = `
.pl-mtb{box-sizing:border-box;position:relative;display:flex;align-items:center;justify-content:space-between;width:100%;height:56px;padding:0 4px;background:var(--surface-default);border-bottom:1px solid var(--border-default);font-family:var(--font-sans)}
.pl-mtb *{box-sizing:border-box}
.pl-mtb__icon{display:flex;align-items:center;justify-content:center;height:44px;width:44px;border-radius:var(--radius-sm);color:var(--text-primary);text-decoration:none;background:transparent;border:0;cursor:pointer;flex-shrink:0}
.pl-mtb__logo{position:absolute;left:50%;transform:translateX(-50%);display:flex;color:var(--text-primary);text-decoration:none}
.pl-mtb__right{display:flex;align-items:center;gap:4px;padding-right:4px;flex-shrink:0}
.pl-mtb__bell{position:relative}
.pl-mtb__badge{position:absolute;top:8px;right:8px;height:7px;width:7px;border-radius:9999px;background:var(--brand-accent);border:1.5px solid var(--surface-default)}
.pl-mtb__avatar{display:flex;align-items:center;justify-content:center;height:28px;width:28px;border-radius:9999px;overflow:hidden;background:var(--surface-muted);box-shadow:inset 0 0 0 1px var(--border-default);font-size:12px;font-weight:700;color:var(--text-primary)}
.pl-mtb__avatar img{height:100%;width:100%;object-fit:cover}
.pl-mtb__textbtn{display:inline-flex;align-items:center;height:36px;padding:0 8px;border-radius:var(--radius-sm);font-size:12px;font-weight:600;color:var(--text-primary);text-decoration:none;background:transparent;border:0;cursor:pointer;font-family:inherit;white-space:nowrap}
`;

/**
 * Mobile top bar — hamburger, centred wordmark, and a right-hand slot.
 * Recreated from src/components/layout/MobileTopBar.tsx. Presentational.
 */
function MobileTopBar({
  signedIn = true,
  userInitial = 'A',
  avatarUrl = '',
  hasNotification = true
}) {
  return /*#__PURE__*/React.createElement("header", {
    className: "pl-mtb"
  }, /*#__PURE__*/React.createElement("style", null, CSS), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "pl-mtb__icon",
    "aria-label": "Open menu"
  }, /*#__PURE__*/React.createElement(IconMenu, null)), /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "pl-mtb__logo",
    "aria-label": "Plano \xB7 Home"
  }, /*#__PURE__*/React.createElement(Wordmark, null)), /*#__PURE__*/React.createElement("div", {
    className: "pl-mtb__right"
  }, signedIn ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "pl-mtb__icon pl-mtb__bell",
    "aria-label": "Notifications"
  }, /*#__PURE__*/React.createElement(IconBell, null), hasNotification ? /*#__PURE__*/React.createElement("span", {
    className: "pl-mtb__badge"
  }) : null), /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "pl-mtb__icon",
    "aria-label": "Profile"
  }, /*#__PURE__*/React.createElement("span", {
    className: "pl-mtb__avatar"
  }, avatarUrl ? /*#__PURE__*/React.createElement("img", {
    src: avatarUrl,
    alt: ""
  }) : userInitial))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "pl-mtb__textbtn"
  }, "Join list"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "pl-mtb__textbtn"
  }, "Log in"))));
}
Object.assign(__ds_scope, { MobileTopBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/MobileTopBar/MobileTopBar.jsx", error: String((e && e.message) || e) }); }

// components/PlanoLogo/PlanoLogo.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Plano wordmark. Geometric letterform, always `currentColor` — inherits the
 * text colour of its container (white on the black footer/menu, primary
 * elsewhere). Never recoloured to the lime accent.
 */
function PlanoLogo({
  size = 20,
  color,
  style,
  className,
  ...props
}) {
  return /*#__PURE__*/React.createElement("svg", _extends({
    viewBox: "0 0 338.087 74.709",
    role: "img",
    "aria-label": "Plano",
    xmlns: "http://www.w3.org/2000/svg",
    className: className,
    style: {
      height: typeof size === 'number' ? `${size}px` : size,
      width: 'auto',
      display: 'inline-block',
      verticalAlign: 'middle',
      flexShrink: 0,
      color,
      ...style
    }
  }, props), /*#__PURE__*/React.createElement("g", {
    fill: "currentColor",
    fillRule: "nonzero",
    stroke: "none",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M 0 73.731 L 0 0.977 L 28.369 0.977 Q 36.67 0.977 42.48 4.127 Q 48.291 7.276 51.343 12.818 Q 54.395 18.36 54.395 25.538 Q 54.395 32.765 51.294 38.258 Q 48.193 43.751 42.31 46.852 Q 36.426 49.952 28.027 49.952 L 14.893 49.952 L 14.893 73.731 L 0 73.731 Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 111.084 73.731 L 64.795 73.731 L 64.795 0.977 L 79.688 0.977 L 79.688 61.378 L 111.084 61.378 L 111.084 73.731 Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 117.139 73.731 L 141.992 0.977 L 161.523 0.977 L 187.012 73.731 L 170.459 73.731 L 164.845 56.837 L 132.666 56.837 L 138.994 56.837 L 133.594 73.731"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 195.996 73.731 L 195.996 0.977 L 212.598 0.977 L 235.596 37.794 Q 237.354 40.626 239.16 43.946 Q 240.967 47.267 242.847 51.319 Q 244.727 55.372 246.582 60.45 L 245.068 60.45 Q 244.727 56.397 244.458 51.808 Q 244.189 47.218 243.994 43.018 Q 243.799 38.819 243.799 35.89 L 243.799 0.977 L 259.033 0.977 L 259.033 73.731 L 242.383 73.731 L 221.484 40.333 Q 219.189 36.573 217.236 33.033 Q 215.283 29.493 213.159 25.221 Q 211.035 20.948 208.105 14.991 L 210.01 14.991 Q 210.303 20.265 210.596 25.099 Q 210.889 29.933 211.06 33.863 Q 211.23 37.794 211.23 40.284 L 211.23 73.731 Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 304.15 74.708 Q 294.531 74.708 286.841 70.313 Q 279.15 65.919 274.683 57.569 Q 270.215 49.22 270.215 37.403 Q 270.215 25.538 274.683 17.164 Q 279.15 8.79 286.841 4.395 Q 294.531 0.001 304.15 0.001 Q 313.818 0.001 321.484 4.395 Q 329.15 8.79 333.618 17.164 Q 338.086 25.538 338.086 37.403 Q 338.086 49.22 333.618 57.569 Q 329.15 65.919 321.484 70.313 Q 313.818 74.708 304.15 74.708 Z"
  })));
}
Object.assign(__ds_scope, { PlanoLogo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/PlanoLogo/PlanoLogo.jsx", error: String((e && e.message) || e) }); }

// components/SiteFooter/SiteFooter.jsx
try { (() => {
const EXPLORE = [{
  label: 'Architecture'
}, {
  label: 'London',
  tag: 'GB'
}, {
  label: 'Paris',
  tag: 'FR'
}, {
  label: 'Tokyo',
  tag: 'JP'
}, {
  label: 'New York',
  tag: 'US'
}, {
  label: 'Barcelona',
  tag: 'ES'
}, {
  label: 'Berlin',
  tag: 'DE'
}];
const GUIDES = ['All guides', 'London', 'Paris', 'Tokyo', 'New York'];
const PLANO = ['About', 'Updates', 'For architects', 'Add a building', 'Events'];
const LEGAL = ['Privacy', 'Terms'];
function Wordmark() {
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 338.087 74.709",
    role: "img",
    "aria-label": "Plano",
    style: {
      height: 22,
      width: 'auto',
      display: 'block',
      flexShrink: 0
    },
    xmlns: "http://www.w3.org/2000/svg"
  }, /*#__PURE__*/React.createElement("g", {
    fill: "currentColor",
    fillRule: "nonzero"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M 0 73.731 L 0 0.977 L 28.369 0.977 Q 36.67 0.977 42.48 4.127 Q 48.291 7.276 51.343 12.818 Q 54.395 18.36 54.395 25.538 Q 54.395 32.765 51.294 38.258 Q 48.193 43.751 42.31 46.852 Q 36.426 49.952 28.027 49.952 L 14.893 49.952 L 14.893 73.731 L 0 73.731 Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 111.084 73.731 L 64.795 73.731 L 64.795 0.977 L 79.688 0.977 L 79.688 61.378 L 111.084 61.378 L 111.084 73.731 Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 117.139 73.731 L 141.992 0.977 L 161.523 0.977 L 187.012 73.731 L 170.459 73.731 L 164.845 56.837 L 132.666 56.837 L 138.994 56.837 L 133.594 73.731"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 195.996 73.731 L 195.996 0.977 L 212.598 0.977 L 235.596 37.794 Q 237.354 40.626 239.16 43.946 Q 240.967 47.267 242.847 51.319 Q 244.727 55.372 246.582 60.45 L 245.068 60.45 Q 244.727 56.397 244.458 51.808 Q 244.189 47.218 243.994 43.018 Q 243.799 38.819 243.799 35.89 L 243.799 0.977 L 259.033 0.977 L 259.033 73.731 L 242.383 73.731 L 221.484 40.333 Q 219.189 36.573 217.236 33.033 Q 215.283 29.493 213.159 25.221 Q 211.035 20.948 208.105 14.991 L 210.01 14.991 Q 210.303 20.265 210.596 25.099 Q 210.889 29.933 211.06 33.863 Q 211.23 37.794 211.23 40.284 L 211.23 73.731 Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M 304.15 74.708 Q 294.531 74.708 286.841 70.313 Q 279.15 65.919 274.683 57.569 Q 270.215 49.22 270.215 37.403 Q 270.215 25.538 274.683 17.164 Q 279.15 8.79 286.841 4.395 Q 294.531 0.001 304.15 0.001 Q 313.818 0.001 321.484 4.395 Q 329.15 8.79 333.618 17.164 Q 338.086 25.538 338.086 37.403 Q 338.086 49.22 333.618 57.569 Q 329.15 65.919 321.484 70.313 Q 313.818 74.708 304.15 74.708 Z"
  })));
}
const CSS = `
.pl-footer{box-sizing:border-box;width:100%;background:var(--brand-primary);color:var(--text-inverse);font-family:var(--font-sans)}
.pl-footer *{box-sizing:border-box}
.pl-footer__inner{padding:64px 48px 40px}
.pl-footer__grid{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:48px;padding-bottom:56px;border-bottom:1px solid rgba(255,255,255,0.1)}
.pl-footer__logo{display:inline-block;margin-bottom:16px;color:var(--text-inverse);text-decoration:none;transition:opacity 150ms ease}
.pl-footer__logo:hover{opacity:0.8}
.pl-footer__tagline{font-size:12px;line-height:1.6;color:rgba(255,255,255,0.3);max-width:160px;margin:0}
.pl-footer__coltitle{font-size:10px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.25);margin:0 0 20px}
.pl-footer__list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}
.pl-footer__link{display:inline-flex;align-items:center;gap:8px;font-size:14px;color:rgba(255,255,255,0.5);text-decoration:none;transition:color 150ms ease}
.pl-footer__link:hover{color:var(--text-inverse)}
.pl-footer__tag{font-size:9px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.1);padding:2px 6px;border-radius:2px}
.pl-footer__bottom{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-top:32px;flex-wrap:wrap}
.pl-footer__legal{display:flex;align-items:center;gap:24px}
.pl-footer__copy{font-size:11px;letter-spacing:0.02em;color:rgba(255,255,255,0.2)}
.pl-footer__legallink{font-size:11px;letter-spacing:0.02em;color:rgba(255,255,255,0.2);text-decoration:none;transition:color 150ms ease}
.pl-footer__legallink:hover{color:rgba(255,255,255,0.5)}
.pl-footer__social{display:flex;align-items:center;gap:16px}
.pl-footer__sociallink{font-size:11px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.2);text-decoration:none;transition:color 150ms ease}
.pl-footer__sociallink:hover{color:var(--text-inverse)}
.pl-footer__dot{color:rgba(255,255,255,0.1);font-size:12px}
@media (max-width:860px){.pl-footer__grid{grid-template-columns:1fr 1fr}.pl-footer__inner{padding:56px 32px 40px}}
@media (max-width:520px){.pl-footer__grid{grid-template-columns:1fr}}
`;

/**
 * Site footer — the black, four-column global footer.
 * Recreated from src/components/layout/SiteFooter.tsx. Presentational.
 */
function SiteFooter({
  year = new Date().getFullYear()
}) {
  return /*#__PURE__*/React.createElement("footer", {
    className: "pl-footer"
  }, /*#__PURE__*/React.createElement("style", null, CSS), /*#__PURE__*/React.createElement("div", {
    className: "pl-footer__inner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pl-footer__grid"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "pl-footer__logo",
    "aria-label": "Home"
  }, /*#__PURE__*/React.createElement(Wordmark, null)), /*#__PURE__*/React.createElement("p", {
    className: "pl-footer__tagline"
  }, "The world\u2019s architecture,", /*#__PURE__*/React.createElement("br", null), "catalogued.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "pl-footer__coltitle"
  }, "Explore"), /*#__PURE__*/React.createElement("ul", {
    className: "pl-footer__list"
  }, EXPLORE.map(it => /*#__PURE__*/React.createElement("li", {
    key: it.label
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "pl-footer__link"
  }, it.label, it.tag ? /*#__PURE__*/React.createElement("span", {
    className: "pl-footer__tag"
  }, it.tag) : null))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "pl-footer__coltitle"
  }, "Guides"), /*#__PURE__*/React.createElement("ul", {
    className: "pl-footer__list"
  }, GUIDES.map(label => /*#__PURE__*/React.createElement("li", {
    key: label
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "pl-footer__link"
  }, label))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "pl-footer__coltitle"
  }, "Plano"), /*#__PURE__*/React.createElement("ul", {
    className: "pl-footer__list"
  }, PLANO.map(label => /*#__PURE__*/React.createElement("li", {
    key: label
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "pl-footer__link"
  }, label)))))), /*#__PURE__*/React.createElement("div", {
    className: "pl-footer__bottom"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pl-footer__legal"
  }, /*#__PURE__*/React.createElement("span", {
    className: "pl-footer__copy"
  }, "\xA9 ", year, " Plano"), /*#__PURE__*/React.createElement("div", {
    className: "pl-footer__legal"
  }, LEGAL.map(label => /*#__PURE__*/React.createElement("a", {
    key: label,
    href: "#",
    className: "pl-footer__legallink"
  }, label)))), /*#__PURE__*/React.createElement("div", {
    className: "pl-footer__social"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "pl-footer__sociallink"
  }, "Instagram"), /*#__PURE__*/React.createElement("span", {
    className: "pl-footer__dot"
  }, "\xB7"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "pl-footer__sociallink"
  }, "X")))));
}
Object.assign(__ds_scope, { SiteFooter });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/SiteFooter/SiteFooter.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/_shared/kit-lib.jsx
try { (() => {
/* ============================================================
   Plano Web UI Kit — shared JS helpers
   Loaded as <script type="text/babel" src="../_shared/kit-lib.jsx"> BEFORE
   each screen's inline script. Everything is attached to `window` so the
   screen script (its own Babel scope) can read it.

   NOT here: PlanoLogo / AppTopNav / MobileTopBar / BottomNav / SiteFooter.
   Those are real design-system components — load _ds_bundle.js and read them
   off window.PlanoDesignSystem_e8d587.
   ============================================================ */
const {
  useState,
  useEffect
} = React;

/* ─── Award dots ──────────────────────────────────────────────────────
   Render ONLY the earned dots (1–3 filled black circles). Zero dots renders
   NOTHING — never a ring, never "0/3". This is an award, not a rating. */
const Rating = ({
  n,
  size
}) => {
  if (!n || n < 1) return null;
  const cls = size === "sm" ? "rdot sm" : size === "lg" ? "rdot lg" : "rdot";
  return /*#__PURE__*/React.createElement("span", {
    className: "rdots",
    "aria-label": `${n} award dot${n > 1 ? "s" : ""}`
  }, Array.from({
    length: n
  }).map((_, i) => /*#__PURE__*/React.createElement("i", {
    key: i,
    className: cls
  })));
};

/* ─── Lucide icon set (1.5px stroke, currentColor) ───────────────────
   Extensible: a screen can add its own before rendering, e.g.
     Object.assign(PLANO_ICONS, { compass: '<circle .../><polygon .../>' });
   then <Icon name="compass" />. */
const PLANO_ICONS = {
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46"/>',
  mappin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  chevdown: '<polyline points="6 9 12 15 18 9"/>',
  chevleft: '<polyline points="15 18 9 12 15 6"/>',
  chevright: '<polyline points="9 18 15 12 9 6"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><path d="M12 3v12"/>',
  image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  arrowleft: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  arrowright: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  building: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
  briefcase: '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  play: '<polygon points="6 3 20 12 6 21 6 3"/>',
  bookopen: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><path d="M12 2v13"/>',
  walk: '<circle cx="13" cy="4" r="1"/><path d="m9 20 3-6 2 2 2 5"/><path d="m6 12 4-4 3 3 3-1"/>',
  train: '<rect width="16" height="16" x="4" y="3" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><path d="m8 19-2 3"/><path d="m18 22-2-3"/><path d="M8 15h.01"/><path d="M16 15h.01"/>',
  car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>'
};
const Icon = ({
  name,
  size = 18,
  style
}) => /*#__PURE__*/React.createElement("svg", {
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.5",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  style: style,
  dangerouslySetInnerHTML: {
    __html: PLANO_ICONS[name] || ""
  }
});

/* Filled variants for like/save active states */
const HeartFill = ({
  size = 16,
  style
}) => /*#__PURE__*/React.createElement("svg", {
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "currentColor",
  stroke: "currentColor",
  strokeWidth: "1.5",
  strokeLinejoin: "round",
  style: style,
  dangerouslySetInnerHTML: {
    __html: PLANO_ICONS.heart
  }
});
const StarFill = ({
  size = 16,
  style
}) => /*#__PURE__*/React.createElement("svg", {
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "currentColor",
  stroke: "currentColor",
  strokeWidth: "1.5",
  strokeLinejoin: "round",
  style: style,
  dangerouslySetInnerHTML: {
    __html: PLANO_ICONS.star
  }
});

/* Verified entity badge (Lucide BadgeCheck) — never lime */
const BadgeCheck = ({
  size = 16,
  style
}) => /*#__PURE__*/React.createElement("svg", {
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.5",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  style: style
}, /*#__PURE__*/React.createElement("path", {
  d: "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
}), /*#__PURE__*/React.createElement("path", {
  d: "m9 12 2 2 4-4"
}));

/* ─── Sample architecture photography (Unsplash) ─────────────────────
   Stand-in imagery. Screens may add their own keys locally as needed. */
const IMG = {
  barbican: "https://images.unsplash.com/photo-1460574283810-2aab119d8511?w=1600&q=80",
  villa: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1600&q=80",
  unite: "https://images.unsplash.com/photo-1459767129954-1b1c1f9b9ace?w=1600&q=80",
  guggenheim: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=1600&q=80",
  salk: "https://images.unsplash.com/photo-1497604401993-f2e922e5cb0a?w=1600&q=80",
  pompidou: "https://images.unsplash.com/photo-1574958269340-fa927503f3dd?w=1600&q=80",
  sagrada: "https://images.unsplash.com/photo-1494145904049-0dca59b4bbad?w=1600&q=80",
  farnsworth: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=80",
  therme: "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=1600&q=80",
  kimbell: "https://images.unsplash.com/photo-1524230572899-a752b3835840?w=1600&q=80",
  sydney: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1600&q=80",
  teshima: "https://images.unsplash.com/photo-1493397212122-2b85dda8106b?w=1600&q=80"
};

/* Expose to the global scope for screen scripts (separate Babel scope). */
Object.assign(window, {
  Rating,
  Icon,
  HeartFill,
  StarFill,
  BadgeCheck,
  PLANO_ICONS,
  IMG
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/_shared/kit-lib.jsx", error: String((e && e.message) || e) }); }

__ds_ns.AppTopNav = __ds_scope.AppTopNav;

__ds_ns.BottomNav = __ds_scope.BottomNav;

__ds_ns.MobileTopBar = __ds_scope.MobileTopBar;

__ds_ns.PlanoLogo = __ds_scope.PlanoLogo;

__ds_ns.SiteFooter = __ds_scope.SiteFooter;

})();
