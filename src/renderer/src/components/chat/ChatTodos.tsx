import { CheckCircle2, Circle, Clock, XCircle, ListTodo } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Todo } from '@/types'

interface ChatTodosProps {
  todos: Todo[]
}

const STATUS_CONFIG = {
  pending: {
    icon: Circle,
    color: 'text-muted-foreground'
  },
  in_progress: {
    icon: Clock,
    color: 'text-status-info'
  },
  completed: {
    icon: CheckCircle2,
    color: 'text-status-nominal'
  },
  cancelled: {
    icon: XCircle,
    color: 'text-muted-foreground'
  }
}

export function ChatTodos({ todos }: ChatTodosProps): React.JSX.Element | null {
  if (todos.length === 0) return null

  // Separate active and completed todos
  const activeTodos = todos.filter((t) => t.status === 'in_progress' || t.status === 'pending')
  const completedCount = todos.filter((t) => t.status === 'completed').length
  const totalCount = todos.length

  // Calculate progress
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="rounded-sm border border-border bg-background-elevated overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <ListTodo className="size-4 text-status-info" />
        <span className="text-xs font-medium">Agent Tasks</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {completedCount}/{totalCount}
        </span>
        {/* Mini progress bar */}
        <div className="w-16 h-1 rounded-full bg-background overflow-hidden">
          <div
            className="h-full bg-status-nominal transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Active todos */}
      {activeTodos.length > 0 && (
        <div className="px-3 py-2 space-y-1.5">
          {activeTodos.map((todo) => {
            const config = STATUS_CONFIG[todo.status]
            const Icon = config.icon
            return (
              <div key={todo.id} className="flex items-start gap-2 text-xs">
                <Icon className={cn('size-3.5 mt-0.5 shrink-0', config.color)} />
                <span>{todo.content}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Completed summary (collapsed) */}
      {completedCount > 0 && activeTodos.length > 0 && (
        <div className="px-3 py-1.5 text-xs text-muted-foreground border-t border-border bg-background">
          {completedCount} task{completedCount !== 1 ? 's' : ''} completed
        </div>
      )}
    </div>
  )
}
