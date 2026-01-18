import { FileText, ExternalLink } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'

interface PDFViewerProps {
  filePath: string
  base64Content: string
}

export function PDFViewer({ filePath, base64Content }: PDFViewerProps) {
  const fileName = filePath.split('/').pop() || filePath
  const pdfUrl = `data:application/pdf;base64,${base64Content}`

  const handleOpenExternal = () => {
    // Open in system default PDF viewer
    const link = document.createElement('a')
    link.href = pdfUrl
    link.download = fileName
    link.click()
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border bg-background/50 shrink-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground overflow-hidden">
          <span className="truncate">{fileName}</span>
          <span className="text-muted-foreground/50">•</span>
          <span>PDF Document</span>
        </div>

        <Button variant="ghost" size="sm" onClick={handleOpenExternal} className="h-7 px-2 gap-1">
          <ExternalLink className="size-3" />
          <span className="text-xs">Download</span>
        </Button>
      </div>

      {/* PDF embed */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col items-center min-h-full bg-muted/30">
          <object data={pdfUrl} type="application/pdf" className="w-full h-full min-h-[600px]">
            {/* Fallback if PDF can't be displayed inline */}
            <div className="flex flex-col items-center justify-center min-h-[600px] gap-4 p-8">
              <FileText className="size-16 text-muted-foreground/50" />
              <div className="text-center">
                <div className="font-medium text-foreground mb-2">{fileName}</div>
                <div className="text-sm text-muted-foreground mb-4">
                  PDF preview not available in this browser
                </div>
                <Button onClick={handleOpenExternal} variant="outline">
                  <ExternalLink className="size-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          </object>
        </div>
      </ScrollArea>
    </div>
  )
}
