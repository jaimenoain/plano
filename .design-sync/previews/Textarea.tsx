import { Textarea, Label } from 'plano';

const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 420 };

export const Default = () => (
  <div style={field}>
    <Textarea placeholder="Describe this building's significance…" />
  </div>
);

export const Labeled = () => (
  <div style={field}>
    <Label htmlFor="notes">Curatorial notes</Label>
    <Textarea
      id="notes"
      defaultValue="A monolithic concrete residence set into the Finnish hillside, its cantilevered volumes framing the lake below."
    />
  </div>
);

export const Disabled = () => (
  <div style={field}>
    <Label htmlFor="locked-notes">Curatorial notes</Label>
    <Textarea id="locked-notes" defaultValue="Awaiting editorial review before publication." disabled />
  </div>
);
