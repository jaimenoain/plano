import { useState } from "react";
import { Flag } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const FLAG_REASONS = [
  { value: "incorrect_info",    label: "Incorrect information" },
  { value: "low_quality",       label: "Low quality" },
  { value: "spam",              label: "Spam or off-topic" },
  { value: "copyright",         label: "Copyright issue" },
  { value: "inappropriate",     label: "Inappropriate content" },
] as const;

export type FlagReason = (typeof FLAG_REASONS)[number]["value"];

export function FlagButton({
  id,
  label,
  onFlag,
  overlay = false,
}: {
  id: string;
  label: string;
  onFlag: (id: string, label: string, reason: FlagReason) => void;
  overlay?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const triggerClass = overlay
    ? "p-1.5 rounded-sm bg-background/80 backdrop-blur-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
    : "opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Flag for review"
          aria-label="Flag for review"
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          className={triggerClass}
        >
          <Flag className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-52 p-2"
        side="left"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 pb-1.5">
          Reason for flagging
        </p>
        <div className="space-y-0.5">
          {FLAG_REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onFlag(id, label, r.value);
              }}
              className="w-full text-left text-sm px-2 py-1.5 rounded-sm hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              {r.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
