import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { buildFeedbackClaudePrompt } from "@/features/admin/feedback/buildFeedbackClaudePrompt";
import type { FeedbackRow } from "@/features/admin/feedback/feedbackTypes";

interface CopyFeedbackClaudePromptButtonProps {
  row: FeedbackRow;
  onAfterCopy?: () => void;
}

export function CopyFeedbackClaudePromptButton({
  row,
  onAfterCopy,
}: CopyFeedbackClaudePromptButtonProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildFeedbackClaudePrompt(row));
      setCopied(true);
      toast({ title: "Claude Code prompt copied" });
      window.setTimeout(() => setCopied(false), 2000);
      onAfterCopy?.();
    } catch {
      toast({
        variant: "destructive",
        title: "Could not copy to clipboard",
      });
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="gap-1.5"
      onClick={() => void handleCopy()}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
      ) : (
        <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden />
      )}
      {copied ? "Copied" : "Copy Claude Code prompt"}
    </Button>
  );
}
