// Design-sync Tailwind config: extends the app config but SAFELISTS the full
// token utility vocabulary so the shipped styles.css carries every token class
// (bg-/text-/border-/ring- for each semantic token) even if the app itself
// doesn't use it — designs built in Claude Design must be able to use the whole
// palette. Also scans the authored previews. Used by cfg.buildCmd.
import base from '../tailwind.config';

const TOKENS = [
  'brand-primary', 'brand-primary-hover', 'brand-primary-foreground',
  'brand-secondary', 'brand-secondary-foreground',
  'brand-accent', 'brand-accent-hover', 'brand-accent-foreground',
  'surface-default', 'surface-card', 'surface-overlay', 'surface-muted', 'surface-inverse',
  'border-default', 'border-strong', 'border-hairline',
  'text-primary', 'text-secondary', 'text-disabled', 'text-inverse',
  'feedback-success', 'feedback-warning',
  'feedback-destructive', 'feedback-destructive-foreground',
].join('|');

const ALIASES = 'primary|secondary|card|popover|muted|accent|destructive|background|foreground|border|input|ring';

export default {
  ...(base as any),
  content: ['./src/**/*.{ts,tsx}', './.design-sync/previews/**/*.{ts,tsx}'],
  safelist: [
    { pattern: new RegExp(`^(bg|text|border|ring|fill|stroke|from|to|via)-(${TOKENS})$`), variants: ['hover', 'focus', 'active', 'disabled'] },
    { pattern: new RegExp(`^(bg|text|border|ring)-(${ALIASES})(-foreground)?$`), variants: ['hover', 'focus'] },
  ],
};
