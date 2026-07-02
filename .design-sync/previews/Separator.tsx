import { Separator } from 'plano';

const eyebrow: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "Space Mono", monospace)',
  fontSize: 11,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
};

export const Horizontal = () => (
  <div style={{ maxWidth: 400 }}>
    <div style={eyebrow}>Building</div>
    <h3 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 2px' }}>
      Villa Saarinen
    </h3>
    <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
      Concrete residence, completed 1962.
    </p>
    <Separator />
    <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '16px 0 0' }}>
      Attributed to Eero Saarinen, set into the Finnish hillside above Lake Kallavesi.
    </p>
  </div>
);

export const Vertical = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16, height: 24, ...eyebrow }}>
    <span>Helsinki</span>
    <Separator orientation="vertical" />
    <span>1962</span>
    <Separator orientation="vertical" />
    <span>Modernism</span>
  </div>
);
