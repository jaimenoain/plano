import { jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
const buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", {
    variants: {
        variant: {
            default: "bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover",
            destructive: "bg-feedback-destructive text-feedback-destructive-foreground hover:opacity-90",
            outline: "border border-border-default bg-surface-card hover:bg-surface-muted hover:text-text-primary",
            secondary: "bg-brand-secondary text-brand-secondary-foreground border border-border-default hover:bg-brand-secondary/80",
            ghost: "hover:bg-surface-muted hover:text-text-primary",
            link: "text-text-primary underline-offset-4 hover:underline",
        },
        size: {
            default: "h-10 px-4 py-2",
            sm: "h-8 px-3 py-1",
            lg: "h-12 px-6 py-3",
            icon: "h-10 w-10",
            "icon-sm": "h-8 w-8 p-2",
            "icon-md": "h-10 w-10 p-2",
        },
    },
    defaultVariants: {
        variant: "default",
        size: "default",
    },
});
const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return _jsx(Comp, { className: cn(buttonVariants({ variant, size, className })), ref: ref, ...props });
});
Button.displayName = "Button";
export { Button, buttonVariants };
