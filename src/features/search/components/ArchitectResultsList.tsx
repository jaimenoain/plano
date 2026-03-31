import { ArchitectSearchResult } from "../hooks/useArchitectSearch";
import { Skeleton } from "@/components/ui/skeleton";
import { PencilRuler, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ArchitectResultsListProps {
  architects: ArchitectSearchResult[];
  isLoading: boolean;
}

export function ArchitectResultsList({ architects, isLoading }: ArchitectResultsListProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex flex-col gap-2">
               <Skeleton className="h-4 w-32" />
               <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (architects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-text-secondary">
        <p>No architects found matching your search.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4">
      {architects.map((architect) => (
        <div
          key={architect.id}
          className="flex items-center justify-between p-4 border-b border-border-default hover:bg-brand-secondary transition-colors cursor-pointer group"
          onClick={() => navigate(`/architect/${architect.id}`)}
        >
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 rounded-full bg-surface-muted flex items-center justify-center border">
                <PencilRuler className="h-5 w-5 text-text-secondary group-hover:text-text-primary transition-colors" />
             </div>
            <div className="flex flex-col">
              <span className="font-medium text-sm">{architect.name}</span>
              <span className="text-xs text-text-secondary capitalize">{architect.type}</span>
            </div>
          </div>

          <ChevronRight className="h-4 w-4 text-text-secondary/50 group-hover:text-text-primary transition-colors" />
        </div>
      ))}
    </div>
  );
}
