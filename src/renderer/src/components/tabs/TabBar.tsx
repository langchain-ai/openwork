import { Bot, X, FileCode, FileText, FileJson, File } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore, type OpenFile } from '@/lib/store'

interface TabBarProps {
  className?: string
}

export function TabBar({ className }: TabBarProps): React.ReactElement {
  const { openFiles, activeTab, setActiveTab, closeFile } = useAppStore()

  return (
    <div
      className={cn(
        'flex items-center h-9 border-b border-border bg-sidebar overflow-x-auto scrollbar-hide',
        className
      )}
    >
      {/* Agent Tab - Always first and prominent */}
      <button
        onClick={() => setActiveTab('agent')}
        className={cn(
          'flex items-center gap-2 px-4 h-full text-sm font-medium transition-colors shrink-0 border-r border-border',
          activeTab === 'agent'
            ? 'bg-primary/15 text-primary border-b-2 border-b-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-background-interactive'
        )}
      >
        <Bot className="size-4" />
        <span>Agent</span>
      </button>

      {/* File Tabs */}
      {openFiles.map((file) => (
        <FileTab
          key={file.path}
          file={file}
          isActive={activeTab === file.path}
          onSelect={() => setActiveTab(file.path)}
          onClose={() => closeFile(file.path)}
        />
      ))}

      {/* Spacer to fill remaining space */}
      <div className="flex-1 min-w-0" />
    </div>
  )
}

interface FileTabProps {
  file: OpenFile
  isActive: boolean
  onSelect: () => void
  onClose: () => void
}

function FileTab({ file, isActive, onSelect, onClose }: FileTabProps): React.ReactElement {
  const handleClose = (e: React.MouseEvent): void => {
    e.stopPropagation()
    onClose()
  }

  const handleMouseDown = (e: React.MouseEvent): void => {
    // Middle click to close
    if (e.button === 1) {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <button
      onClick={onSelect}
      onMouseDown={handleMouseDown}
      className={cn(
        'group flex items-center gap-2 px-3 h-full text-sm transition-colors shrink-0 border-r border-border max-w-[200px]',
        isActive
          ? 'bg-background text-foreground border-b-2 border-b-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-background-interactive'
      )}
      title={file.path}
    >
      <FileIcon name={file.name} />
      <span className="truncate">{file.name}</span>
      <button
        onClick={handleClose}
        className={cn(
          'size-4 flex items-center justify-center rounded-sm hover:bg-background-interactive transition-colors',
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
      >
        <X className="size-3" />
      </button>
    </button>
  )
}

function FileIcon({ name }: { name: string }): React.ReactElement {
  const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() : ''

  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
    case 'py':
    case 'css':
    case 'scss':
    case 'html':
      return <FileCode className="size-3.5 text-blue-400 shrink-0" />
    case 'json':
      return <FileJson className="size-3.5 text-yellow-500 shrink-0" />
    case 'md':
    case 'mdx':
    case 'txt':
      return <FileText className="size-3.5 text-muted-foreground shrink-0" />
    default:
      return <File className="size-3.5 text-muted-foreground shrink-0" />
  }
}
