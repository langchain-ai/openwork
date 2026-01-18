import { useAppStore } from '@/lib/store'
import { TabBar } from './TabBar'
import { FileViewer } from './FileViewer'
import { ChatContainer } from '@/components/chat/ChatContainer'

interface TabbedPanelProps {
  threadId: string
  showTabBar?: boolean
}

export function TabbedPanel({ threadId, showTabBar = true }: TabbedPanelProps): React.ReactElement {
  const { activeTab, openFiles } = useAppStore()

  // Determine what to render based on active tab
  const isAgentTab = activeTab === 'agent'
  const activeFile = openFiles.find((f) => f.path === activeTab)

  return (
    <div className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden">
      {/* Tab Bar (optional - can be rendered externally in titlebar) */}
      {showTabBar && <TabBar />}

      {/* Subtle gradient fade from titlebar */}
      <div className="h-1 shrink-0 bg-gradient-to-b from-sidebar/80 to-transparent" />

      {/* Content Area */}
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        {isAgentTab ? (
          <ChatContainer threadId={threadId} />
        ) : activeFile ? (
          // Use key to force remount when file changes, ensuring fresh state
          <FileViewer key={activeFile.path} filePath={activeFile.path} />
        ) : (
          // Fallback - shouldn't happen but just in case
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            Select a tab to view content
          </div>
        )}
      </div>
    </div>
  )
}
