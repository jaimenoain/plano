import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type PlanoLogoProps = HTMLAttributes<HTMLSpanElement>;

export const PlanoLogo = ({ className, ...props }: PlanoLogoProps) => {
  return (
    <span
      className={cn("inline-block font-bold uppercase tracking-tight", className)}
      {...props}
    >
      PLANO
    </span>
  );
};
