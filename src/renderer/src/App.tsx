import { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react'
import { ThreadSidebar } from '@/components/sidebar/ThreadSidebar'
import { TabbedPanel, TabBar } from '@/components/tabs'
import { RightPanel } from '@/components/panels/RightPanel'
import { ResizeHandle } from '@/components/ui/resizable'
import { useAppStore } from '@/lib/store'
import { ThreadProvider } from '@/lib/thread-context'

// Badge requires ~235 screen pixels to display with comfortable margin
const BADGE_MIN_SCREEN_WIDTH = 235
const LEFT_MAX = 350
const LEFT_DEFAULT = 240

const RIGHT_MIN = 250
const RIGHT_MAX = 450
const RIGHT_DEFAULT = 320

function App(): React.JSX.Element {
  const { currentThreadId, loadThreads, createThread } = useAppStore()
  const [isLoading, setIsLoading] = useState(true)
  const [leftWidth, setLeftWidth] = useState(LEFT_DEFAULT)
  const [rightWidth, setRightWidth] = useState(RIGHT_DEFAULT)
  const [zoomLevel, setZoomLevel] = useState(1)

  // Track drag start widths
  const dragStartWidths = useRef<{ left: number; right: number } | null>(null)

  // Track zoom level changes and update CSS custom properties for safe areas
  useLayoutEffect(() => {
    const updateZoom = (): void => {
      // Detect zoom by comparing outer/inner window dimensions
      const detectedZoom = Math.round((window.outerWidth / window.innerWidth) * 100) / 100
      if (detectedZoom > 0.5 && detectedZoom < 3) {
        setZoomLevel(detectedZoom)

        // Traffic lights are at fixed screen position (y: ~28px bottom including padding)
        // Titlebar is 36px CSS, which becomes 36*zoom screen pixels
        // Extra padding needed when titlebar shrinks below traffic lights
        const TRAFFIC_LIGHT_BOTTOM_SCREEN = 40 // screen pixels to clear traffic lights
        const TITLEBAR_HEIGHT_CSS = 36
        const titlebarScreenHeight = TITLEBAR_HEIGHT_CSS * detectedZoom
        const extraPaddingScreen = Math.max(0, TRAFFIC_LIGHT_BOTTOM_SCREEN - titlebarScreenHeight)
        const extraPaddingCss = Math.round(extraPaddingScreen / detectedZoom)

        document.documentElement.style.setProperty('--sidebar-safe-padding', `${extraPaddingCss}px`)
      }
    }

    updateZoom()
    window.addEventListener('resize', updateZoom)
    return () => window.removeEventListener('resize', updateZoom)
  }, [])

  // Calculate zoom-compensated minimum width to always contain the badge
  const leftMinWidth = Math.ceil(BADGE_MIN_SCREEN_WIDTH / zoomLevel)

  // Enforce minimum width when zoom changes
  useEffect(() => {
    if (leftWidth < leftMinWidth) {
      setLeftWidth(leftMinWidth)
    }
  }, [leftMinWidth, leftWidth])

  const handleLeftResize = useCallback(
    (totalDelta: number) => {
      if (!dragStartWidths.current) {
        dragStartWidths.current = { left: leftWidth, right: rightWidth }
      }
      const newWidth = dragStartWidths.current.left + totalDelta
      setLeftWidth(Math.min(LEFT_MAX, Math.max(leftMinWidth, newWidth)))
    },
    [leftWidth, rightWidth, leftMinWidth]
  )

  const handleRightResize = useCallback(
    (totalDelta: number) => {
      if (!dragStartWidths.current) {
        dragStartWidths.current = { left: leftWidth, right: rightWidth }
      }
      const newWidth = dragStartWidths.current.right - totalDelta
      setRightWidth(Math.min(RIGHT_MAX, Math.max(RIGHT_MIN, newWidth)))
    },
    [leftWidth, rightWidth]
  )

  // Reset drag start on mouse up
  useEffect(() => {
    const handleMouseUp = (): void => {
      dragStartWidths.current = null
    }
    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [])

  useEffect(() => {
    async function init(): Promise<void> {
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
    <ThreadProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Fixed app badge - zoom independent position and size */}
        <div
          className="app-badge"
          style={{
            // Compensate both position and scale for zoom
            // Target screen position: top 14px, left 82px (just past traffic lights)
            top: `${14 / zoomLevel}px`,
            left: `${82 / zoomLevel}px`,
            transform: `scale(${1 / zoomLevel})`,
            transformOrigin: 'top left'
          }}
        >
          <span className="app-badge-name">OPENWORK</span>
          <span className="app-badge-version">{__APP_VERSION__}</span>
        </div>

        {/* Left + Center column */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Titlebar row with tabs integrated */}
          <div className="flex h-9 w-full shrink-0 app-drag-region bg-sidebar">
            {/* Left section - spacer for traffic lights + badge (matches left sidebar width) */}
            <div style={{ width: leftWidth }} className="shrink-0" />

            {/* Resize handle spacer */}
            <div className="w-[1px] shrink-0" />

            {/* Center section - Tab bar */}
            <div className="flex-1 min-w-0">
              {currentThreadId && <TabBar className="h-full border-b-0" />}
            </div>
          </div>

          {/* Main content area */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar - Thread List */}
            <div style={{ width: leftWidth }} className="shrink-0">
              <ThreadSidebar />
            </div>

            <ResizeHandle onDrag={handleLeftResize} />

            {/* Center - Content Panel (Agent Chat + File Viewer) */}
            <main className="flex flex-1 flex-col min-w-0 overflow-hidden">
              {currentThreadId ? (
                <TabbedPanel threadId={currentThreadId} showTabBar={false} />
              ) : (
                <div className="flex flex-1 items-center justify-center text-muted-foreground">
                  Select or create a thread to begin
                </div>
              )}
            </main>
          </div>
        </div>

        <ResizeHandle onDrag={handleRightResize} />

        {/* Right Panel - Status Panels (full height) */}
        <div style={{ width: rightWidth }} className="shrink-0">
          <RightPanel />
        </div>
      </div>
    </ThreadProvider>
  )
}

export default App
