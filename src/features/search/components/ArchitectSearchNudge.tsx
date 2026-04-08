import type { PersonSummary } from "@/features/credits/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserRound } from "lucide-react";

interface ArchitectSearchNudgeProps {
  people: PersonSummary[];
  onSingleMatch: (slug: string) => void;
  onMultipleMatch: () => void;
}

export function ArchitectSearchNudge({ people, onSingleMatch, onMultipleMatch }: ArchitectSearchNudgeProps) {
  if (people.length === 0) return null;

  if (people.length === 1) {
    const person = people[0];
    return (
      <div className="px-4 py-2 animate-in fade-in slide-in-from-top-2">
        <Card
          className="bg-brand-secondary rounded-sm border border-border-default hover:bg-brand-secondary transition-colors cursor-pointer group"
          onClick={() => onSingleMatch(person.slug)}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-8 w-8 rounded-sm bg-surface-muted border border-border-default flex items-center justify-center">
              <UserRound className="h-4 w-4 text-text-secondary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">
                Looking for{" "}
                <span className="text-brand-primary font-semibold group-hover:underline">
                  {person.name}
                </span>
                ?
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-text-secondary group-hover:text-text-primary"
            >
              View profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 py-2 animate-in fade-in slide-in-from-top-2">
      <Card
        className="bg-brand-secondary rounded-sm border border-border-default hover:bg-brand-secondary transition-colors cursor-pointer group"
        onClick={onMultipleMatch}
      >
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex -space-x-2 overflow-hidden pl-1">
            {people.slice(0, 3).map((p) => (
              <div
                key={p.id}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface-default ring-2 ring-surface-default border"
              >
                <UserRound className="h-3 w-3 text-text-secondary" />
              </div>
            ))}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-text-primary">
              {people.length} people found matching your search
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-text-secondary group-hover:text-text-primary"
          >
            View all
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
