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
    <div className="flex flex-col gap-1.5 p-1 rounded-xl bg-gradient-to-br from-purple-500/5 to-blue-500/5 border border-purple-500/20 mb-6 min-w-0 w-full max-w-full overflow-hidden">
      <div className="flex items-center gap-2 px-3 pt-2 pb-0.5">
        <Sparkles className="h-3.5 w-3.5 text-purple-500 fill-purple-500/20" />
        <span className="text-xs font-medium text-purple-700/80 dark:text-purple-300/80">
          Suggested {suggestionReason && `• ${suggestionReason}`}
        </span>
      </div>
      <div className="relative min-w-0 w-full">
        {children}
      </div>
    </div>
  );
}
