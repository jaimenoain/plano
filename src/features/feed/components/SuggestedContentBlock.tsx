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
    <div className="flex flex-col gap-3 p-4 md:p-6 rounded-sm bg-brand-secondary border border-border-default mb-6 min-w-0 w-full max-w-full overflow-hidden">
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-brand-secondary-foreground" />
        <span className="text-xs font-medium text-brand-secondary-foreground">
          Suggested {suggestionReason && `• ${suggestionReason}`}
        </span>
      </div>
      <div className="relative min-w-0 w-full">
        {children}
      </div>
    </div>
  );
}
