import { useLandingStats } from "../../hooks/useLandingStats";

const numberFormat = new Intl.NumberFormat("en-US");

/** Static classes so Tailwind's scanner sees every column count we can render. */
const COLUMNS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-1 md:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-4",
};

function BandShell({ columns, children }: { columns: number; children: React.ReactNode }) {
  return (
    <section
      aria-label="Plano in numbers"
      className={`grid gap-px border-y border-border-default bg-border-default ${COLUMNS[columns]}`}
    >
      {children}
    </section>
  );
}

export const LandingStatsBand = () => {
  const { data, isPending, isError } = useLandingStats();

  // The counts are real, so an unavailable one renders as nothing rather than a zero.
  if (isError) return null;

  if (isPending) {
    return (
      <BandShell columns={4}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse space-y-3 bg-surface-default px-5 py-7">
            <div className="h-9 w-24 bg-surface-muted" />
            <div className="h-2.5 w-32 bg-surface-muted" />
          </div>
        ))}
      </BandShell>
    );
  }

  const cells = data.filter((stat) => stat.value >= stat.minimum);
  if (cells.length === 0) return null;

  return (
    <BandShell columns={cells.length}>
      {cells.map(({ label, value }) => (
        <div key={label} className="bg-surface-default px-5 py-7">
          <p className="text-4xl font-bold leading-none tracking-tight text-text-primary">
            {numberFormat.format(value)}
          </p>
          <p className="eyebrow mt-3 tracking-widest">{label}</p>
        </div>
      ))}
    </BandShell>
  );
};
