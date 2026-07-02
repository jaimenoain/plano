import { Switch, Label } from 'plano';

const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10 };

export const States = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div style={row}>
      <Switch id="s-off" />
      <Label htmlFor="s-off">Off</Label>
    </div>
    <div style={row}>
      <Switch id="s-on" defaultChecked />
      <Label htmlFor="s-on">On</Label>
    </div>
  </div>
);

export const Setting = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 360, gap: 24 }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Label htmlFor="public">Public listing</Label>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Show this building on the map</span>
    </div>
    <Switch id="public" defaultChecked />
  </div>
);

export const Disabled = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div style={row}>
      <Switch id="sd-off" disabled />
      <Label htmlFor="sd-off">Locked (off)</Label>
    </div>
    <div style={row}>
      <Switch id="sd-on" disabled defaultChecked />
      <Label htmlFor="sd-on">Locked (on)</Label>
    </div>
  </div>
);
