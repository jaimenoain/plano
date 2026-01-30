import { Bar, BarChart, XAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

interface RatingDistributionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
}

const chartConfig = {
  count: {
    label: "Count",
    color: "hsl(var(--primary))",
  },
};

export function RatingDistribution({ data }: RatingDistributionProps) {
  if (!data || data.length === 0) return null;

  return (
    <Card className="border-none shadow-sm bg-accent/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Rating Distribution</CardTitle>
        <CardDescription>Frequency of scores (1-3)</CardDescription>
      </CardHeader>
      <CardContent className="h-[250px] w-full">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis
                dataKey="score"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                content={<ChartTooltipContent />}
                cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
              />
              <Bar
                dataKey="count"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                name="Count"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
