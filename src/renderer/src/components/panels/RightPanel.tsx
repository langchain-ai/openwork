import { useState, useRef, useCallback, useEffect } from 'react'
import { ListTodo, FolderTree, GitBranch, ChevronRight, CheckCircle2, Circle, Clock, XCircle, GripHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import { Badge } from '@/components/ui/badge'
import type { Todo } from '@/types'

const HEADER_HEIGHT = 40 // px
const HANDLE_HEIGHT = 6 // px
const MIN_CONTENT_HEIGHT = 60 // px
const COLLAPSE_THRESHOLD = 55 // px - auto-collapse when below this

interface SectionHeaderProps {
  title: string
  icon: React.ElementType
  badge?: number
  isOpen: boolean
  onToggle: () => void
}

function SectionHeader({ title, icon: Icon, badge, isOpen, onToggle }: SectionHeaderProps) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 px-3 py-2.5 text-section-header hover:bg-background-interactive transition-colors shrink-0 w-full"
      style={{ height: HEADER_HEIGHT }}
    >
      <ChevronRight 
        className={cn(
          "size-3.5 text-muted-foreground transition-transform duration-200",
          isOpen && "rotate-90"
        )} 
      />
      <Icon className="size-4" />
      <span className="flex-1 text-left">{title}</span>
      {badge !== undefined && badge > 0 && (
        <span className="text-[10px] text-muted-foreground tabular-nums">{badge}</span>
      )}
    </button>
  )
}

interface ResizeHandleProps {
  onDrag: (delta: number) => void
}

function ResizeHandle({ onDrag }: ResizeHandleProps) {
  const startYRef = useRef<number>(0)
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    startYRef.current = e.clientY
    
    const handleMouseMove = (e: MouseEvent) => {
      // Calculate total delta from drag start
      const totalDelta = e.clientY - startYRef.current
      onDrag(totalDelta)
    }
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }, [onDrag])

  return (
    <div
      onMouseDown={handleMouseDown}
      className="group bg-border/50 hover:bg-primary/30 active:bg-primary/50 transition-colors cursor-row-resize flex items-center justify-center shrink-0 select-none"
      style={{ height: HANDLE_HEIGHT }}
    >
      <GripHorizontal className="size-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  )
}

export function RightPanel() {
  const { todos, workspaceFiles, subagents } = useAppStore()
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [tasksOpen, setTasksOpen] = useState(true)
  const [filesOpen, setFilesOpen] = useState(true)
  const [agentsOpen, setAgentsOpen] = useState(true)
  
  // Store content heights in pixels (null = auto/equal distribution)
  const [tasksHeight, setTasksHeight] = useState<number | null>(null)
  const [filesHeight, setFilesHeight] = useState<number | null>(null)
  const [agentsHeight, setAgentsHeight] = useState<number | null>(null)
  
  // Track drag start heights
  const dragStartHeights = useRef<{ tasks: number; files: number; agents: number } | null>(null)

  // Calculate available content height
  const getAvailableContentHeight = useCallback(() => {
    if (!containerRef.current) return 0
    const totalHeight = containerRef.current.clientHeight
    
    // Subtract headers (always visible)
    let used = HEADER_HEIGHT * 3
    
    // Subtract handles (only between open panels)
    if (tasksOpen && (filesOpen || agentsOpen)) used += HANDLE_HEIGHT
    if (filesOpen && agentsOpen) used += HANDLE_HEIGHT
    
    return Math.max(0, totalHeight - used)
  }, [tasksOpen, filesOpen, agentsOpen])

  // Get current heights for each panel's content area
  const getContentHeights = useCallback(() => {
    const available = getAvailableContentHeight()
    const openCount = [tasksOpen, filesOpen, agentsOpen].filter(Boolean).length
    
    if (openCount === 0) {
      return { tasks: 0, files: 0, agents: 0 }
    }
    
    const defaultHeight = available / openCount
    
    return {
      tasks: tasksOpen ? (tasksHeight ?? defaultHeight) : 0,
      files: filesOpen ? (filesHeight ?? defaultHeight) : 0,
      agents: agentsOpen ? (agentsHeight ?? defaultHeight) : 0,
    }
  }, [getAvailableContentHeight, tasksOpen, filesOpen, agentsOpen, tasksHeight, filesHeight, agentsHeight])

  // Handle resize between tasks and the next open section
  const handleTasksResize = useCallback((totalDelta: number) => {
    if (!dragStartHeights.current) {
      const heights = getContentHeights()
      dragStartHeights.current = { ...heights }
    }
    
    const start = dragStartHeights.current
    const available = getAvailableContentHeight()
    
    // Determine which panel is being resized against
    const otherStart = filesOpen ? start.files : start.agents
    
    // Calculate new heights with proper clamping
    let newTasksHeight = start.tasks + totalDelta
    let newOtherHeight = otherStart - totalDelta
    
    // Clamp both to min height
    if (newTasksHeight < MIN_CONTENT_HEIGHT) {
      newTasksHeight = MIN_CONTENT_HEIGHT
      newOtherHeight = otherStart + (start.tasks - MIN_CONTENT_HEIGHT)
    }
    if (newOtherHeight < MIN_CONTENT_HEIGHT) {
      newOtherHeight = MIN_CONTENT_HEIGHT
      newTasksHeight = start.tasks + (otherStart - MIN_CONTENT_HEIGHT)
    }
    
    // Ensure total doesn't exceed available (accounting for third panel if open)
    const thirdPanelHeight = filesOpen && agentsOpen ? (agentsHeight ?? (available / 3)) : 0
    const maxForTwo = available - thirdPanelHeight
    if (newTasksHeight + newOtherHeight > maxForTwo) {
      const excess = (newTasksHeight + newOtherHeight) - maxForTwo
      if (totalDelta > 0) {
        newOtherHeight = Math.max(MIN_CONTENT_HEIGHT, newOtherHeight - excess)
      } else {
        newTasksHeight = Math.max(MIN_CONTENT_HEIGHT, newTasksHeight - excess)
      }
    }
    
    setTasksHeight(newTasksHeight)
    if (filesOpen) {
      setFilesHeight(newOtherHeight)
    } else if (agentsOpen) {
      setAgentsHeight(newOtherHeight)
    }
    
    // Auto-collapse if below threshold
    if (newTasksHeight < COLLAPSE_THRESHOLD) {
      setTasksOpen(false)
    }
    if (newOtherHeight < COLLAPSE_THRESHOLD) {
      if (filesOpen) setFilesOpen(false)
      else if (agentsOpen) setAgentsOpen(false)
    }
  }, [getContentHeights, getAvailableContentHeight, filesOpen, agentsOpen, agentsHeight])

  // Handle resize between files and agents
  const handleFilesResize = useCallback((totalDelta: number) => {
    if (!dragStartHeights.current) {
      const heights = getContentHeights()
      dragStartHeights.current = { ...heights }
    }
    
    const start = dragStartHeights.current
    const available = getAvailableContentHeight()
    const tasksH = tasksOpen ? (tasksHeight ?? (available / 3)) : 0
    const maxForFilesAndAgents = available - tasksH
    
    // Calculate new heights with proper clamping
    let newFilesHeight = start.files + totalDelta
    let newAgentsHeight = start.agents - totalDelta
    
    // Clamp both to min height
    if (newFilesHeight < MIN_CONTENT_HEIGHT) {
      newFilesHeight = MIN_CONTENT_HEIGHT
      newAgentsHeight = start.agents + (start.files - MIN_CONTENT_HEIGHT)
    }
    if (newAgentsHeight < MIN_CONTENT_HEIGHT) {
      newAgentsHeight = MIN_CONTENT_HEIGHT
      newFilesHeight = start.files + (start.agents - MIN_CONTENT_HEIGHT)
    }
    
    // Ensure total doesn't exceed available
    if (newFilesHeight + newAgentsHeight > maxForFilesAndAgents) {
      const excess = (newFilesHeight + newAgentsHeight) - maxForFilesAndAgents
      if (totalDelta > 0) {
        newAgentsHeight = Math.max(MIN_CONTENT_HEIGHT, newAgentsHeight - excess)
      } else {
        newFilesHeight = Math.max(MIN_CONTENT_HEIGHT, newFilesHeight - excess)
      }
    }
    
    setFilesHeight(newFilesHeight)
    setAgentsHeight(newAgentsHeight)
    
    // Auto-collapse if below threshold
    if (newFilesHeight < COLLAPSE_THRESHOLD) {
      setFilesOpen(false)
    }
    if (newAgentsHeight < COLLAPSE_THRESHOLD) {
      setAgentsOpen(false)
    }
  }, [getContentHeights, getAvailableContentHeight, tasksOpen, tasksHeight])

  // Reset drag start on mouse up
  useEffect(() => {
    const handleMouseUp = () => {
      dragStartHeights.current = null
    }
    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [])

  // Reset heights when panels open/close to redistribute
  useEffect(() => {
    setTasksHeight(null)
    setFilesHeight(null)
    setAgentsHeight(null)
  }, [tasksOpen, filesOpen, agentsOpen])

  const heights = getContentHeights()

  return (
    <aside 
      ref={containerRef}
      className="flex h-full w-[320px] flex-col border-l border-border bg-sidebar overflow-hidden"
    >
      {/* TASKS */}
      <div className="flex flex-col shrink-0 border-b border-border">
        <SectionHeader
          title="TASKS"
          icon={ListTodo}
          badge={todos.length}
          isOpen={tasksOpen}
          onToggle={() => setTasksOpen(prev => !prev)}
        />
        {tasksOpen && (
          <div className="overflow-auto" style={{ height: heights.tasks }}>
            <TasksContent />
          </div>
        )}
      </div>
      
      {/* Resize handle after TASKS */}
      {tasksOpen && (filesOpen || agentsOpen) && (
        <ResizeHandle onDrag={handleTasksResize} />
      )}
      
      {/* FILES */}
      <div className="flex flex-col shrink-0 border-b border-border">
        <SectionHeader
          title="FILES"
          icon={FolderTree}
          badge={workspaceFiles.length}
          isOpen={filesOpen}
          onToggle={() => setFilesOpen(prev => !prev)}
        />
        {filesOpen && (
          <div className="overflow-auto" style={{ height: heights.files }}>
            <FilesContent />
          </div>
        )}
      </div>
      
      {/* Resize handle after FILES */}
      {filesOpen && agentsOpen && (
        <ResizeHandle onDrag={handleFilesResize} />
      )}
      
      {/* AGENTS */}
      <div className="flex flex-col shrink-0">
        <SectionHeader
          title="AGENTS"
          icon={GitBranch}
          badge={subagents.length}
          isOpen={agentsOpen}
          onToggle={() => setAgentsOpen(prev => !prev)}
        />
        {agentsOpen && (
          <div className="overflow-auto" style={{ height: heights.agents }}>
            <AgentsContent />
          </div>
        )}
      </div>
    </aside>
  )
}

// ============ Content Components ============

const STATUS_CONFIG = {
  pending: { icon: Circle, badge: 'outline' as const, label: 'PENDING', color: 'text-muted-foreground' },
  in_progress: { icon: Clock, badge: 'info' as const, label: 'IN PROGRESS', color: 'text-status-info' },
  completed: { icon: CheckCircle2, badge: 'nominal' as const, label: 'DONE', color: 'text-status-nominal' },
  cancelled: { icon: XCircle, badge: 'critical' as const, label: 'CANCELLED', color: 'text-muted-foreground' }
}

function TasksContent() {
  const { todos } = useAppStore()
  
  if (todos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-sm text-muted-foreground py-8 px-4">
        <ListTodo className="size-8 mb-2 opacity-50" />
        <span>No tasks yet</span>
        <span className="text-xs mt-1">Tasks appear when the agent creates them</span>
      </div>
    )
  }

  const inProgress = todos.filter(t => t.status === 'in_progress')
  const pending = todos.filter(t => t.status === 'pending')
  const completed = todos.filter(t => t.status === 'completed')
  const cancelled = todos.filter(t => t.status === 'cancelled')
  const allTodos = [...inProgress, ...pending, ...completed, ...cancelled]
  
  const done = completed.length
  const total = todos.length
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div>
      {/* Progress bar */}
      <div className="p-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-1.5 text-xs">
          <span className="text-muted-foreground">PROGRESS</span>
          <span className="font-mono">{done}/{total}</span>
        </div>
        <div className="h-1.5 rounded-full bg-background overflow-hidden">
          <div 
            className="h-full bg-status-nominal transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      {/* Todo list */}
      <div className="p-3 space-y-2">
        {allTodos.map(todo => (
          <TaskItem key={todo.id} todo={todo} />
        ))}
      </div>
    </div>
  )
}

function TaskItem({ todo }: { todo: Todo }) {
  const config = STATUS_CONFIG[todo.status]
  const Icon = config.icon
  const isDone = todo.status === 'completed' || todo.status === 'cancelled'

  return (
    <div className={cn(
      "flex items-start gap-3 rounded-sm border border-border p-3",
      isDone && "opacity-50"
    )}>
      <Icon className={cn("size-4 shrink-0 mt-0.5", config.color)} />
      <span className={cn("flex-1 text-sm", isDone && "line-through")}>
        {todo.content}
      </span>
      <Badge variant={config.badge} className="shrink-0 text-[10px]">
        {config.label}
      </Badge>
    </div>
  )
}

function FilesContent() {
  const { workspaceFiles, workspacePath } = useAppStore()
  
  if (workspaceFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-sm text-muted-foreground py-8 px-4">
        <FolderTree className="size-8 mb-2 opacity-50" />
        <span>No workspace files</span>
        <span className="text-xs mt-1">Files appear when the agent accesses them</span>
      </div>
    )
  }

  return (
    <div>
      {workspacePath && (
        <div className="px-3 py-2 text-[10px] text-muted-foreground truncate border-b border-border/50 bg-background/30">
          {workspacePath}
        </div>
      )}
      <div className="py-1">
        {workspaceFiles.map(file => (
          <div
            key={file.path}
            className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-background-interactive"
          >
            <FolderTree className="size-3.5 text-muted-foreground shrink-0" />
            <span className="truncate flex-1">{file.path.split('/').pop()}</span>
            {file.size && (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {formatSize(file.size)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function AgentsContent() {
  const { subagents } = useAppStore()
  
  if (subagents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-sm text-muted-foreground py-8 px-4">
        <GitBranch className="size-8 mb-2 opacity-50" />
        <span>No subagent tasks</span>
        <span className="text-xs mt-1">Subagents appear when spawned</span>
      </div>
    )
  }

  return (
    <div className="p-3 space-y-2">
      {subagents.map(agent => (
        <div key={agent.id} className="p-3 rounded-sm border border-border">
          <div className="flex items-center gap-2 text-sm font-medium">
            <GitBranch className="size-3.5 text-status-info" />
            <span className="flex-1">{agent.name}</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded",
              agent.status === 'pending' && "bg-muted text-muted-foreground",
              agent.status === 'running' && "bg-status-info/20 text-status-info",
              agent.status === 'completed' && "bg-status-nominal/20 text-status-nominal",
              agent.status === 'failed' && "bg-status-critical/20 text-status-critical"
            )}>
              {agent.status.toUpperCase()}
            </span>
          </div>
          {agent.description && (
            <p className="text-xs text-muted-foreground mt-1">{agent.description}</p>
          )}
        </div>
      ))}
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}
