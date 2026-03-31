import { jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
const alertVariants = cva("relative w-full rounded-sm border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-text-primary", {
    variants: {
        variant: {
            default: "bg-surface-card text-text-primary",
            destructive: "border-feedback-destructive/50 text-feedback-destructive [&>svg]:text-feedback-destructive",
            success: "border-feedback-success/50 text-feedback-success [&>svg]:text-feedback-success",
            warning: "border-feedback-warning/50 text-feedback-warning [&>svg]:text-feedback-warning",
        },
    },
    defaultVariants: { variant: "default" },
});
const Alert = React.forwardRef(({ className, variant, ...props }, ref) => (_jsx("div", { ref: ref, role: "alert", className: cn(alertVariants({ variant }), className), ...props })));
Alert.displayName = "Alert";
const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (_jsx("h5", { ref: ref, className: cn("mb-1 font-semibold leading-none tracking-tight text-text-primary", className), ...props })));
AlertTitle.displayName = "AlertTitle";
const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (_jsx("div", { ref: ref, className: cn("text-sm text-text-secondary [&_p]:leading-relaxed", className), ...props })));
AlertDescription.displayName = "AlertDescription";
export { Alert, AlertTitle, AlertDescription };
