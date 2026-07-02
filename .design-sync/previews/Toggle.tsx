import { Toggle } from 'plano';
import { Bold, Italic, Underline, Star } from 'lucide-react';

const row: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' };

export const States = () => (
  <div style={row}>
    <Toggle aria-label="Bold, off"><Bold /></Toggle>
    <Toggle defaultPressed aria-label="Italic, on"><Italic /></Toggle>
  </div>
);

export const Variants = () => (
  <div style={row}>
    <Toggle defaultPressed>Default</Toggle>
    <Toggle variant="outline" defaultPressed>Outline</Toggle>
    <Toggle variant="outline">Outline off</Toggle>
  </div>
);

export const Sizes = () => (
  <div style={row}>
    <Toggle size="sm" variant="outline" defaultPressed>Small</Toggle>
    <Toggle size="default" variant="outline" defaultPressed>Default</Toggle>
    <Toggle size="lg" variant="outline" defaultPressed>Large</Toggle>
  </div>
);

export const WithText = () => (
  <div style={row}>
    <Toggle variant="outline" defaultPressed><Star />Saved</Toggle>
    <Toggle variant="outline"><Underline />Underline</Toggle>
    <Toggle disabled defaultPressed>Disabled</Toggle>
  </div>
);
