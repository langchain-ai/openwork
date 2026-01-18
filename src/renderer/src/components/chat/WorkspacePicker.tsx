import { useState, useEffect } from 'react'
import { Folder, Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useCurrentThread } from '@/lib/thread-context'
import { cn } from '@/lib/utils'
import { selectWorkspaceFolder } from '@/lib/workspace'

interface WorkspacePickerProps {
  threadId: string
}

export function WorkspacePicker({ threadId }: WorkspacePickerProps): React.JSX.Element {
  const { workspacePath, setWorkspacePath, setWorkspaceFiles } = useCurrentThread(threadId)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Load workspace path and files for current thread
  useEffect(() => {
    async function loadWorkspace(): Promise<void> {
      if (threadId) {
        const path = await window.api.workspace.get(threadId)
        setWorkspacePath(path)

        // If a folder is linked, load files from disk
        if (path) {
          const result = await window.api.workspace.loadFromDisk(threadId)
          if (result.success && result.files) {
            setWorkspaceFiles(result.files)
          }
        }
      }
    }
    loadWorkspace()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId])

  async function handleSelectFolder(): Promise<void> {
    await selectWorkspaceFolder(threadId, setWorkspacePath, setWorkspaceFiles, setLoading, setOpen)
  }

  const folderName = workspacePath?.split('/').pop()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-7 px-2 text-xs gap-1.5',
            workspacePath ? 'text-foreground' : 'text-amber-500'
          )}
          disabled={!threadId}
        >
          <Folder className="size-3.5" />
          <span className="max-w-[120px] truncate">
            {workspacePath ? folderName : 'Select workspace'}
          </span>
          <ChevronDown className="size-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Workspace Folder
          </div>

          {workspacePath ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 rounded-md bg-background-secondary border border-border">
                <Check className="size-3.5 text-status-nominal shrink-0" />
                <span className="text-sm truncate flex-1" title={workspacePath}>
                  {folderName}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                The agent will read and write files in this folder.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs"
                onClick={handleSelectFolder}
                disabled={loading}
              >
                Change Folder
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Select a folder for the agent to work in. The agent will read and write files
                directly to this location.
              </p>
              <Button
                variant="default"
                size="sm"
                className="w-full h-8 text-xs"
                onClick={handleSelectFolder}
                disabled={loading}
              >
                <Folder className="size-3.5 mr-1.5" />
                Select Folder
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
