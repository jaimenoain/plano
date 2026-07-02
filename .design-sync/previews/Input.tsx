import { Input, Label } from 'plano';

const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 320 };

export const Default = () => (
  <div style={field}>
    <Input placeholder="Search the archive" />
  </div>
);

export const Labeled = () => (
  <div style={field}>
    <Label htmlFor="building-name">Building name</Label>
    <Input id="building-name" defaultValue="Villa Saarinen" />
  </div>
);

export const Types = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 320 }}>
    <Input type="email" placeholder="curator@plano.archive" />
    <Input type="number" defaultValue={1962} />
    <Input type="password" defaultValue="hillside" />
  </div>
);

export const Disabled = () => (
  <div style={field}>
    <Label htmlFor="locked-city">City</Label>
    <Input id="locked-city" defaultValue="Helsinki" disabled />
  </div>
);
