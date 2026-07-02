import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  Button,
} from 'plano';

const eyebrow: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "Space Mono", monospace)',
  fontSize: 11,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
};

const row: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  padding: '10px 0',
  borderBottom: '1px solid var(--border-default)',
  fontSize: 14,
};

const key: React.CSSProperties = { color: 'var(--text-secondary)' };
const val: React.CSSProperties = { color: 'var(--text-primary)', textAlign: 'right' };

export const BuildingDetail = () => (
  <Sheet defaultOpen>
    <SheetContent side="right">
      <SheetHeader>
        <span style={eyebrow}>Helsinki · Finland</span>
        <SheetTitle>Villa Saarinen</SheetTitle>
        <SheetDescription>
          A monolithic concrete residence set into the hillside above Lake Tuusula.
        </SheetDescription>
      </SheetHeader>
      <div style={{ paddingTop: 16 }}>
        <div style={row}><span style={key}>Architect</span><span style={val}>Aarne Ervi</span></div>
        <div style={row}><span style={key}>Completed</span><span style={val}>1962</span></div>
        <div style={row}><span style={key}>Style</span><span style={val}>Brutalism</span></div>
        <div style={{ ...row, borderBottom: 'none' }}><span style={key}>Status</span><span style={val}>Extant</span></div>
      </div>
      <SheetFooter style={{ marginTop: 24 }}>
        <Button size="sm">Open full record</Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
);
