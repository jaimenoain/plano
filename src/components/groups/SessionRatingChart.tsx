import { useMemo, useState } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip, TooltipProps, YAxis } from "recharts";

interface SessionRatingChartProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sessionBuildings: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalRankingData: any[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomDot = (props: any) => {
  const { cx, cy, payload, index, dataLength, setHoveredBuilding } = props;

  // Only render dots for buildings that belong to the current session
  if (!payload.isSessionBuilding) return null;

  // Smart Positioning Logic
  // Strategy: Alternate label position (Top/Bottom) based on the order of session buildings
  // to minimize overlap between adjacent highlighted dots.
  const isEvenOrder = payload.sessionOrder % 2 === 0;

  // Default preference based on alternation
  let preferTop = isEvenOrder;

  // Boundary Checks override preference
  // Assuming chart height is roughly 240px as per container
  if (cy < 40) preferTop = false;       // Too close to top, force bottom
  else if (cy > 200) preferTop = true;  // Too close to bottom, force top

  const labelY = preferTop ? cy - 10 : cy + 20;

  // Alignment based on X position (Index)
  // If first 10%, left align. If last 10%, right align. Else center.
  let textAnchor: "start" | "middle" | "end" = "middle";
  if (index < dataLength * 0.1) textAnchor = "start";
  else if (index > dataLength * 0.9) textAnchor = "end";

  return (
    <g>
      {/* Invisible larger hit area for easier hovering */}
      <circle
        cx={cx}
        cy={cy}
        r={20}
        fill="transparent"
        style={{ cursor: 'pointer' }}
        onMouseEnter={() => setHoveredBuilding(payload)}
        onMouseLeave={() => setHoveredBuilding(null)}
      />

      {/* Visible Dot */}
      <circle
        cx={cx}
        cy={cy}
        r={5}
        stroke="hsl(var(--primary))"
        strokeWidth={2}
        fill="hsl(var(--background))"
        style={{ pointerEvents: 'none' }} // Let the larger circle handle events
      />

      {/* Label */}
      <text
        x={cx}
        y={labelY}
        textAnchor={textAnchor}
        fill="hsl(var(--foreground))"
        className="text-[10px] font-bold"
        dominantBaseline={preferTop ? "auto" : "hanging"}
        style={{ cursor: 'pointer' }}
        onMouseEnter={() => setHoveredBuilding(payload)}
        onMouseLeave={() => setHoveredBuilding(null)}
      >
        {payload.displayTitle}
      </text>
    </g>
  );
};

const CustomTooltip = ({ active, payload, label, hoveredBuilding, chartData }: TooltipProps<number, string> & { hoveredBuilding?: any, chartData?: any[] }) => {
  // 1. Priority: Direct hover on dot/label
  if (hoveredBuilding) {
    return <BuildingTooltip data={hoveredBuilding} />;
  }

  // 2. Secondary: Hovering the chart area (active tooltip)
  if (active && payload && payload.length && chartData) {
    const currentIndex = label as number;
    const data = payload[0].payload;

    // Find nearest session building
    let nearestDist = Infinity;
    let nearestBuilding = null;

    // Search range optimization: look around the current index
    // Threshold: 5% of total width or minimum 2 steps
    const threshold = Math.max(2, Math.floor(chartData.length * 0.05));

    // Check neighbors within threshold
    for (let i = 0; i <= threshold; i++) {
      // Check right
      if (currentIndex + i < chartData.length) {
        if (chartData[currentIndex + i].isSessionBuilding) {
          nearestDist = i;
          nearestBuilding = chartData[currentIndex + i];
          break; // Found closest on right (preferred if dist 0)
        }
      }
      // Check left
      if (currentIndex - i >= 0) {
        if (chartData[currentIndex - i].isSessionBuilding) {
          // If we found one on right at same distance, we already broke.
          // If i=0, handled above.
          // If i>0, this is valid. Prioritize closer.
          if (i < nearestDist) {
            nearestDist = i;
            nearestBuilding = chartData[currentIndex - i];
          }
          break;
        }
      }
    }

    // Scenario B: Proximity Snap to Session Building
    if (nearestBuilding && nearestDist <= threshold) {
      return <BuildingTooltip data={nearestBuilding} />;
    }

    // Scenario A: Standard Rating Tooltip (No nearby session building)
    return (
      <div className="bg-muted/80 backdrop-blur border border-border/50 rounded px-2 py-1 text-[10px] shadow-sm pointer-events-none">
         <span className="font-mono text-muted-foreground">Rating: {data.rating.toFixed(1)}</span>
      </div>
    );
  }
  return null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BuildingTooltip = ({ data }: { data: any }) => {
      const showSubtitle = data.localTitle && data.localTitle !== data.displayTitle;

      return (
        <div className="bg-popover/95 border border-border rounded-lg px-3 py-2 text-xs shadow-lg backdrop-blur-sm z-50 pointer-events-none">
          <p className="font-bold text-sm mb-0.5">{data.displayTitle}</p>
          {showSubtitle && (
            <p className="text-[10px] text-muted-foreground mb-1.5 italic">{data.localTitle}</p>
          )}
          {!showSubtitle && <div className="mb-1.5" />}

          <div className="space-y-0.5 text-muted-foreground">
            <div className="flex justify-between gap-4">
              <span>Member Avg:</span>
              <span className="font-medium text-foreground">{data.rating.toFixed(1)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Global Rank:</span>
              <span className="font-medium text-foreground">Top {data.percentile}%</span>
            </div>
          </div>
        </div>
      );
};

export function SessionRatingChart({ sessionBuildings, globalRankingData }: SessionRatingChartProps) {
  const [hoveredBuilding, setHoveredBuilding] = useState<any>(null);

  const chartData = useMemo(() => {
    if (!globalRankingData.length) return [];

    // 1. Sort global data by rating descending
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sortedData = [...globalRankingData].sort((a: any, b: any) => b.avg_rating - a.avg_rating);
    const totalCount = sortedData.length;

    const sessionBuildingIds = new Set(sessionBuildings?.map(sf => String(sf.building.id)));

    // Counter to maintain alternating label logic just for session buildings
    let sessionOrderCounter = 0;

    // Map data to calculate GLOBAL ranking/percentile
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mappedData = sortedData.map((stat: any, index: number) => {
      const buildingIdStr = String(stat.building_id);
      const isSessionBuilding = sessionBuildingIds.has(buildingIdStr);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sessionBuilding = isSessionBuilding ? sessionBuildings.find((sf: any) => String(sf.building.id) === buildingIdStr) : null;

      // Titles logic
      // Prefer original title, fallback to local, then stat title
      const displayTitle = sessionBuilding?.building?.name || stat.name || "Unknown";

      // Calculate Percentile (Top X%) - relative to TOTAL rated buildings
      const percentile = Math.ceil(((index + 1) / totalCount) * 100);

      return {
        rating: stat.avg_rating,
        displayTitle,
        localTitle: null, // Removed concept of local vs original title for buildings for now
        isSessionBuilding,
        percentile,
        rank: index + 1,
        // Assign order only if it's a session building, otherwise -1 (unused)
        sessionOrder: isSessionBuilding ? sessionOrderCounter++ : -1
      };
    });

    // Return the FULL dataset (do not filter) so the sparkline shows the entire group history
    return mappedData;

  }, [sessionBuildings, globalRankingData]);

  if (chartData.length === 0) return null;

  return (
    <div className="w-full pt-4 pb-2">
      <div className="flex items-center gap-2 mb-4 px-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
          Ranking Context
        </span>
        <div className="h-px bg-border/40 flex-1" />
      </div>

      <div className="w-full h-[240px] px-2 mb-6">
         <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <YAxis domain={['dataMin', 'dataMax']} hide />
              <Tooltip content={<CustomTooltip hoveredBuilding={hoveredBuilding} chartData={chartData} />} cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Line
                type="natural"
                dataKey="rating"
                stroke="hsl(var(--muted-foreground)/0.5)"
                strokeWidth={3}
                dot={(props) => <CustomDot {...props} dataLength={chartData.length} setHoveredBuilding={setHoveredBuilding} />}
                activeDot={{ r: 6, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </LineChart>
         </ResponsiveContainer>
      </div>
    </div>
  );
}
