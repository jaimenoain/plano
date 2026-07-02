import { Slider, Label } from 'plano';

const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12, width: 320 };

export const Default = () => (
  <div style={field}>
    <Slider defaultValue={[45]} max={100} step={1} />
  </div>
);

export const Labeled = () => (
  <div style={field}>
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <Label>Search radius</Label>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>12 km</span>
    </div>
    <Slider defaultValue={[12]} max={50} step={1} />
  </div>
);

export const Range = () => (
  <div style={field}>
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <Label>Construction year</Label>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>1920 – 1975</span>
    </div>
    <Slider defaultValue={[1920, 1975]} min={1900} max={2025} step={5} />
  </div>
);

export const Disabled = () => (
  <div style={field}>
    <Slider defaultValue={[30]} max={100} step={1} disabled />
  </div>
);
