import { Alert, AlertTitle, AlertDescription } from 'plano';
import { Info, AlertTriangle, CheckCircle2 } from 'lucide-react';

const stack: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 480 };

export const Default = () => (
  <div style={stack}>
    <Alert>
      <Info />
      <AlertTitle>Heads up</AlertTitle>
      <AlertDescription>
        This building record is a draft. Publish it to make it visible on the public map.
      </AlertDescription>
    </Alert>
  </div>
);

export const Destructive = () => (
  <div style={stack}>
    <Alert variant="destructive">
      <AlertTriangle />
      <AlertTitle>Demolition scheduled</AlertTitle>
      <AlertDescription>
        This structure is slated for demolition in Q3. Archive its photography before the listing is removed.
      </AlertDescription>
    </Alert>
  </div>
);

export const Success = () => (
  <div style={stack}>
    <Alert variant="success">
      <CheckCircle2 />
      <AlertTitle>Published</AlertTitle>
      <AlertDescription>Villa Saarinen is now live and discoverable in the archive.</AlertDescription>
    </Alert>
  </div>
);

export const Warning = () => (
  <div style={stack}>
    <Alert variant="warning">
      <AlertTriangle />
      <AlertTitle>Unverified attribution</AlertTitle>
      <AlertDescription>The architect for this project is community-submitted and not yet confirmed.</AlertDescription>
    </Alert>
  </div>
);
