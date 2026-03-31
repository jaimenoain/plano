import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium uppercase tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:     "border-border-default bg-surface-muted text-text-primary",
        brand:       "border-transparent bg-brand-secondary text-brand-secondary-foreground",
        secondary:   "border-border-default bg-surface-muted text-text-secondary",
        success:     "border-transparent bg-feedback-success/10 text-feedback-success",
        warning:     "border-transparent bg-feedback-warning/10 text-feedback-warning",
        destructive: "border-transparent bg-feedback-destructive/10 text-feedback-destructive",
        outline:     "border-border-default text-text-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />;
  }
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
