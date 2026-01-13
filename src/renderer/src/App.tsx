import { useEffect, useState, useCallback } from 'react'
import { ThreadSidebar } from '@/components/sidebar/ThreadSidebar'
import { ChatContainer } from '@/components/chat/ChatContainer'
import { RightPanel } from '@/components/panels/RightPanel'
import { useAppStore } from '@/lib/store'

function App() {
  const { currentThreadId, loadThreads, createThread, setSettingsOpen } = useAppStore()
  const [isLoading, setIsLoading] = useState(true)

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
      {/* Draggable titlebar region */}
      <div className="h-8 w-full shrink-0 app-drag-region bg-sidebar" />
      
      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Thread List */}
        <ThreadSidebar />

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

        {/* Right Panel - Status Panels */}
        <RightPanel />
      </div>
    </div>
  )
}

export default App
