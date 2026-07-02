import { ChartContainer } from 'plano';
import { Bar, BarChart, XAxis, CartesianGrid } from 'recharts';

const data = [
  { decade: '1950s', count: 8 },
  { decade: '1960s', count: 14 },
  { decade: '1970s', count: 22 },
  { decade: '1980s', count: 12 },
  { decade: '1990s', count: 9 },
  { decade: '2000s', count: 17 },
];

const config = { count: { label: 'Buildings', color: 'var(--brand-primary)' } };

export const Bars = () => (
  <div style={{ width: 560 }}>
    <ChartContainer config={config}>
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="decade" tickLine={false} axisLine={false} tickMargin={8} />
        <Bar dataKey="count" fill="var(--color-count)" radius={2} />
      </BarChart>
    </ChartContainer>
  </div>
);
