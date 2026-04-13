import { cn } from "@/lib/utils";

export interface ActivityLeadProps {
  username: string;
  verb: string;
  hideUser?: boolean;
  /** When true, render `@{username}` (leading `@` stripped if already present). */
  usernameWithAt?: boolean;
  className?: string;
}

/**
 * Stream meta line: `{username} {verb}` — 10px uppercase, username emphasized.
 */
export function ActivityLead({
  username,
  verb,
  hideUser,
  usernameWithAt = false,
  className,
}: ActivityLeadProps) {
  if (hideUser) return null;
  const label = usernameWithAt
    ? `@${username.startsWith("@") ? username.slice(1) : username}`
    : username;
  return (
    <p
      className={cn(
        "min-w-0 line-clamp-1 font-sans text-2xs uppercase tracking-[0.12em] text-text-secondary",
        className,
      )}
    >
      <span className="font-medium text-text-primary">{label}</span>
      <span className="text-text-secondary normal-case"> {verb}</span>
    </p>
  );
}
