import { useState, useEffect } from 'react'
import { Folder, File, ChevronRight, ChevronDown, FolderOpen } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import type { FileInfo } from '@/types'

export function FilesystemPanel() {
  const { workspaceFiles, workspacePath } = useAppStore()
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  
  // Auto-expand root when workspace path changes
  useEffect(() => {
    if (workspacePath) {
      setExpandedDirs(new Set([workspacePath]))
    }
  }, [workspacePath])

  // Build tree structure
  const buildTree = (files: FileInfo[]) => {
    const tree: Map<string, FileInfo[]> = new Map()
    
    files.forEach(file => {
      const parts = file.path.split('/')
      const parentPath = parts.slice(0, -1).join('/') || '/'
      
      if (!tree.has(parentPath)) {
        tree.set(parentPath, [])
      }
      tree.get(parentPath)!.push(file)
    })
    
    return tree
  }

  const tree = buildTree(workspaceFiles)

  const toggleDir = (path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const renderNode = (file: FileInfo, depth: number = 0) => {
    const name = file.path.split('/').pop() || file.path
    const isExpanded = expandedDirs.has(file.path)
    const children = tree.get(file.path) || []

    return (
      <div key={file.path}>
        <button
          onClick={() => file.is_dir && toggleDir(file.path)}
          className={cn(
            "flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-background-interactive transition-colors",
          )}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
        >
          {file.is_dir ? (
            <>
              {isExpanded ? (
                <ChevronDown className="size-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-3 text-muted-foreground" />
              )}
              <Folder className="size-4 text-status-warning" />
            </>
          ) : (
            <>
              <span className="w-3" />
              <File className="size-4 text-muted-foreground" />
            </>
          )}
          <span className="flex-1 text-left truncate">{name}</span>
          {!file.is_dir && file.size && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatSize(file.size)}
            </span>
          )}
        </button>
        
        {file.is_dir && isExpanded && children.map(child => renderNode(child, depth + 1))}
      </div>
    )
  }

  // Get root level items
  const rootItems = tree.get('/') || tree.get('') || []

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <span className="text-section-header">WORKSPACE</span>
          {workspacePath && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[180px]" title={workspacePath}>
              {workspacePath.split('/').pop()}
            </span>
          )}
        </div>
      </div>
      
      <ScrollArea className="flex-1 min-h-0">
        <div className="py-2">
          {rootItems.length === 0 ? (
            <div className="flex flex-col items-center text-center text-sm text-muted-foreground py-8 px-4">
              <FolderOpen className="size-8 mb-2 opacity-50" />
              <span>No workspace files</span>
              <span className="text-xs mt-1">
                Files will appear here when the agent accesses them
              </span>
            </div>
          ) : (
            rootItems.map(file => renderNode(file))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}
