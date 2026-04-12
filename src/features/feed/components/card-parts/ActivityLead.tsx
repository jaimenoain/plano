import { cn } from "@/lib/utils";

export interface ActivityLeadProps {
  username: string;
  verb: string;
  hideUser?: boolean;
  className?: string;
}

/**
 * Stream meta line: `{username} {verb}` — 10px uppercase, username emphasized.
 */
export function ActivityLead({ username, verb, hideUser, className }: ActivityLeadProps) {
  if (hideUser) return null;
  return (
    <p
      className={cn(
        "font-sans text-2xs tracking-[0.12em] uppercase text-text-secondary min-w-0",
        className,
      )}
    >
      <span className="font-medium text-text-primary">{username}</span>
      <span className="text-text-secondary normal-case"> {verb}</span>
    </p>
  );
}
