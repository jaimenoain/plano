import { Link } from "react-router";
import { PlanoLogo } from "@/components/common/PlanoLogo";
import { ARCHITECTURE_PREFIX, getLocalityUrl } from "@/utils/url";
import { useTopGuideLocalities } from "@/features/guides/useGuides";

const exploreLinks = [
  { label: "Architecture", path: ARCHITECTURE_PREFIX },
  { label: "London",       path: getLocalityUrl("GB", "london"),    tag: "GB" },
  { label: "Paris",        path: getLocalityUrl("FR", "paris"),     tag: "FR" },
  { label: "Tokyo",        path: getLocalityUrl("JP", "tokyo"),     tag: "JP" },
  { label: "New York",     path: getLocalityUrl("US", "new-york"),  tag: "US" },
  { label: "Barcelona",    path: getLocalityUrl("ES", "barcelona"), tag: "ES" },
  { label: "Berlin",       path: getLocalityUrl("DE", "berlin"),    tag: "DE" },
];

const planoLinks = [
  { label: "About",           path: "/about" },
  { label: "Updates",         path: "/updates" },
  { label: "For architects",  path: "/for-architects" },
  { label: "Add a building",  path: "/building/new" },
  { label: "Events",          path: "/events" },
];

const legalLinks = [
  { label: "Privacy", path: "/privacy" },
  { label: "Terms",   path: "/terms" },
];

export function SiteFooter() {
  const { data: topLocalities = [] } = useTopGuideLocalities(4);

  return (
    <footer
      className="bg-brand-primary text-text-inverse mt-auto shrink-0 w-screen max-w-[100vw] ml-[calc(50%-50vw)]"
    >
      <div className="px-8 md:px-12 pt-16 pb-10">

        {/* ── Top grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 md:gap-12 pb-14 border-b border-text-inverse/10">

          {/* Brand — same wordmark as header (PlanoLogo), inverse colour */}
          <div className="col-span-1 sm:col-span-2 md:col-span-1">
            <Link
              to="/"
              className="inline-block mb-4 rounded-sm text-text-inverse hover:opacity-80 transition-opacity duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-brand-primary"
              aria-label="Home"
            >
              <PlanoLogo className="text-xl text-text-inverse" />
            </Link>
            <p className="text-xs text-text-inverse/30 leading-relaxed max-w-[160px]">
              The world's architecture,<br />catalogued.
            </p>
          </div>

          {/* Explore */}
          <div>
            <p className="text-[10px] font-medium tracking-[0.14em] uppercase text-text-inverse/25 mb-5">
              Explore
            </p>
            <ul className="flex flex-col gap-3">
              {exploreLinks.map(({ label, path, tag }) => (
                <li key={path}>
                  <Link
                    to={path}
                    className="flex items-center gap-2 text-sm text-text-inverse/50 hover:text-text-inverse transition-colors duration-150"
                  >
                    {label}
                    {tag && (
                      <span className="text-[9px] font-medium tracking-widest uppercase text-text-inverse/20 border border-text-inverse/10 px-1.5 py-0.5 rounded-[2px]">
                        {tag}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Guides */}
          <div>
            <p className="text-[10px] font-medium tracking-[0.14em] uppercase text-text-inverse/25 mb-5">
              Guides
            </p>
            <ul className="flex flex-col gap-3">
              <li>
                <Link
                  to="/guides"
                  className="text-sm text-text-inverse/50 hover:text-text-inverse transition-colors duration-150"
                >
                  All guides
                </Link>
              </li>
              {topLocalities.map((locality) => (
                <li key={locality.id}>
                  <Link
                    to={getLocalityUrl(locality.countryCode, locality.citySlug)}
                    className="text-sm text-text-inverse/50 hover:text-text-inverse transition-colors duration-150"
                  >
                    {locality.city}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Plano */}
          <div>
            <p className="text-[10px] font-medium tracking-[0.14em] uppercase text-text-inverse/25 mb-5">
              Plano
            </p>
            <ul className="flex flex-col gap-3">
              {planoLinks.map(({ label, path }) => (
                <li key={path}>
                  <Link
                    to={path}
                    className="text-sm text-text-inverse/50 hover:text-text-inverse transition-colors duration-150"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* ── Bottom bar ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-8">
          <div className="flex items-center gap-8">
            <span className="text-[11px] text-text-inverse/20 tracking-wide">
              © {new Date().getFullYear()} Plano
            </span>
            <div className="flex items-center gap-6">
              {legalLinks.map(({ label, path }) => (
                <Link
                  key={path}
                  to={path}
                  className="text-[11px] text-text-inverse/20 hover:text-text-inverse/50 tracking-wide transition-colors duration-150"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="https://www.instagram.com/plano_map/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-medium tracking-widest uppercase text-text-inverse/20 hover:text-text-inverse transition-colors duration-150"
            >
              Instagram
            </a>
            <span className="text-text-inverse/10 text-xs">·</span>
            <a
              href="https://x.com/planoapp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-medium tracking-widest uppercase text-text-inverse/20 hover:text-text-inverse transition-colors duration-150"
            >
              X
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}