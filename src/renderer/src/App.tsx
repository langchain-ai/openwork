import { useEffect, useState, useCallback, useRef } from 'react'
import { ThreadSidebar } from '@/components/sidebar/ThreadSidebar'
import { ChatContainer } from '@/components/chat/ChatContainer'
import { RightPanel } from '@/components/panels/RightPanel'
import { ResizeHandle } from '@/components/ui/resizable'
import { useAppStore } from '@/lib/store'

const LEFT_MIN = 180
const LEFT_MAX = 350
const LEFT_DEFAULT = 240

const RIGHT_MIN = 250
const RIGHT_MAX = 450
const RIGHT_DEFAULT = 320

function App() {
  const { currentThreadId, loadThreads, createThread, setSettingsOpen } = useAppStore()
  const [isLoading, setIsLoading] = useState(true)
  const [leftWidth, setLeftWidth] = useState(LEFT_DEFAULT)
  const [rightWidth, setRightWidth] = useState(RIGHT_DEFAULT)
  
  // Track drag start widths
  const dragStartWidths = useRef<{ left: number; right: number } | null>(null)

  const handleLeftResize = useCallback((totalDelta: number) => {
    if (!dragStartWidths.current) {
      dragStartWidths.current = { left: leftWidth, right: rightWidth }
    }
    const newWidth = dragStartWidths.current.left + totalDelta
    setLeftWidth(Math.min(LEFT_MAX, Math.max(LEFT_MIN, newWidth)))
  }, [leftWidth, rightWidth])

  const handleRightResize = useCallback((totalDelta: number) => {
    if (!dragStartWidths.current) {
      dragStartWidths.current = { left: leftWidth, right: rightWidth }
    }
    const newWidth = dragStartWidths.current.right - totalDelta
    setRightWidth(Math.min(RIGHT_MAX, Math.max(RIGHT_MIN, newWidth)))
  }, [leftWidth, rightWidth])

  // Reset drag start on mouse up
  useEffect(() => {
    const handleMouseUp = () => {
      dragStartWidths.current = null
    }
    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [])

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Cmd+, for settings
    if ((e.metaKey || e.ctrlKey) && e.key === ',') {
      e.preventDefault()
      setSettingsOpen(true)
    }
  }, [setSettingsOpen])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    async function init() {
      try {
        await loadThreads()
        // Create a default thread if none exist
        const threads = useAppStore.getState().threads
        if (threads.length === 0) {
          await createThread()
        }
      } catch (error) {
        console.error('Failed to initialize:', error)
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [loadThreads, createThread])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Initializing...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Draggable titlebar region with app badge */}
      <div className="h-8 w-full shrink-0 app-drag-region bg-sidebar relative">
        <div className="absolute top-[14px] left-[76px] flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-primary/10 border border-primary/30 leading-none">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-primary leading-none">OPENWORK</span>
          <span className="text-[9px] text-primary/70 font-mono leading-none">{__APP_VERSION__}</span>
        </div>
      </div>
      
      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Thread List */}
        <div style={{ width: leftWidth }} className="shrink-0">
          <ThreadSidebar />
        </div>

        <ResizeHandle onDrag={handleLeftResize} />

        {/* Center - Chat Interface */}
        <main className="flex flex-1 flex-col min-w-0 overflow-hidden">
          {currentThreadId ? (
            <ChatContainer threadId={currentThreadId} />
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              Select or create a thread to begin
            </div>
          )}
        </main>

        <ResizeHandle onDrag={handleRightResize} />

        {/* Right Panel - Status Panels */}
        <div style={{ width: rightWidth }} className="shrink-0">
          <RightPanel />
        </div>
      </div>
    </div>
  )
}

export default App
