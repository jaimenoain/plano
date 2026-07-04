import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group z-1200"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-surface-card group-[.toaster]:text-text-primary group-[.toaster]:border group-[.toaster]:border-border-default group-[.toaster]:shadow-lg group-[.toaster]:rounded-md group-[.toaster]:max-w-sm",
          title:
            "group-[.toast]:text-sm group-[.toast]:font-semibold group-[.toast]:text-text-primary",
          description:
            "group-[.toast]:text-sm group-[.toast]:text-text-secondary",
          actionButton:
            "group-[.toast]:bg-brand-primary group-[.toast]:text-brand-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-surface-muted group-[.toast]:text-text-secondary",
          success:
            "group-[.toaster]:border-l-4 group-[.toaster]:border-l-feedback-success",
          warning:
            "group-[.toaster]:border-l-4 group-[.toaster]:border-l-feedback-warning",
          error:
            "group-[.toaster]:border-l-4 group-[.toaster]:border-l-feedback-destructive",
          info:
            "group-[.toaster]:border-l-4 group-[.toaster]:border-l-brand-primary",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
