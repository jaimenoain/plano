interface EntityMetaEyebrowProps {
  /** Meta parts (e.g. nationality, lifespan, place / country, year-span). Falsy entries drop out. */
  items: Array<string | null | undefined>;
}

/**
 * Mono uppercase-tracked meta eyebrow shown above a person/company name —
 * matches the building/locality hero eyebrows so the entity family reads as one
 * editorial voice. Renders nothing when there are no parts.
 */
export function EntityMetaEyebrow({ items }: EntityMetaEyebrowProps) {
  const parts = items.filter(Boolean) as string[];
  if (parts.length === 0) return null;
  return (
    <p className="font-mono text-2xs uppercase tracking-[0.14em] text-text-secondary">
      {parts.join(" · ")}
    </p>
  );
}
