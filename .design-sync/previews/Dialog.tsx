import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
} from 'plano';

const eyebrow: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "Space Mono", monospace)',
  fontSize: 11,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
};

const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 };

export const EditRecord = () => (
  <Dialog defaultOpen>
    <DialogContent>
      <DialogHeader>
        <span style={eyebrow}>Building record</span>
        <DialogTitle>Edit Villa Saarinen</DialogTitle>
        <DialogDescription>
          Update the archival entry for this 1962 concrete residence in the Finnish lake district.
        </DialogDescription>
      </DialogHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 4 }}>
        <div style={field}>
          <Label htmlFor="title">Title</Label>
          <Input id="title" defaultValue="Villa Saarinen" />
        </div>
        <div style={field}>
          <Label htmlFor="architect">Architect</Label>
          <Input id="architect" defaultValue="Aarne Ervi" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" size="sm">Cancel</Button>
        <Button size="sm">Save changes</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
