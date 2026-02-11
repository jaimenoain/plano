"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface SegmentedControlProps {
  options: {
    label: string
    value: string
  }[]
  value: string
  onValueChange: (value: string) => void
  className?: string
  name?: string
}

export function SegmentedControl({
  options,
  value,
  onValueChange,
  className,
  name,
}: SegmentedControlProps) {
  const uniqueId = React.useId()
  const layoutId = name ? `segmented-control-${name}` : `segmented-control-${uniqueId}`

  return (
    <div
      className={cn(
        "flex h-9 w-full items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
        className
      )}
      role="group"
    >
      {options.map((option) => {
        const isActive = value === option.value
        return (
          <button
            key={option.value}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "relative z-10 flex-1 px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
              isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            type="button"
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 z-[-1] rounded-md bg-primary shadow-sm"
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                }}
              />
            )}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
