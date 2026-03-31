import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export const LandingFeatureGrid = () => {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {/* Card 1: Log Your Journey */}
      <div className="flex flex-col justify-between rounded-sm border border-border-default bg-surface-card p-8 shadow-none">
        <div className="mb-6 space-y-2">
          <h3 className="text-lg font-bold text-text-primary">Log Your Journey</h3>
          <p className="text-sm text-text-secondary">
            Keep track of every architectural masterpiece you've visited.
          </p>
        </div>

        {/* Micro-UI: Visited List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-sm border border-border-default bg-surface-muted/30 p-2.5">
            <span className="text-sm font-medium">Unité d'Habitation</span>
            <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-feedback-success/10">
              <Check className="h-3 w-3 text-feedback-success" />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-sm border border-border-default bg-surface-muted/30 p-2.5">
            <span className="text-sm font-medium">Barbican Centre</span>
            <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-feedback-success/10">
              <Check className="h-3 w-3 text-feedback-success" />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-sm border border-border-default bg-surface-muted/30 p-2.5">
            <span className="text-sm font-medium">Villa Savoye</span>
            <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-feedback-success/10">
              <Check className="h-3 w-3 text-feedback-success" />
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: Curate Lists */}
      <div className="flex flex-col justify-between rounded-sm border border-border-default bg-surface-card p-8 shadow-none">
        <div className="mb-6 space-y-2">
          <h3 className="text-lg font-bold text-text-primary">Curate Lists</h3>
          <p className="text-sm text-text-secondary">
            Organize your favorites into collections like "Brutalist Gems".
          </p>
        </div>

        {/* Micro-UI: Collection Stack */}
        <div className="relative mt-4 flex h-32 flex-col justify-end">
            {/* Background Layers */}
            <div className="absolute bottom-2 left-2 right-2 h-16 rounded-sm border border-border-default bg-surface-muted/40" />
            <div className="absolute bottom-1 left-1 right-1 h-16 rounded-sm border border-border-default bg-surface-muted/60" />

            {/* Top Layer */}
            <div className="relative z-10 flex items-center justify-between rounded-sm border border-border-default bg-surface-default p-3 shadow-none">
              <div>
                <div className="text-sm font-bold text-text-primary">Brutalist Gems</div>
                <div className="text-xs text-text-secondary">12 items</div>
              </div>
              <div className="flex -space-x-2">
                <div className="h-6 w-6 rounded-full bg-surface-muted ring-2 ring-surface-default" />
                <div className="h-6 w-6 rounded-full bg-surface-muted ring-2 ring-surface-default" />
                <div className="h-6 w-6 rounded-full bg-surface-muted ring-2 ring-surface-default" />
              </div>
            </div>
        </div>
      </div>

      {/* Card 3: Follow Architects */}
      <div className="flex flex-col justify-between rounded-sm border border-border-default bg-surface-card p-8 shadow-none">
        <div className="mb-6 space-y-2">
          <h3 className="text-lg font-bold text-text-primary">Follow Architects</h3>
          <p className="text-sm text-text-secondary">
            Stay updated with works from legends like Le Corbusier.
          </p>
        </div>

        {/* Micro-UI: Architect Profile */}
        <div className="mt-auto">
            <div className="flex items-center gap-3 rounded-sm border border-border-default bg-surface-default p-3 shadow-none">
              <div className="h-10 w-10 shrink-0 rounded-full bg-surface-muted" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-text-primary">Le Corbusier</div>
                <div className="truncate text-xs text-text-secondary">Architect</div>
              </div>
              <Button variant="outline" size="sm" className="h-8 shrink-0 text-xs">
                Follow
              </Button>
            </div>

            {/* Decoration: Blurred second row to hint at more */}
            <div className="mt-2 flex items-center gap-3 opacity-40 blur-[1px]">
               <div className="h-8 w-8 rounded-full bg-surface-muted" />
               <div className="h-3 w-20 rounded-sm bg-surface-muted" />
            </div>
        </div>
      </div>
    </div>
  );
};
