import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const variantStyles = {
  default: "bg-surface-elevated text-text",
  success: "bg-income/20 text-income",
  warning: "bg-warning/20 text-warning",
  danger: "bg-expense/20 text-expense",
  info: "bg-primary/20 text-primary"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary border-transparent", variantStyles[variant], className)} {...props} />
  )
}

export { Badge }
