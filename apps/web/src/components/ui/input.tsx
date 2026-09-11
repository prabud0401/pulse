import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-sm font-medium text-text mb-1">{label}</label>}
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-surface-elevated bg-surface px-3 py-2 text-sm text-text file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-expense focus-visible:ring-expense",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-expense">{error}</p>}
        {helperText && !error && <p className="mt-1 text-sm text-text-muted">{helperText}</p>}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
