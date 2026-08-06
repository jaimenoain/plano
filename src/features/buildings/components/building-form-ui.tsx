/**
 * Design pre-flight (.cursor/rules/03-frontend.mdc) — shared add/edit building kit.
 *
 * 1. Content width: the kit sets no measure of its own; the host page owns it
 *    (Edit and Add building both use `max-w-4xl`) because both embed a map
 *    picker alongside field groups. Individual inputs keep their own
 *    content-type caps at the call sites. See COMPONENT_SPEC.md §5.
 * 2. Action density: one action row per form, rendered once — text labels
 *    ("Cancel", "Update Building") are correct here, not icon-only buttons.
 * 3. Destructive actions: none in this kit. Credit removal lives in
 *    BuildingCredits and keeps its own hover-reveal treatment.
 * 4. Input width discipline: no inputs are declared here. `BuildingFormSection`
 *    applies no width to its children, so it can never stretch a field.
 * 5. Status signals: none. "No changes to save" is inline helper text in the
 *    action row, not a Badge — it describes the form, not a list item.
 */
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

/**
 * One logical section of an add/edit building form.
 *
 * The title is a real sub-header, not an `.eyebrow` — nine 10px uppercase
 * whispers down one column is why these pages read as undifferentiated. Sizing
 * follows the "Card title (h3)" row of the DESIGN_TOKENS.md §9 matrix, the
 * nearest sanctioned pairing for a subsection header; the matrix's `text-3xl`
 * "Section heading" is a display size and would be absurd repeated nine times.
 *
 * `title` is optional: a section whose child already renders its own heading
 * (BuildingCredits) passes only a description, so the page never stacks two
 * headings with the same text.
 */
export function BuildingFormSection({
  title,
  description,
  children,
  className,
}: {
  title?: string;
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
      {title || description ? (
        <div className="space-y-1">
          {title ? (
            <h2 className="text-xl font-semibold tracking-tight leading-snug text-text-primary md:text-2xl">
              {title}
            </h2>
          ) : null}
          {description ? <p className="text-sm text-text-secondary">{description}</p> : null}
        </div>
      ) : null}
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

/**
 * Sticky action bar (Cancel + submit) shared by the add/edit building forms.
 *
 * The bar deliberately does NOT bleed past its container. It used to pull out
 * with `-mx-4`, which silently assumed every host padded by exactly `p-4`:
 * true for Add building (`px-4`), false for Edit building (`p-4 sm:p-6 lg:p-8`),
 * where the bar ended up inset by 8–16px and aligned with nothing. Tracking the
 * ladder instead just moves the bug to whichever host pads differently, so the
 * bar now spans its content column and is correct under any host padding.
 *
 * `flex-wrap` keeps the hint and both buttons on screen at 320px.
 * `justify-end` is fixed by COMPONENT_SPEC.md §5 and must not vary.
 */
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
    <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-3 gap-y-2 border-t border-border-default bg-surface-default/95 py-3 backdrop-blur-xs">
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
