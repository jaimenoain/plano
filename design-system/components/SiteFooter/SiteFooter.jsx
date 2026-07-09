import React from 'react';

const EXPLORE = [
  { label: 'Architecture' },
  { label: 'London', tag: 'GB' },
  { label: 'Paris', tag: 'FR' },
  { label: 'Tokyo', tag: 'JP' },
  { label: 'New York', tag: 'US' },
  { label: 'Barcelona', tag: 'ES' },
  { label: 'Berlin', tag: 'DE' },
];
const GUIDES = ['All guides', 'London', 'Paris', 'Tokyo', 'New York'];
const PLANO = ['About', 'Updates', 'For architects', 'Add a building', 'Events'];
const LEGAL = ['Privacy', 'Terms'];

function Wordmark() {
  return (
    <svg viewBox="0 0 338.087 74.709" role="img" aria-label="Plano"
      style={{ height: 22, width: 'auto', display: 'block', flexShrink: 0 }} xmlns="http://www.w3.org/2000/svg">
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
export function SiteFooter({ year = new Date().getFullYear() }) {
  return (
    <footer className="pl-footer">
      <style>{CSS}</style>
      <div className="pl-footer__inner">
        <div className="pl-footer__grid">
          <div>
            <a href="#" className="pl-footer__logo" aria-label="Home"><Wordmark /></a>
            <p className="pl-footer__tagline">The world&rsquo;s architecture,<br />catalogued.</p>
          </div>

          <div>
            <p className="pl-footer__coltitle">Explore</p>
            <ul className="pl-footer__list">
              {EXPLORE.map((it) => (
                <li key={it.label}>
                  <a href="#" className="pl-footer__link">
                    {it.label}
                    {it.tag ? <span className="pl-footer__tag">{it.tag}</span> : null}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="pl-footer__coltitle">Guides</p>
            <ul className="pl-footer__list">
              {GUIDES.map((label) => (
                <li key={label}><a href="#" className="pl-footer__link">{label}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <p className="pl-footer__coltitle">Plano</p>
            <ul className="pl-footer__list">
              {PLANO.map((label) => (
                <li key={label}><a href="#" className="pl-footer__link">{label}</a></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pl-footer__bottom">
          <div className="pl-footer__legal">
            <span className="pl-footer__copy">&copy; {year} Plano</span>
            <div className="pl-footer__legal">
              {LEGAL.map((label) => (
                <a key={label} href="#" className="pl-footer__legallink">{label}</a>
              ))}
            </div>
          </div>
          <div className="pl-footer__social">
            <a href="#" className="pl-footer__sociallink">Instagram</a>
            <span className="pl-footer__dot">&middot;</span>
            <a href="#" className="pl-footer__sociallink">X</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
