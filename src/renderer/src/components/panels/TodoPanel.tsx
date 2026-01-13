import { CheckCircle2, Circle, Clock, XCircle } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { Todo } from '@/types'

const STATUS_CONFIG = {
  pending: {
    icon: Circle,
    badge: 'outline' as const,
    label: 'PENDING',
    color: 'text-muted-foreground'
  },
  in_progress: {
    icon: Clock,
    badge: 'info' as const,
    label: 'IN PROGRESS',
    color: 'text-status-info'
  },
  completed: {
    icon: CheckCircle2,
    badge: 'nominal' as const,
    label: 'DONE',
    color: 'text-status-nominal'
  },
  cancelled: {
    icon: XCircle,
    badge: 'critical' as const,
    label: 'CANCELLED',
    color: 'text-muted-foreground'
  }
}

export function TodoPanel() {
  const { todos } = useAppStore()

  // Group todos by status
  const inProgress = todos.filter(t => t.status === 'in_progress')
  const pending = todos.filter(t => t.status === 'pending')
  const completed = todos.filter(t => t.status === 'completed')
  const cancelled = todos.filter(t => t.status === 'cancelled')

  const allTodos = [...inProgress, ...pending, ...completed, ...cancelled]

  // Calculate progress
  const total = todos.length
  const done = completed.length
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="flex flex-col h-full">
      {/* Progress Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-section-header">PROGRESS</span>
          <span className="text-data text-sm">{done}/{total}</span>
        </div>
        <div className="h-1.5 rounded-full bg-background overflow-hidden">
          <div 
            className="h-full bg-status-nominal transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Todo List */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-2">
          {allTodos.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              No tasks yet
            </div>
          ) : (
            allTodos.map((todo) => (
              <TodoItem key={todo.id} todo={todo} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function TodoItem({ todo }: { todo: Todo }) {
  const config = STATUS_CONFIG[todo.status]
  const Icon = config.icon

  return (
    <div className={cn(
      "flex items-start gap-3 rounded-sm border border-border p-3 transition-colors",
      todo.status === 'completed' && "opacity-60",
      todo.status === 'cancelled' && "opacity-40"
    )}>
      <Icon className={cn("size-4 shrink-0 mt-0.5", config.color)} />
      <div className="flex-1 min-w-0">
        <div className={cn(
          "text-sm",
          (todo.status === 'completed' || todo.status === 'cancelled') && "line-through"
        )}>
          {todo.content}
        </div>
      </div>
      <Badge variant={config.badge} className="shrink-0">
        {config.label}
      </Badge>
    </div>
  )
}
