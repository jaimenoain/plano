import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  Button,
} from 'plano';

const eyebrow: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "Space Mono", monospace)',
  fontSize: 11,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
};

export const FilterPanel = () => (
  <Drawer defaultOpen shouldScaleBackground={false}>
    <DrawerContent>
      <DrawerHeader>
        <span style={eyebrow}>Refine results</span>
        <DrawerTitle>Filter the archive</DrawerTitle>
        <DrawerDescription>
          Narrow the map to buildings matching your criteria across cities and eras.
        </DrawerDescription>
      </DrawerHeader>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 16px' }}>
        {['Brutalism', 'Bauhaus', 'Extant', 'Post-war', 'Helsinki'].map((t) => (
          <span
            key={t}
            style={{
              border: '1px solid var(--border-default)',
              padding: '4px 10px',
              fontSize: 13,
              color: 'var(--text-primary)',
            }}
          >
            {t}
          </span>
        ))}
      </div>
      <DrawerFooter>
        <Button size="sm">Apply filters</Button>
        <Button size="sm" variant="outline">Reset</Button>
      </DrawerFooter>
    </DrawerContent>
  </Drawer>
);
