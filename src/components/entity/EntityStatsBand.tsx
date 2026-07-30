import { Link } from "react-router";

/**
 * Hairline stats band — the structure is the 1px gutter, not a border box.
 * Cells with a `to` render as links, cells with an `onClick` as buttons; the
 * rest are inert figures. A stat that navigates must be a link, not a button:
 * the tab bars on these pages are buttons carrying the same labels, so a
 * `<button>Collections</button>` stat would be indistinguishable from the
 * Collections tab. Shared by profile and entity (person/company) pages;
 * takes 2–4 cells.
 */
export interface StatCell {
  key: string;
  value: number | string;
  label: string;
  /** Wins over `onClick`. Search-only (`?section=x`) keeps the current path. */
  to?: string;
  onClick?: () => void;
}

interface EntityStatsBandProps {
  cells: StatCell[];
}

// Four 0.15em-tracked labels do not fit across 375px, so 4 cells wrap 2×2 on
// phones; 3 short labels fit in one row.
const GRID_BY_COUNT: Record<number, string> = {
  2: "grid-cols-2 sm:grid-cols-2",
  3: "grid-cols-3 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
};

// The band is flush with the page's content column, so a cell that opens a row
// takes no left inset — only the ones sitting against a hairline do. Four cells
// wrap 2×2 (see GRID_BY_COUNT), so cell 3 opens a row on phones but not sm+.
function leftInset(index: number, count: number) {
  if (index === 0) return "pl-0";
  if (count === 4 && index === 2) return "pl-0 sm:pl-5";
  return "pl-4 sm:pl-5";
}

function StatValue({ value }: { value: number | string }) {
  return (
    <span className="block text-4xl font-bold tabular-nums leading-none tracking-tight text-text-primary">
      {typeof value === "number" ? value.toLocaleString() : value}
    </span>
  );
}

function StatLabel({ children }: { children: string }) {
  return <span className="eyebrow mt-2.5 block tracking-widest">{children}</span>;
}

export function EntityStatsBand({ cells }: EntityStatsBandProps) {
  const cellClass = "bg-surface-default pr-4 pt-6 pb-5 text-left sm:pr-5";
  const gridClass = GRID_BY_COUNT[cells.length] ?? GRID_BY_COUNT[4];

  return (
    <div className={`mt-12 grid gap-px border-y border-border-default bg-border-default ${gridClass}`}>
      {cells.map((cell, index) => {
        const padClass = `${cellClass} ${leftInset(index, cells.length)}`;
        const interactiveClass = `${padClass} transition-opacity hover:opacity-60 active:opacity-60`;

        return cell.to ? (
          <Link key={cell.key} to={cell.to} className={`block ${interactiveClass}`}>
            <StatValue value={cell.value} />
            <StatLabel>{cell.label}</StatLabel>
          </Link>
        ) : cell.onClick ? (
          <button key={cell.key} type="button" onClick={cell.onClick} className={interactiveClass}>
            <StatValue value={cell.value} />
            <StatLabel>{cell.label}</StatLabel>
          </button>
        ) : (
          <div key={cell.key} className={padClass}>
            <StatValue value={cell.value} />
            <StatLabel>{cell.label}</StatLabel>
          </div>
        );
      })}
    </div>
  );
}
