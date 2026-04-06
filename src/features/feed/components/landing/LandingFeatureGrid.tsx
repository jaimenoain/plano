import { Check } from "lucide-react";

export const LandingFeatureGrid = () => {
  return (
    <div className="grid grid-cols-1 gap-16 md:grid-cols-3 md:gap-12 py-16 md:py-24 px-4 max-w-5xl mx-auto">
      {/* Feature 1: Log Your Journey */}
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-2xs font-medium uppercase tracking-widest text-text-secondary">
            Track
          </p>
          <h3 className="text-2xl font-bold tracking-tight text-text-primary">
            Log Your Journey
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            Keep track of every architectural masterpiece you've visited.
          </p>
        </div>

        <div className="space-y-2">
          {["Unité d'Habitation", "Barbican Centre", "Villa Savoye"].map(
            (name) => (
              <div
                key={name}
                className="flex items-center justify-between border-b border-border-default pb-2"
              >
                <span className="text-sm font-medium text-text-primary">
                  {name}
                </span>
                <Check className="h-3.5 w-3.5 text-text-disabled" />
              </div>
            )
          )}
        </div>
      </div>

      {/* Feature 2: Curate Lists */}
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-2xs font-medium uppercase tracking-widest text-text-secondary">
            Collect
          </p>
          <h3 className="text-2xl font-bold tracking-tight text-text-primary">
            Curate Lists
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            Organize your favorites into collections like "Brutalist Gems".
          </p>
        </div>

        <div className="space-y-3">
          <div className="border-b border-border-default pb-3">
            <p className="text-sm font-semibold text-text-primary">
              Brutalist Gems
            </p>
            <p className="text-xs text-text-secondary mt-0.5">12 buildings</p>
          </div>
          <div className="border-b border-border-default pb-3 opacity-50">
            <p className="text-sm font-semibold text-text-primary">
              Tokyo Metabolist
            </p>
            <p className="text-xs text-text-secondary mt-0.5">8 buildings</p>
          </div>
          <div className="opacity-25">
            <p className="text-sm font-semibold text-text-primary">
              Sacred Spaces
            </p>
            <p className="text-xs text-text-secondary mt-0.5">5 buildings</p>
          </div>
        </div>
      </div>

      {/* Feature 3: Follow Architects */}
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-2xs font-medium uppercase tracking-widest text-text-secondary">
            Connect
          </p>
          <h3 className="text-2xl font-bold tracking-tight text-text-primary">
            Follow Architects
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            Stay updated with works from legends like Le Corbusier.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 border-b border-border-default pb-3">
            <div className="h-8 w-8 shrink-0 rounded-full bg-surface-muted" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">
                Le Corbusier
              </p>
              <p className="text-xs text-text-secondary">Architect</p>
            </div>
            <span className="text-xs font-medium uppercase tracking-widest text-text-secondary">
              Follow
            </span>
          </div>
          <div className="flex items-center gap-3 opacity-40">
            <div className="h-8 w-8 shrink-0 rounded-full bg-surface-muted" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">
                Zaha Hadid
              </p>
              <p className="text-xs text-text-secondary">Architect</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
