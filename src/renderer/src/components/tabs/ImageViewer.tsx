import { useState, useRef, useEffect } from 'react'
import { ZoomIn, ZoomOut, Maximize2, RotateCw, Hand } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'

interface ImageViewerProps {
  filePath: string
  base64Content: string
  mimeType: string
}

export function ImageViewer({ filePath, base64Content, mimeType }: ImageViewerProps) {
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const fileName = filePath.split('/').pop() || filePath
  const imageUrl = `data:${mimeType};base64,${base64Content}`

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 400))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 25))
  }

  const handleResetZoom = () => {
    setZoom(100)
    setRotation(0)
    setPanOffset({ x: 0, y: 0 })
  }

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 100) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y })
      e.preventDefault()
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && zoom > 100) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  const handleMouseLeave = () => {
    setIsPanning(false)
  }

  // Reset pan when zoom changes to 100 or less
  useEffect(() => {
    if (zoom <= 100) {
      setPanOffset({ x: 0, y: 0 })
    }
  }, [zoom])

  const canPan = zoom > 100

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      {/* Header with controls */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border bg-background/50 shrink-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground overflow-hidden">
          <span className="truncate">{fileName}</span>
          <span className="text-muted-foreground/50">•</span>
          <span>Image</span>
          {canPan && (
            <>
              <span className="text-muted-foreground/50">•</span>
              <span className="flex items-center gap-1">
                <Hand className="size-3" />
                Drag to pan
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 25}
            className="h-7 px-2"
          >
            <ZoomOut className="size-4" />
          </Button>

          <span className="text-xs text-muted-foreground min-w-[3rem] text-center">{zoom}%</span>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 400}
            className="h-7 px-2"
          >
            <ZoomIn className="size-4" />
          </Button>

          <Button variant="ghost" size="sm" onClick={handleRotate} className="h-7 px-2">
            <RotateCw className="size-4" />
          </Button>

          <Button variant="ghost" size="sm" onClick={handleResetZoom} className="h-7 px-2">
            <Maximize2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* Image display */}
      <ScrollArea className="flex-1 min-h-0">
        <div
          ref={containerRef}
          className="flex items-center justify-center min-h-full p-8 overflow-hidden"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{
            cursor: canPan ? (isPanning ? 'grabbing' : 'grab') : 'default',
            userSelect: 'none'
          }}
        >
          <img
            src={imageUrl}
            alt={fileName}
            className="max-w-full h-auto transition-transform duration-200"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom / 100}) rotate(${rotation}deg)`,
              imageRendering: zoom > 100 ? 'pixelated' : 'auto'
            }}
            draggable={false}
          />
        </div>
      </ScrollArea>
    </div>
  )
}
