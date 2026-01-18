import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { memo } from 'react'

interface StreamingMarkdownProps {
  children: string
  isStreaming?: boolean
}

export const StreamingMarkdown = memo(function StreamingMarkdown({
  children,
  isStreaming = false
}: StreamingMarkdownProps) {
  return (
    <div className="streaming-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-2 h-4 ml-0.5 bg-foreground/70 animate-pulse" />
      )}
    </div>
  )
})
