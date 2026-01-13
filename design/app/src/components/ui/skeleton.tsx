import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-background-interactive animate-tactical-pulse rounded-[3px]", className)}
      {...props}
    />
  )
}

export { Skeleton }
