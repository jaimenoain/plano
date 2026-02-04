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
    <div className={cn("flex gap-4 items-center", className)}>
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
            className="focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed p-1 rounded-full hover:bg-muted/20 transition-colors"
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
                  ? "fill-primary stroke-primary"
                  : "fill-transparent stroke-muted-foreground/50"
            )}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ strokeWidth: 1.5 }}
        >
            <circle cx="12" cy="12" r="10" />
        </svg>
    )
}
