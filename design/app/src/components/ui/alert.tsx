import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-[3px] border-l-4 border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "bg-card border-border border-l-border text-card-foreground",
        destructive:
          "border-status-critical/30 border-l-status-critical bg-status-critical/10 text-foreground [&>svg]:text-status-critical",
        // Status variants for tactical UI
        critical:
          "border-status-critical/30 border-l-status-critical bg-status-critical/10 text-foreground [&>svg]:text-status-critical",
        warning:
          "border-status-warning/30 border-l-status-warning bg-status-warning/10 text-foreground [&>svg]:text-status-warning",
        nominal:
          "border-status-nominal/30 border-l-status-nominal bg-status-nominal/10 text-foreground [&>svg]:text-status-nominal",
        info:
          "border-status-info/30 border-l-status-info bg-status-info/10 text-foreground [&>svg]:text-status-info",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 text-[11px] font-semibold uppercase tracking-[0.1em]",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
