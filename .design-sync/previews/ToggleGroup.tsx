import { ToggleGroup, ToggleGroupItem } from 'plano';
import { AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline } from 'lucide-react';

const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' };

export const SingleSelect = () => (
  <ToggleGroup type="single" defaultValue="center" variant="outline">
    <ToggleGroupItem value="left" aria-label="Align left"><AlignLeft /></ToggleGroupItem>
    <ToggleGroupItem value="center" aria-label="Align center"><AlignCenter /></ToggleGroupItem>
    <ToggleGroupItem value="right" aria-label="Align right"><AlignRight /></ToggleGroupItem>
  </ToggleGroup>
);

export const MultiSelect = () => (
  <ToggleGroup type="multiple" defaultValue={['bold', 'italic']} variant="outline">
    <ToggleGroupItem value="bold" aria-label="Bold"><Bold /></ToggleGroupItem>
    <ToggleGroupItem value="italic" aria-label="Italic"><Italic /></ToggleGroupItem>
    <ToggleGroupItem value="underline" aria-label="Underline"><Underline /></ToggleGroupItem>
  </ToggleGroup>
);

export const LabelledFilter = () => (
  <div style={col}>
    <ToggleGroup type="single" defaultValue="brutalism" variant="outline">
      <ToggleGroupItem value="brutalism">Brutalism</ToggleGroupItem>
      <ToggleGroupItem value="modernism">Modernism</ToggleGroupItem>
      <ToggleGroupItem value="deco">Art Deco</ToggleGroupItem>
    </ToggleGroup>
  </div>
);
