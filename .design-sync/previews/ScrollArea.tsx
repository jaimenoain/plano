import { ScrollArea, Separator } from 'plano';

const eyebrow: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "Space Mono", monospace)',
  fontSize: 11,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
  padding: '12px 16px',
};

const buildings = [
  'Villa Saarinen · 1962',
  'Finlandia Hall · 1971',
  'Rautatalo · 1955',
  'Kiasma · 1998',
  'Paimio Sanatorium · 1933',
  'Säynätsalo Town Hall · 1952',
  'National Pensions Institute · 1956',
  'Temppeliaukio Church · 1969',
  'Dipoli · 1966',
  'Kaleva Church · 1966',
  'Enso-Gutzeit HQ · 1962',
  'Sunila Pulp Mill · 1938',
];

export const BuildingList = () => (
  <ScrollArea style={{ height: 240, width: 300, border: '1px solid var(--border-default)' }}>
    <div style={eyebrow}>Finnish modernism — 214</div>
    <Separator />
    <div style={{ padding: '4px 0' }}>
      {buildings.map((b) => (
        <div
          key={b}
          style={{ fontSize: 14, color: 'var(--text-primary)', padding: '10px 16px' }}
        >
          {b}
        </div>
      ))}
    </div>
  </ScrollArea>
);

export const Prose = () => (
  <ScrollArea style={{ height: 200, width: 320, border: '1px solid var(--border-default)', padding: 16 }}>
    <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)', margin: 0 }}>
      Villa Saarinen is a monolithic concrete residence set into the Finnish hillside above Lake
      Kallavesi. Its cantilevered volumes frame the water below, while a single board-marked
      spine wall organises the plan from entry to hearth. The 1962 commission drew on the
      architect's studies of load-bearing masonry and the topography of the site, producing a
      house that reads as one continuous gesture from road to shoreline. Later revisions
      recorded in the archive document the glazing of the lakeside terrace and the addition of a
      lower studio wing.
    </p>
  </ScrollArea>
);
