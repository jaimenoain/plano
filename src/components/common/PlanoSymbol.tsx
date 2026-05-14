import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

type PlanoSymbolProps = SVGProps<SVGSVGElement>;

export const PlanoSymbol = ({ className, ...props }: PlanoSymbolProps) => {
  return (
    <svg
      viewBox="0 0 55 75"
      className={cn("inline-block h-[1em] w-auto shrink-0 align-middle", className)}
      role="img"
      aria-label="Plano Symbol"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fill="currentColor"
        fillRule="nonzero"
        d="M 0 73.731 L 0 0.977 L 28.369 0.977 Q 36.67 0.977 42.48 4.127 Q 48.291 7.276 51.343 12.818 Q 54.395 18.36 54.395 25.538 Q 54.395 32.765 51.294 38.258 Q 48.193 43.751 42.31 46.852 Q 36.426 49.952 28.027 49.952 L 14.893 49.952 L 14.893 73.731 L 0 73.731 Z"
      />
    </svg>
  );
};
