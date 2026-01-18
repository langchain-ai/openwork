import { useCallback, useRef } from 'react'
import { GripVertical } from 'lucide-react'

const HANDLE_WIDTH = 6 // px

interface ResizeHandleProps {
  onDrag: (totalDelta: number) => void
}

export function ResizeHandle({ onDrag }: ResizeHandleProps) {
  const startXRef = useRef<number>(0)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      startXRef.current = e.clientX

      const handleMouseMove = (e: MouseEvent) => {
        // Calculate total delta from drag start
        const totalDelta = e.clientX - startXRef.current
        onDrag(totalDelta)
      }

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [onDrag]
  )

  return (
    <div
      onMouseDown={handleMouseDown}
      className="group bg-border/50 hover:bg-primary/30 active:bg-primary/50 transition-colors cursor-col-resize flex items-center justify-center shrink-0 select-none"
      style={{ width: HANDLE_WIDTH }}
    >
      <GripVertical className="size-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  )
}
