import { Checkbox, Label } from 'plano';

const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 };

export const States = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div style={row}>
      <Checkbox id="c-off" />
      <Label htmlFor="c-off">Unchecked</Label>
    </div>
    <div style={row}>
      <Checkbox id="c-on" defaultChecked />
      <Label htmlFor="c-on">Checked</Label>
    </div>
  </div>
);

export const List = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    <div style={row}>
      <Checkbox id="f-lost" defaultChecked />
      <Label htmlFor="f-lost">Include demolished buildings</Label>
    </div>
    <div style={row}>
      <Checkbox id="f-unbuilt" />
      <Label htmlFor="f-unbuilt">Include unbuilt proposals</Label>
    </div>
    <div style={row}>
      <Checkbox id="f-award" defaultChecked />
      <Label htmlFor="f-award">Award winners only</Label>
    </div>
  </div>
);

export const Disabled = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div style={row}>
      <Checkbox id="d-off" disabled />
      <Label htmlFor="d-off">Locked (off)</Label>
    </div>
    <div style={row}>
      <Checkbox id="d-on" disabled defaultChecked />
      <Label htmlFor="d-on">Locked (on)</Label>
    </div>
  </div>
);
