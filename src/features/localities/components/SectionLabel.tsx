// ---------------------------------------------------------------------------
// Shared section label — editorial micro‑heading
// pattern used throughout BuildingDetails.
// ---------------------------------------------------------------------------
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">
      {children}
    </h2>
  );
}
