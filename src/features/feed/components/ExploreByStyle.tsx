import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ArchitecturalStyle {
  id: string;
  name: string;
  slug: string | null;
}

// Curated fallback list shown while loading or if the query returns nothing
const FALLBACK_STYLES: ArchitecturalStyle[] = [
  { id: "brutalist", name: "Brutalist", slug: "brutalist" },
  { id: "modernist", name: "Modernist", slug: "modernist" },
  { id: "art-deco", name: "Art Deco", slug: "art-deco" },
  { id: "gothic", name: "Gothic", slug: "gothic" },
  { id: "baroque", name: "Baroque", slug: "baroque" },
  { id: "deconstructivist", name: "Deconstructivist", slug: "deconstructivist" },
  { id: "high-tech", name: "High-Tech", slug: "high-tech" },
  { id: "organic", name: "Organic", slug: "organic" },
];

async function fetchStyles(): Promise<ArchitecturalStyle[]> {
  const { data, error } = await supabase
    .from("architectural_styles")
    .select("id, name, slug")
    .order("name")
    .limit(16);
  if (error) throw error;
  return (data ?? []) as unknown as ArchitecturalStyle[];
}

export function ExploreByStyle() {
  const navigate = useNavigate();
  const { data: styles, isLoading } = useQuery({
    queryKey: ["architectural-styles-sidebar"],
    queryFn: fetchStyles,
    staleTime: 30 * 60 * 1000, // styles rarely change
  });

  const displayStyles =
    !isLoading && styles && styles.length > 0 ? styles : FALLBACK_STYLES;

  return (
    <div className="border border-border-default rounded-sm bg-surface-card shadow-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-text-secondary" />
          Explore by style
        </h3>
      </div>

      {/* Pills */}
      <div className="px-4 pb-4 flex flex-wrap gap-1.5">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <Skeleton
                key={i}
                className={cn("h-6 rounded-sm", i % 3 === 0 ? "w-20" : i % 3 === 1 ? "w-16" : "w-24")}
              />
            ))
          : displayStyles.map((style) => (
              <button
                key={style.id}
                onClick={() => navigate("/explore")}
                className="text-xs font-medium px-2.5 py-1 rounded-sm border border-border-default bg-surface-muted text-text-secondary hover:bg-brand-secondary hover:border-brand-primary hover:text-brand-secondary-foreground transition-colors"
              >
                {style.name}
              </button>
            ))}
      </div>
    </div>
  );
}