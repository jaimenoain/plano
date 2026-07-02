import { Progress } from 'plano';

const stack: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 420 };
const eyebrow: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "Space Mono", monospace)',
  fontSize: 11,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 8,
};

export const Steps = () => (
  <div style={stack}>
    <div>
      <div style={eyebrow}><span>Archive digitised</span><span>25%</span></div>
      <Progress value={25} />
    </div>
    <div>
      <div style={eyebrow}><span>Archive digitised</span><span>66%</span></div>
      <Progress value={66} />
    </div>
    <div>
      <div style={eyebrow}><span>Archive digitised</span><span>100%</span></div>
      <Progress value={100} />
    </div>
  </div>
);

export const UploadCard = () => (
  <div style={{ maxWidth: 360, border: '1px solid var(--border-default)', padding: 20 }}>
    <div style={eyebrow}><span>Uploading photography</span><span>48%</span></div>
    <Progress value={48} />
    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 12, lineHeight: 1.5 }}>
      Ingesting 1962 negatives for Villa Saarinen — 11 of 23 plates processed.
    </p>
  </div>
);
