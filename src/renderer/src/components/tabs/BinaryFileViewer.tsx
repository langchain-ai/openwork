import { File, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BinaryFileViewerProps {
  filePath: string
  size?: number
}

export function BinaryFileViewer({ filePath, size }: BinaryFileViewerProps) {
  const fileName = filePath.split('/').pop() || filePath
  const ext = fileName.includes('.') ? fileName.split('.').pop()?.toUpperCase() : 'FILE'

  const formatSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-background/50 text-xs text-muted-foreground shrink-0">
        <span className="truncate">{fileName}</span>
        <span className="text-muted-foreground/50">•</span>
        <span>Binary File</span>
        {size && (
          <>
            <span className="text-muted-foreground/50">•</span>
            <span>{formatSize(size)}</span>
          </>
        )}
      </div>

      {/* Binary file info */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="w-24 h-24 rounded-2xl bg-accent/10 flex items-center justify-center">
          <File className="size-12 text-muted-foreground/50" />
        </div>

        <div>
          <div className="font-medium text-foreground mb-1">{fileName}</div>
          <div className="text-sm text-muted-foreground mb-2">
            {ext} file • {formatSize(size)}
          </div>
          <div className="text-xs text-muted-foreground max-w-md">
            This file type cannot be previewed in the viewer. You can open it with an external
            application.
          </div>
        </div>

        <Button variant="outline" className="gap-2">
          <Download className="size-4" />
          Open Externally
        </Button>
      </div>
    </div>
  )
}
