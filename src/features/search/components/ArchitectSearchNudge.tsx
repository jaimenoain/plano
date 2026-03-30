import { ArchitectSearchResult } from "../hooks/useArchitectSearch";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PencilRuler } from "lucide-react";

interface ArchitectSearchNudgeProps {
  architects: ArchitectSearchResult[];
  onSingleMatch: (id: string) => void;
  onMultipleMatch: () => void;
}

export function ArchitectSearchNudge({ architects, onSingleMatch, onMultipleMatch }: ArchitectSearchNudgeProps) {
  if (architects.length === 0) return null;

  if (architects.length === 1) {
    const architect = architects[0];
    return (
      <div className="px-4 py-2 animate-in fade-in slide-in-from-top-2">
        <Card className="bg-surface-muted/50 border-dashed hover:bg-surface-muted transition-colors cursor-pointer group" onClick={() => onSingleMatch(architect.id)}>
          <CardContent className="flex items-center gap-3 p-3">
             <div className="h-8 w-8 rounded-full bg-surface-default border flex items-center justify-center">
                <PencilRuler className="h-4 w-4 text-text-secondary" />
             </div>
             <div className="flex-1">
                <p className="text-sm font-medium">Looking for <span className="text-brand-primary font-semibold group-hover:underline">{architect.name}</span>?</p>
             </div>
             <Button variant="ghost" size="sm" className="h-8 text-xs text-text-secondary group-hover:text-text-primary">View Portfolio</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Multiple matches
  return (
    <div className="px-4 py-2 animate-in fade-in slide-in-from-top-2">
      <Card className="bg-surface-muted/50 border-dashed hover:bg-surface-muted transition-colors cursor-pointer group" onClick={onMultipleMatch}>
        <CardContent className="flex items-center gap-3 p-3">
           <div className="flex -space-x-2 overflow-hidden pl-1">
             {architects.slice(0, 3).map((arch) => (
               <div key={arch.id} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface-default ring-2 ring-surface-default border">
                  <PencilRuler className="h-3 w-3 text-text-secondary" />
               </div>
             ))}
           </div>
           <div className="flex-1">
              <p className="text-sm font-medium">{architects.length} architects found matching your search</p>
           </div>
           <Button variant="ghost" size="sm" className="h-8 text-xs text-text-secondary group-hover:text-text-primary">View All</Button>
        </CardContent>
      </Card>
    </div>
  );
}
