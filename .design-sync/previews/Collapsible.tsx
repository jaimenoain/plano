import { Collapsible, CollapsibleTrigger, CollapsibleContent } from 'plano';
import { ChevronsUpDown } from 'lucide-react';

const eyebrow: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "Space Mono", monospace)',
  fontSize: 11,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
};

const rowItem: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--text-primary)',
  padding: '10px 12px',
  border: '1px solid var(--border-default)',
};

const triggerStyle: React.CSSProperties = {
  display: 'flex',
  width: '100%',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
  fontSize: 15,
  fontWeight: 600,
  color: 'var(--text-primary)',
};

export const Revisions = () => (
  <Collapsible defaultOpen style={{ maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 10 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={eyebrow}>Revision history</span>
      <CollapsibleTrigger style={triggerStyle} aria-label="Toggle revisions">
        <ChevronsUpDown style={{ height: 16, width: 16, color: 'var(--text-secondary)' }} />
      </CollapsibleTrigger>
    </div>
    <div style={rowItem}>Attribution confirmed · Eero Saarinen · 1962</div>
    <CollapsibleContent style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={rowItem}>Construction status set to Extant</div>
      <div style={rowItem}>7 archive plates ingested</div>
      <div style={rowItem}>Record published to the public map</div>
    </CollapsibleContent>
  </Collapsible>
);

export const Closed = () => (
  <Collapsible style={{ maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 10 }}>
    <CollapsibleTrigger style={triggerStyle}>
      <span>Structural notes</span>
      <ChevronsUpDown style={{ height: 16, width: 16, color: 'var(--text-secondary)' }} />
    </CollapsibleTrigger>
    <CollapsibleContent style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={rowItem}>Cast-in-place reinforced concrete frame</div>
      <div style={rowItem}>Cantilevered living volume, 6.4 m span</div>
    </CollapsibleContent>
  </Collapsible>
);
