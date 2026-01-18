import { Music, Video } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface MediaViewerProps {
  filePath: string
  base64Content: string
  mimeType: string
  mediaType: 'video' | 'audio'
}

export function MediaViewer({ filePath, base64Content, mimeType, mediaType }: MediaViewerProps) {
  const fileName = filePath.split('/').pop() || filePath
  const mediaUrl = `data:${mimeType};base64,${base64Content}`

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-background/50 text-xs text-muted-foreground shrink-0">
        <span className="truncate">{fileName}</span>
        <span className="text-muted-foreground/50">•</span>
        <span className="capitalize">{mediaType}</span>
      </div>

      {/* Media player */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col items-center justify-center min-h-full p-8 gap-6">
          {mediaType === 'video' ? (
            <>
              <Video className="size-16 text-muted-foreground/30" />
              <video
                controls
                className="max-w-full max-h-[70vh] rounded-lg shadow-lg"
                preload="metadata"
              >
                <source src={mediaUrl} type={mimeType} />
                Your browser does not support the video tag.
              </video>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center gap-4">
                <div className="w-32 h-32 rounded-full bg-accent/10 flex items-center justify-center">
                  <Music className="size-16 text-muted-foreground/50" />
                </div>
                <div className="text-center">
                  <div className="font-medium text-foreground">{fileName}</div>
                  <div className="text-sm text-muted-foreground">Audio File</div>
                </div>
              </div>
              <audio controls className="w-full max-w-md" preload="metadata">
                <source src={mediaUrl} type={mimeType} />
                Your browser does not support the audio tag.
              </audio>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
