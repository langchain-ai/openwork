import { User, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Message, HITLRequest } from '@/types'
import { ToolCallRenderer } from './ToolCallRenderer'
import { StreamingMarkdown } from './StreamingMarkdown'

interface ToolResultInfo {
  content: string | unknown
  is_error?: boolean
}

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
  toolResults?: Map<string, ToolResultInfo>
  pendingApproval?: HITLRequest | null
  onApprovalDecision?: (decision: 'approve' | 'reject' | 'edit') => void
}

export function MessageBubble({
  message,
  isStreaming,
  toolResults,
  pendingApproval,
  onApprovalDecision
}: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isTool = message.role === 'tool'

  // Hide tool result messages - they're shown inline with tool calls
  if (isTool) {
    return null
  }

  const getIcon = () => {
    if (isUser) return <User className="size-4" />
    return <Bot className="size-4" />
  }

  const getLabel = () => {
    if (isUser) return 'YOU'
    return 'AGENT'
  }

  const renderContent = () => {
    if (typeof message.content === 'string') {
      // Empty content
      if (!message.content.trim()) {
        return null
      }

      // Use streaming markdown for assistant messages, plain text for user messages
      if (isUser) {
        return <div className="whitespace-pre-wrap text-sm">{message.content}</div>
      }
      return <StreamingMarkdown isStreaming={isStreaming}>{message.content}</StreamingMarkdown>
    }

    // Handle content blocks
    const renderedBlocks = message.content
      .map((block, index) => {
        if (block.type === 'text' && block.text) {
          // Use streaming markdown for assistant text blocks
          if (isUser) {
            return (
              <div key={index} className="whitespace-pre-wrap text-sm">
                {block.text}
              </div>
            )
          }
          return (
            <StreamingMarkdown key={index} isStreaming={isStreaming}>
              {block.text}
            </StreamingMarkdown>
          )
        }
        return null
      })
      .filter(Boolean)

    return renderedBlocks.length > 0 ? renderedBlocks : null
  }

  const content = renderContent()
  const hasToolCalls = message.tool_calls && message.tool_calls.length > 0

  // Don't render if there's no content and no tool calls
  if (!content && !hasToolCalls) {
    return null
  }

  return (
    <div className="flex gap-3 overflow-hidden">
      {/* Left avatar column - shows for agent/tool */}
      <div className="w-8 shrink-0">
        {!isUser && (
          <div className="flex size-8 items-center justify-center rounded-sm bg-status-info/10 text-status-info">
            {getIcon()}
          </div>
        )}
      </div>

      {/* Content column - always same width */}
      <div className="flex-1 min-w-0 space-y-2 overflow-hidden">
        <div className={cn('text-section-header', isUser && 'text-right')}>{getLabel()}</div>

        {content && (
          <div
            className={cn('rounded-sm p-3 overflow-hidden', isUser ? 'bg-primary/10' : 'bg-card')}
          >
            {content}
          </div>
        )}

        {/* Tool calls */}
        {hasToolCalls && (
          <div className="space-y-2 overflow-hidden">
            {message.tool_calls!.map((toolCall, index) => {
              const result = toolResults?.get(toolCall.id)
              const pendingId = pendingApproval?.tool_call?.id
              const needsApproval = Boolean(pendingId && pendingId === toolCall.id)
              return (
                <ToolCallRenderer
                  key={`${toolCall.id || `tc-${index}`}-${needsApproval ? 'pending' : 'done'}`}
                  toolCall={toolCall}
                  result={result?.content}
                  isError={result?.is_error}
                  needsApproval={needsApproval}
                  onApprovalDecision={needsApproval ? onApprovalDecision : undefined}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Right avatar column - shows for user */}
      <div className="w-8 shrink-0">
        {isUser && (
          <div className="flex size-8 items-center justify-center rounded-sm bg-primary/10 text-primary">
            {getIcon()}
          </div>
        )}
      </div>
    </div>
  )
}
