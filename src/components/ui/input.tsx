import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-sm border border-border-default bg-surface-muted px-3 py-2 text-sm text-text-primary file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-text-primary placeholder:text-text-disabled focus-visible:outline-hidden focus-visible:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-0 hover:border-border-strong hover:shadow-xs disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
