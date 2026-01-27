import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { MetaHead } from "@/components/common/MetaHead";
import { ArrowLeft, Home } from "lucide-react";

const ScopeReductionGraphic = () => (
  <div className="w-full max-w-[320px] aspect-[4/3] mx-auto relative mb-8">
    <svg
      viewBox="0 0 400 300"
      className="w-full h-full text-foreground"
      style={{ overflow: 'visible' }}
    >
      {/* Pattern for grid */}
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
        </pattern>
      </defs>

      {/* Background Grid */}
      <rect width="100%" height="100%" fill="url(#grid)" />

      {/* Floor Plan Walls - Black Lines */}
      <g stroke="currentColor" strokeWidth="3" fill="none" className="text-foreground">
        {/* Outer Perimeter */}
        <rect x="50" y="50" width="300" height="200" />

        {/* Interior Walls */}
        <line x1="150" y1="50" x2="150" y2="250" />
        <line x1="250" y1="50" x2="250" y2="250" />
        <line x1="50" y1="150" x2="150" y2="150" />
        <line x1="250" y1="150" x2="350" y2="150" />
      </g>

      {/* Furniture - Thinner Lines */}
      <g stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5">
        {/* Top Left Room */}
        <rect x="60" y="60" width="40" height="20" />
        <circle cx="80" cy="90" r="8" />

        {/* Bottom Left Room */}
        <rect x="60" y="160" width="40" height="60" />

        {/* Top Right Room */}
        <circle cx="300" cy="100" r="20" />

        {/* Bottom Right Room */}
        <rect x="270" y="170" width="60" height="20" />
      </g>

      {/* Revision Cloud - Red Scalloped Line around center area (approx 160,110 to 240,190) */}
      <path
        d="M 160,110
           q 10,-10 20,0 q 10,-10 20,0 q 10,-10 20,0 q 10,-10 20,0
           q 10,10 0,20 q 10,10 0,20 q 10,10 0,20 q 10,10 0,20
           q -10,10 -20,0 q -10,10 -20,0 q -10,10 -20,0 q -10,10 -20,0
           q -10,-10 0,-20 q -10,-10 0,-20 q -10,-10 0,-20 q -10,-10 0,-20
           z"
        fill="none"
        stroke="#ef4444"
        strokeWidth="2"
      />

      {/* Annotation inside the cloud */}
      <g className="text-red-500">
        <text x="200" y="145" fill="#ef4444" textAnchor="middle" className="text-[10px] font-mono font-bold tracking-tighter">
          ITEM DELETED
        </text>
        <text x="200" y="160" fill="#ef4444" textAnchor="middle" className="text-[10px] font-mono font-bold tracking-tighter">
          VALUE ENGINEERING
        </text>
      </g>
    </svg>
  </div>
);

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MetaHead title="404: Scope Reduction" />
      <Header showLogo={true} />

      {/* Main Content - Centered */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 pb-32 pt-20 text-center max-w-4xl mx-auto w-full">

        <ScopeReductionGraphic />

        <div className="space-y-6 max-w-2xl mx-auto">
           <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
              404: Scope Reduction
           </h1>

           <div className="bg-muted/30 p-6 border border-border/50 rounded-sm">
             <p className="text-sm md:text-base font-mono text-muted-foreground leading-relaxed">
                "We regret to inform you that this page was removed from the project scope during the latest budget review. The client decided a white void was more cost-effective."
             </p>
           </div>

           <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button asChild size="lg" className="min-w-[200px] border-2" variant="default">
                <Link to="/" className="flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Return to Approved Scope
                </Link>
            </Button>

            <Button
              onClick={() => navigate(-1)}
              size="lg"
              variant="outline"
              className="min-w-[200px] border-2"
            >
                <span className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  View Change Order
                </span>
            </Button>
           </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default NotFound;
