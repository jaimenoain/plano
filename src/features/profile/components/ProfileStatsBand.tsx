/**
 * Hairline four-column stats band — the structure is the 1px gutter, not a border box.
 * Followers/following are buttons; the other two cells are inert figures.
 */
interface ProfileStatsBandProps {
  buildings: number;
  collections: number;
  followers: number;
  following: number;
  onOpenUserList: (type: "followers" | "following") => void;
}

function StatValue({ value }: { value: number }) {
  return (
    <span className="block text-4xl font-bold tabular-nums leading-none tracking-tight text-text-primary">
      {value.toLocaleString()}
    </span>
  );
}

function StatLabel({ children }: { children: string }) {
  return <span className="eyebrow mt-2.5 block tracking-widest">{children}</span>;
}

export function ProfileStatsBand({
  buildings,
  collections,
  followers,
  following,
  onOpenUserList,
}: ProfileStatsBandProps) {
  // Two columns on phones — four 0.15em-tracked labels do not fit across 375px.
  const cellClass = "bg-surface-default px-1 pt-6 pb-5 text-left";

  return (
    <div className="mt-12 grid grid-cols-2 gap-px border-y border-border-default bg-border-default sm:grid-cols-4">
      <div className={cellClass}>
        <StatValue value={buildings} />
        <StatLabel>Buildings</StatLabel>
      </div>
      <div className={cellClass}>
        <StatValue value={collections} />
        <StatLabel>Collections</StatLabel>
      </div>
      <button
        type="button"
        onClick={() => onOpenUserList("followers")}
        className={`${cellClass} transition-opacity hover:opacity-60 active:opacity-60`}
      >
        <StatValue value={followers} />
        <StatLabel>Followers</StatLabel>
      </button>
      <button
        type="button"
        onClick={() => onOpenUserList("following")}
        className={`${cellClass} transition-opacity hover:opacity-60 active:opacity-60`}
      >
        <StatValue value={following} />
        <StatLabel>Following</StatLabel>
      </button>
    </div>
  );
}
