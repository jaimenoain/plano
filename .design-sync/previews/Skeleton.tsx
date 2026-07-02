import { Skeleton } from 'plano';

export const BuildingCard = () => (
  <div style={{ maxWidth: 320, border: '1px solid var(--border-default)' }}>
    <Skeleton style={{ height: 180, width: '100%', borderRadius: 0 }} />
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Skeleton style={{ height: 10, width: '35%' }} />
      <Skeleton style={{ height: 18, width: '75%' }} />
      <Skeleton style={{ height: 12, width: '100%' }} />
      <Skeleton style={{ height: 12, width: '60%' }} />
    </div>
  </div>
);

export const ListRow = () => (
  <div style={{ maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 16 }}>
    {[0, 1, 2].map((i) => (
      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Skeleton style={{ height: 40, width: 40, borderRadius: 9999 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skeleton style={{ height: 12, width: '55%' }} />
          <Skeleton style={{ height: 10, width: '80%' }} />
        </div>
      </div>
    ))}
  </div>
);
