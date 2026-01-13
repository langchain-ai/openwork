import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-[3px] border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-colors duration-150 overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-foreground [a&]:hover:bg-destructive/90",
        outline:
          "text-foreground border-border [a&]:hover:bg-background-interactive",
        // Status variants for tactical UI
        critical:
          "border-status-critical/30 bg-status-critical/15 text-status-critical",
        warning:
          "border-status-warning/30 bg-status-warning/15 text-status-warning",
        nominal:
          "border-status-nominal/30 bg-status-nominal/15 text-status-nominal",
        info:
          "border-status-info/30 bg-status-info/15 text-status-info",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
