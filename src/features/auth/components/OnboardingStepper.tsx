/**
 * The onboarding progress indicator
 * (`design-system/ui_kits/web/screens/onboarding.html`, `.ob-steps`): a row of
 * short bars, the completed/current ones inked black. Pure presentational.
 *
 * @param total   how many steps exist
 * @param current 1-based index of the active step; bars 1..current are inked
 */
export function OnboardingStepper({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  return (
    <div
      className="flex items-center justify-center gap-1.5"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current}
      aria-label={`Step ${current} of ${total}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          data-active={i < current ? "true" : undefined}
          className={
            i < current
              ? "h-[3px] w-[34px] rounded-sm bg-text-primary"
              : "h-[3px] w-[34px] rounded-sm bg-border-default"
          }
        />
      ))}
    </div>
  );
}
