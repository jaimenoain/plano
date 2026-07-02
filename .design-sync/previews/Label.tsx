import { Label, Input, Checkbox } from 'plano';

export const Default = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 320 }}>
    <Label htmlFor="architect">Architect</Label>
    <Input id="architect" defaultValue="Eero Saarinen" />
  </div>
);

export const WithCheckbox = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <Checkbox id="verified" defaultChecked />
    <Label htmlFor="verified">Attribution verified</Label>
  </div>
);

export const Standalone = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <Label>Construction year</Label>
    <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>1962</span>
  </div>
);
