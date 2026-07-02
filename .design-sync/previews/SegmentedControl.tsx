import { SegmentedControl } from 'plano';

const noop = () => {};

export const Default = () => (
  <div style={{ width: 320 }}>
    <SegmentedControl
      name="view"
      value="map"
      onValueChange={noop}
      options={[
        { label: 'Map', value: 'map' },
        { label: 'List', value: 'list' },
        { label: 'Grid', value: 'grid' },
      ]}
    />
  </div>
);

export const TwoOptions = () => (
  <div style={{ width: 240 }}>
    <SegmentedControl
      name="scope"
      value="buildings"
      onValueChange={noop}
      options={[
        { label: 'Buildings', value: 'buildings' },
        { label: 'Architects', value: 'architects' },
      ]}
    />
  </div>
);

export const Selections = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 320 }}>
    <SegmentedControl
      name="era-a"
      value="modern"
      onValueChange={noop}
      options={[
        { label: 'Classical', value: 'classical' },
        { label: 'Modern', value: 'modern' },
        { label: 'Contemporary', value: 'contemporary' },
      ]}
    />
    <SegmentedControl
      name="era-b"
      value="contemporary"
      onValueChange={noop}
      options={[
        { label: 'Classical', value: 'classical' },
        { label: 'Modern', value: 'modern' },
        { label: 'Contemporary', value: 'contemporary' },
      ]}
    />
  </div>
);
