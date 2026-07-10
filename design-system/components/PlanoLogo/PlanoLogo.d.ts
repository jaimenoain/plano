import type { SVGProps } from 'react';

export interface PlanoLogoProps extends Omit<SVGProps<SVGSVGElement>, 'color'> {
  /** Rendered height. Number = px; string = any CSS length. Default 20. */
  size?: number | string;
  /** Overrides `currentColor`. Prefer inheriting from the container instead. */
  color?: string;
}

/** Plano wordmark — geometric letterform, inherits `currentColor`. */
export declare function PlanoLogo(props: PlanoLogoProps): JSX.Element;
