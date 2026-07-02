import { AspectRatio } from 'plano';

const eyebrow: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "Space Mono", monospace)',
  fontSize: 11,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
};

const placeholder: React.CSSProperties = {
  width: '100%',
  height: '100%',
  background: 'var(--surface-muted)',
  border: '1px solid var(--border-default)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  ...eyebrow,
};

export const Landscape = () => (
  <div style={{ width: 360 }}>
    <AspectRatio ratio={16 / 9}>
      <div style={placeholder}>16 : 9</div>
    </AspectRatio>
    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
      Villa Saarinen — exterior, 1962
    </p>
  </div>
);

export const Square = () => (
  <div style={{ width: 240 }}>
    <AspectRatio ratio={1}>
      <div style={placeholder}>1 : 1</div>
    </AspectRatio>
    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
      Archive plate — detail
    </p>
  </div>
);

export const Portrait = () => (
  <div style={{ width: 200 }}>
    <AspectRatio ratio={3 / 4}>
      <div style={placeholder}>3 : 4</div>
    </AspectRatio>
    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
      Stair tower elevation
    </p>
  </div>
);
