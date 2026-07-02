import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from 'plano';

const eyebrow: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "Space Mono", monospace)',
  fontSize: 11,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
};

const linkish: React.CSSProperties = {
  color: 'var(--text-primary)',
  textDecoration: 'underline',
  textUnderlineOffset: 3,
  fontWeight: 600,
  cursor: 'default',
};

export const ArchitectPreview = () => (
  <div style={{ paddingTop: 200, paddingLeft: 40 }}>
  <HoverCard defaultOpen>
    <HoverCardTrigger asChild>
      <span style={linkish}>Aarne Ervi</span>
    </HoverCardTrigger>
    <HoverCardContent align="start" side="top">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={eyebrow}>Architect · 1910–1977</span>
        <strong style={{ fontSize: 16, color: 'var(--text-primary)' }}>Aarne Ervi</strong>
        <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)', margin: 0 }}>
          Finnish modernist known for the Tapiola garden city and the University of Helsinki's
          Porthania building.
        </p>
        <div
          style={{
            display: 'flex',
            gap: 16,
            paddingTop: 4,
            borderTop: '1px solid var(--border-default)',
            fontSize: 12,
            color: 'var(--text-secondary)',
          }}
        >
          <span><strong style={{ color: 'var(--text-primary)' }}>34</strong> buildings</span>
          <span><strong style={{ color: 'var(--text-primary)' }}>Espoo</strong> based</span>
        </div>
      </div>
    </HoverCardContent>
  </HoverCard>
  </div>
);
