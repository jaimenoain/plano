import { ReactNode } from "react";
import { Sparkles } from "lucide-react";

interface SuggestedContentBlockProps {
  children: ReactNode;
  suggestionReason?: string;
  isSuggested?: boolean;
}

export function SuggestedContentBlock({
  children,
  suggestionReason,
  isSuggested,
}: SuggestedContentBlockProps) {
  if (!isSuggested) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col gap-2 min-w-0 w-full max-w-full overflow-hidden">
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3 w-3 text-text-secondary" />
        <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-secondary">
          Suggested{suggestionReason && ` · ${suggestionReason}`}
        </span>
      </div>
      <div className="relative min-w-0 w-full">
        {children}
      </div>
    </div>
  );
}
