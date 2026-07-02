import { Badge } from 'plano';

const row: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' };

export const Variants = () => (
  <div style={row}>
    <Badge>Default</Badge>
    <Badge variant="brand">Brand</Badge>
    <Badge variant="secondary">Secondary</Badge>
    <Badge variant="success">Listed</Badge>
    <Badge variant="warning">At risk</Badge>
    <Badge variant="destructive">Demolished</Badge>
    <Badge variant="outline">Outline</Badge>
  </div>
);
