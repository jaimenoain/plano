import type { ReactNode } from "react";
import { Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Editorial page head for add/edit building flows (matches SubmitEvent / building detail tone). */
export function BuildingPageHeader({
  eyebrow = "Building",
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="space-y-2">
      <p className="eyebrow tracking-widest">{eyebrow}</p>
      <h1 className="text-3xl font-bold tracking-tight leading-tight text-text-primary md:text-4xl">
        {title}
      </h1>
      {description ? <p className="text-sm text-text-secondary">{description}</p> : null}
    </header>
  );
}

export function BuildingFormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "space-y-4 border-t border-border-default pt-8 first:border-t-0 first:pt-0",
        className,
      )}
    >
      <div className="space-y-1">
        <h2 className="eyebrow tracking-widest">{title}</h2>
        {description ? <p className="text-sm text-text-secondary">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function BuildingFormLabel({
  children,
  htmlFor,
  className,
}: {
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("eyebrow tracking-widest", className)}
    >
      {children}
    </label>
  );
}

/**
 * Create-mode reassurance: every detail field is optional, so a user who only
 * knows the location can bail out here. Rendered inside the form, so the
 * `type="submit"` button runs the same validation + save as the footer.
 */
export function OptionalDetailsSkipBanner({ isSubmitting }: { isSubmitting: boolean }) {
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-sm border border-border-default bg-surface-muted p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary">Only a name is required</p>
          <p className="text-xs text-text-secondary">
            Add any details you know — or skip them and save now. You can always edit later.
          </p>
        </div>
      </div>
      <Button
        type="submit"
        variant="outline"
        disabled={isSubmitting}
        className="shrink-0 self-start sm:self-auto"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-text-secondary" />
            Saving...
          </>
        ) : (
          "Skip for now"
        )}
      </Button>
    </div>
  );
}

/** Sticky action bar (Cancel + submit) shared by the add/edit building forms. */
export function BuildingFormActions({
  mode,
  isDirty,
  onCancel,
  isSubmitting,
  submitLabel,
}: {
  mode: "create" | "edit";
  isDirty: boolean;
  onCancel?: () => void;
  isSubmitting: boolean;
  submitLabel: string;
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex items-center justify-end gap-3 border-t border-border-default bg-surface-default/95 px-4 py-3 backdrop-blur-xs">
      {mode === "edit" && !isDirty && (
        <span className="mr-auto text-xs text-text-secondary">No changes to save</span>
      )}
      {onCancel && (
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
      )}
      <Button
        type="submit"
        variant="default"
        disabled={isSubmitting || (mode === "edit" && !isDirty)}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-text-secondary" />
            Saving...
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </div>
  );
}

/** Bordered panel for map + location controls (no Card shadow stack). */
export function BuildingFormPanel({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-sm border border-border-default bg-surface-default", className)}>
      {title ? (
        <div className="border-b border-border-default px-4 py-3">
          <p className="eyebrow tracking-widest">{title}</p>
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </div>
  );
}
