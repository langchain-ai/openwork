import {
  Bot,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  Search,
  FileCheck
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/lib/store"
import { useThreadState } from "@/lib/thread-context"
import type { Subagent } from "@/types"

// Icon component for subagent type (avoid creating components during render)
function SubagentTypeIcon({
  subagentType,
  className
}: {
  subagentType?: string
  className?: string
}): React.JSX.Element {
  switch (subagentType) {
    case "correctness-checker":
      return <FileCheck className={className} />
    case "final-reviewer":
      return <Search className={className} />
    case "research":
      return <Search className={className} />
    default:
      return <Sparkles className={className} />
  }
}

// Get badge variant for subagent type
function getSubagentTypeBadge(subagentType?: string): string {
  switch (subagentType) {
    case "correctness-checker":
      return "CHECKER"
    case "final-reviewer":
      return "REVIEWER"
    case "research":
      return "RESEARCH"
    case "general-purpose":
      return "GENERAL"
    default:
      return subagentType?.toUpperCase() || "TASK"
  }
}

export function SubagentPanel(): React.JSX.Element {
  const { currentThreadId } = useAppStore()
  const threadState = useThreadState(currentThreadId)
  const subagents = threadState?.subagents ?? []

  // Count by status
  const runningCount = subagents.filter((s) => s.status === "running").length
  const completedCount = subagents.filter((s) => s.status === "completed").length

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <span className="text-section-header">SUBAGENTS</span>
          <div className="flex items-center gap-2">
            {runningCount > 0 && (
              <Badge variant="info">
                <Loader2 className="size-3 mr-1 animate-spin" />
                {runningCount} ACTIVE
              </Badge>
            )}
            <Badge variant="outline">{subagents.length} TOTAL</Badge>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-3">
          {subagents.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              <Bot className="size-8 mx-auto mb-2 opacity-50" />
              No subagent tasks
              <div className="text-xs mt-1">Subagents will appear here when spawned</div>
            </div>
          ) : (
            subagents.map((subagent) => <SubagentCard key={subagent.id} subagent={subagent} />)
          )}
        </div>
      </ScrollArea>

      {/* Summary footer when there are completed subagents */}
      {completedCount > 0 && (
        <div className="p-3 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="size-3 text-status-nominal" />
              {completedCount} completed
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function SubagentCard({ subagent }: { subagent: Subagent }): React.JSX.Element {
  const getStatusConfig = (): {
    icon: React.ElementType
    badge: "outline" | "info" | "nominal" | "critical"
    label: string
  } => {
    switch (subagent.status) {
      case "pending":
        return { icon: Clock, badge: "outline" as const, label: "PENDING" }
      case "running":
        return { icon: Loader2, badge: "info" as const, label: "RUNNING" }
      case "completed":
        return { icon: CheckCircle2, badge: "nominal" as const, label: "DONE" }
      case "failed":
        return { icon: XCircle, badge: "critical" as const, label: "FAILED" }
    }
  }

  const config = getStatusConfig()
  const StatusIcon = config.icon

  // Calculate duration only for completed subagents (to avoid impure Date.now() during render)
  const getDuration = (): string | null => {
    if (!subagent.startedAt || !subagent.completedAt) return null
    const start = new Date(subagent.startedAt).getTime()
    const end = new Date(subagent.completedAt).getTime()
    const durationMs = end - start
    if (durationMs < 1000) return `${durationMs}ms`
    if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`
    return `${(durationMs / 60000).toFixed(1)}m`
  }

  const duration = getDuration()

  return (
    <Card className={cn(subagent.status === "running" && "border-status-info/50")}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium truncate">
            <SubagentTypeIcon
              subagentType={subagent.subagentType}
              className={cn(
                "size-4 shrink-0",
                subagent.status === "running" ? "text-status-info" : "text-muted-foreground"
              )}
            />
            <span className="truncate">{subagent.name}</span>
          </CardTitle>
          <Badge variant={config.badge} className="shrink-0">
            <StatusIcon
              className={cn("size-3 mr-1", subagent.status === "running" && "animate-spin")}
            />
            {config.label}
          </Badge>
        </div>
        {subagent.subagentType && (
          <Badge variant="outline" className="w-fit text-[10px] mt-1">
            {getSubagentTypeBadge(subagent.subagentType)}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground line-clamp-2">{subagent.description}</p>
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          {subagent.startedAt && (
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {new Date(subagent.startedAt).toLocaleTimeString()}
            </span>
          )}
          {duration && (
            <span className="flex items-center gap-1">
              {subagent.status === "running" ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <CheckCircle2 className="size-3" />
              )}
              {duration}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
