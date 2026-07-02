import { Button } from 'plano';
import { ArrowRight, Plus } from 'lucide-react';

const row: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' };

export const Variants = () => (
  <div style={row}>
    <Button>Save changes</Button>
    <Button variant="secondary">Secondary</Button>
    <Button variant="outline">Outline</Button>
    <Button variant="ghost">Ghost</Button>
    <Button variant="destructive">Delete</Button>
    <Button variant="link">Learn more</Button>
  </div>
);

export const Sizes = () => (
  <div style={row}>
    <Button size="sm">Small</Button>
    <Button size="default">Default</Button>
    <Button size="lg">Large</Button>
  </div>
);

export const WithIcons = () => (
  <div style={row}>
    <Button><Plus />New building</Button>
    <Button variant="outline">Continue<ArrowRight /></Button>
    <Button size="icon" variant="outline" aria-label="Add"><Plus /></Button>
  </div>
);

export const Disabled = () => (
  <div style={row}>
    <Button disabled>Disabled</Button>
    <Button variant="outline" disabled>Disabled</Button>
  </div>
);
