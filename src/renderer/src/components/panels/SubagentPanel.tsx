import { Bot, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import type { Subagent } from '@/types'

export function SubagentPanel() {
  const { subagents } = useAppStore()

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <span className="text-section-header">SUBAGENTS</span>
          <Badge variant="outline">{subagents.length} TASKS</Badge>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-3">
          {subagents.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              <Bot className="size-8 mx-auto mb-2 opacity-50" />
              No subagent tasks
              <div className="text-xs mt-1">
                Subagents will appear here when spawned
              </div>
            </div>
          ) : (
            subagents.map((subagent) => (
              <SubagentCard key={subagent.id} subagent={subagent} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function SubagentCard({ subagent }: { subagent: Subagent }) {
  const getStatusConfig = () => {
    switch (subagent.status) {
      case 'pending':
        return { icon: Clock, badge: 'outline' as const, label: 'PENDING' }
      case 'running':
        return { icon: Loader2, badge: 'info' as const, label: 'RUNNING' }
      case 'completed':
        return { icon: CheckCircle2, badge: 'nominal' as const, label: 'DONE' }
      case 'failed':
        return { icon: XCircle, badge: 'critical' as const, label: 'FAILED' }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="size-4 text-status-info" />
            {subagent.name}
          </CardTitle>
          <Badge variant={config.badge}>
            <Icon className={cn("size-3 mr-1", subagent.status === 'running' && "animate-spin")} />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{subagent.description}</p>
        {subagent.startedAt && (
          <div className="mt-2 text-xs text-muted-foreground">
            Started: {new Date(subagent.startedAt).toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
