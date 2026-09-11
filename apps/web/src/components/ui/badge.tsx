import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
}

const variantStyles = {
  default: "bg-surface-elevated text-text border-transparent",
  success: "bg-income/20 text-income border-transparent",
  warning: "bg-warning/20 text-warning border-transparent",
  danger: "bg-expense/20 text-expense border-transparent",
  info: "bg-primary/20 text-primary border-transparent",
  outline: "bg-transparent text-text border-surface-elevated"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary", variantStyles[variant], className)} {...props} />
  )
}

export { Badge }
