import { MichelinRatingInput } from 'plano';

const noop = () => {};
const label: React.CSSProperties = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--text-secondary)',
  marginBottom: 8,
};
const cell: React.CSSProperties = { display: 'flex', flexDirection: 'column' };
const stack: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 20 };

export const Ratings = () => (
  <div style={stack}>
    <div style={cell}>
      <span style={label}>No rating</span>
      <MichelinRatingInput value={0} onChange={noop} />
    </div>
    <div style={cell}>
      <span style={label}>One star</span>
      <MichelinRatingInput value={1} onChange={noop} />
    </div>
    <div style={cell}>
      <span style={label}>Two stars</span>
      <MichelinRatingInput value={2} onChange={noop} />
    </div>
    <div style={cell}>
      <span style={label}>Three stars</span>
      <MichelinRatingInput value={3} onChange={noop} />
    </div>
  </div>
);

export const Disabled = () => (
  <div style={stack}>
    <div style={cell}>
      <span style={label}>Disabled · two stars</span>
      <MichelinRatingInput value={2} onChange={noop} disabled />
    </div>
  </div>
);
