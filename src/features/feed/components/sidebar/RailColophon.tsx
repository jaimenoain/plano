import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";

import { fetchCensus } from "../../api/railApi";
import { RailModule } from "./RailModule";

const LINKS: Array<{ to: string; label: string }> = [
  { to: "/about", label: "About" },
  { to: "/connect", label: "Find people" },
  { to: "/explore", label: "Explore" },
  { to: "/updates", label: "Updates" },
];

/**
 * The rail's colophon — a mono census of the catalogue, the quiet nav links,
 * and the imprint. While the census loads (or errors) the line is simply
 * omitted; two numbers don't earn a skeleton.
 */
export function RailColophon() {
  const { data } = useQuery({
    queryKey: ["feed-sidebar", "census"],
    queryFn: fetchCensus,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const showCensus = !!data && data.buildings > 0;

  return (
    <RailModule>
      <div className="pb-2">
        {showCensus && (
          <p className="mb-3.5 font-mono text-[11px] tracking-[0.04em] text-text-secondary tabular-nums">
            {data.buildings.toLocaleString()}{" "}
            {data.buildings === 1 ? "building" : "buildings"} catalogued
          </p>
        )}
        <nav className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-[11px] text-text-disabled">
          {LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="transition-colors hover:text-text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="mt-3 text-[10px] uppercase tracking-[0.12em] text-text-disabled">
          Plano · 2026
        </p>
      </div>
    </RailModule>
  );
}
