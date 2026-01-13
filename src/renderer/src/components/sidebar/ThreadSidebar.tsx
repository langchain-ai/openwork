import { useState } from 'react'
import { Plus, MessageSquare, Trash2, Settings, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/lib/store'
import { cn, formatRelativeTime, truncate } from '@/lib/utils'
import { ModelSelector } from './ModelSelector'
import { SettingsDialog } from '@/components/settings/SettingsDialog'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'

// Get version from package.json (injected at build time or via preload)
const APP_VERSION = '0.1.0'

export function ThreadSidebar() {
  const { 
    threads, 
    currentThreadId, 
    createThread, 
    selectThread, 
    deleteThread,
    updateThread,
    settingsOpen, 
    setSettingsOpen
  } = useAppStore()
  
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  
  const startEditing = (threadId: string, currentTitle: string) => {
    setEditingThreadId(threadId)
    setEditingTitle(currentTitle || '')
  }
  
  const saveTitle = async () => {
    if (editingThreadId && editingTitle.trim()) {
      await updateThread(editingThreadId, { title: editingTitle.trim() })
    }
    setEditingThreadId(null)
    setEditingTitle('')
  }
  
  const cancelEditing = () => {
    setEditingThreadId(null)
    setEditingTitle('')
  }

  const handleNewThread = async () => {
    await createThread({ title: `Thread ${new Date().toLocaleDateString()}` })
  }

  return (
    <aside className="flex h-full w-[240px] flex-col border-r border-border bg-sidebar overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-1.5">
          <span className="text-section-header tracking-wider">OPENWORK</span>
          <span className="text-[10px] text-muted-foreground font-mono">
            {APP_VERSION}
          </span>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={handleNewThread} title="New thread">
          <Plus className="size-4" />
        </Button>
      </div>

      <Separator />

      {/* Thread List */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-1 overflow-hidden">
          {threads.map((thread) => (
            <ContextMenu key={thread.thread_id}>
              <ContextMenuTrigger asChild>
                <div
                  className={cn(
                    "group flex items-center gap-2 rounded-sm px-3 py-2 cursor-pointer transition-colors overflow-hidden",
                    currentThreadId === thread.thread_id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "hover:bg-sidebar-accent/50"
                  )}
                  onClick={() => {
                    if (editingThreadId !== thread.thread_id) {
                      selectThread(thread.thread_id)
                    }
                  }}
                >
                  <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0 overflow-hidden">
                    {editingThreadId === thread.thread_id ? (
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={saveTitle}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveTitle()
                          if (e.key === 'Escape') cancelEditing()
                        }}
                        className="w-full bg-background border border-border rounded px-1 py-0.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        <div className="text-sm truncate block">
                          {thread.title || truncate(thread.thread_id, 20)}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {formatRelativeTime(thread.updated_at)}
                        </div>
                      </>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="opacity-0 group-hover:opacity-100 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteThread(thread.thread_id)
                    }}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem 
                  onClick={() => startEditing(thread.thread_id, thread.title || '')}
                >
                  <Pencil className="size-4 mr-2" />
                  Rename
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem 
                  variant="destructive"
                  onClick={() => deleteThread(thread.thread_id)}
                >
                  <Trash2 className="size-4 mr-2" />
                  Delete
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}

          {threads.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No threads yet
            </div>
          )}
        </div>
      </ScrollArea>

      <Separator />

      {/* Model Selector */}
      <div className="p-4 space-y-4">
        <ModelSelector />
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start gap-2"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings className="size-4" />
          Settings
        </Button>
      </div>

      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </aside>
  )
}
