import { RadioGroup, RadioGroupItem, Label } from 'plano';

const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 };

export const Default = () => (
  <RadioGroup defaultValue="modernism">
    <div style={row}>
      <RadioGroupItem value="modernism" id="r-mod" />
      <Label htmlFor="r-mod">Modernism</Label>
    </div>
    <div style={row}>
      <RadioGroupItem value="brutalism" id="r-bru" />
      <Label htmlFor="r-bru">Brutalism</Label>
    </div>
    <div style={row}>
      <RadioGroupItem value="deco" id="r-deco" />
      <Label htmlFor="r-deco">Art Deco</Label>
    </div>
  </RadioGroup>
);

export const Disabled = () => (
  <RadioGroup defaultValue="approved" disabled>
    <div style={row}>
      <RadioGroupItem value="approved" id="rd-ok" />
      <Label htmlFor="rd-ok">Approved</Label>
    </div>
    <div style={row}>
      <RadioGroupItem value="pending" id="rd-pend" />
      <Label htmlFor="rd-pend">Pending review</Label>
    </div>
  </RadioGroup>
);
