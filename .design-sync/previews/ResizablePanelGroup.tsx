import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from 'plano';

const frame: React.CSSProperties = {
  height: 260,
  width: 520,
  border: '1px solid var(--border-default)',
  borderRadius: 2,
  overflow: 'hidden',
};
const eyebrow: React.CSSProperties = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--text-secondary)',
  marginBottom: 8,
};
const pane: React.CSSProperties = { padding: 16, height: '100%', boxSizing: 'border-box' };
const body: React.CSSProperties = { fontSize: 14, lineHeight: 1.5, color: 'var(--text-primary)' };

export const Horizontal = () => (
  <div style={frame}>
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel defaultSize={40}>
        <div style={pane}>
          <div style={eyebrow}>Archive</div>
          <p style={body}>Villa Saarinen<br />Säynätsalo Town Hall<br />Paimio Sanatorium</p>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={60}>
        <div style={pane}>
          <div style={eyebrow}>Detail</div>
          <p style={body}>Alvar Aalto, 1952. Säynätsalo, Finland. Red brick civic complex arranged around a raised courtyard.</p>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  </div>
);

export const Vertical = () => (
  <div style={frame}>
    <ResizablePanelGroup direction="vertical">
      <ResizablePanel defaultSize={45}>
        <div style={pane}>
          <div style={eyebrow}>Photograph</div>
          <p style={body}>Exterior, south elevation. Ezra Stoller, 1963.</p>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={55}>
        <div style={pane}>
          <div style={eyebrow}>Metadata</div>
          <p style={body}>Gelatin silver print · 20×25 cm · Yale Manuscripts &amp; Archives.</p>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  </div>
);
