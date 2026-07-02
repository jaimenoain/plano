import { Calendar } from 'plano';

const frame: React.CSSProperties = {
  border: '1px solid var(--border-default)',
  borderRadius: 2,
  background: 'var(--surface-card)',
  display: 'inline-block',
};

export const Default = () => (
  <div style={frame}>
    <Calendar mode="single" defaultMonth={new Date(1962, 5)} />
  </div>
);

export const WithSelection = () => (
  <div style={frame}>
    <Calendar
      mode="single"
      defaultMonth={new Date(1962, 5)}
      selected={new Date(1962, 5, 14)}
    />
  </div>
);

export const RangeSelection = () => (
  <div style={frame}>
    <Calendar
      mode="range"
      defaultMonth={new Date(1962, 5)}
      selected={{ from: new Date(1962, 5, 8), to: new Date(1962, 5, 19) }}
    />
  </div>
);
