import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface MichelinRatingInputProps {
  value: number
  onChange: (value: number) => void
  className?: string
  disabled?: boolean
}

export function MichelinRatingInput({
  value,
  onChange,
  className,
  disabled
}: MichelinRatingInputProps) {
  const [hovered, setHovered] = React.useState<number | null>(null)

  return (
    <div className={cn("flex items-center gap-4", className)}>
      {[1, 2, 3].map((rating) => {
        const isActive = hovered !== null ? rating <= hovered : rating <= value

        return (
          <motion.button
            key={rating}
            type="button"
            disabled={disabled}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              if (disabled) return
              if (value === rating) {
                onChange(0)
              } else {
                onChange(rating)
              }
            }}
            onMouseEnter={() => !disabled && setHovered(rating)}
            onMouseLeave={() => !disabled && setHovered(null)}
            className="rounded-sm p-1 focus:outline-none transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
          >
             <RatingCircle active={isActive} />
          </motion.button>
        )
      })}
    </div>
  )
}

function RatingCircle({ active }: { active: boolean }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            className={cn(
              "transition-colors duration-200",
              active
                ? "fill-brand-primary stroke-brand-primary"
                : "fill-transparent stroke-text-disabled"
            )}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
        >
            <circle cx="12" cy="12" r="10" />
        </svg>
    )
}
