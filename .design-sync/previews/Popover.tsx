import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  Button,
  Label,
  Input,
} from 'plano';

const eyebrow: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "Space Mono", monospace)',
  fontSize: 11,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
};

const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 };

export const AddToCollection = () => (
  <Popover defaultOpen>
    <PopoverTrigger asChild>
      <Button variant="outline" size="sm">Add to collection</Button>
    </PopoverTrigger>
    <PopoverContent align="start">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={eyebrow}>New collection</span>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Group Villa Saarinen with related records.
          </p>
        </div>
        <div style={field}>
          <Label htmlFor="cname">Name</Label>
          <Input id="cname" defaultValue="Finnish Brutalism" />
        </div>
        <Button size="sm">Create collection</Button>
      </div>
    </PopoverContent>
  </Popover>
);
