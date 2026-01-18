import { useState } from 'react'
import { Terminal, Check, X, Edit2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/store'
import type { HITLRequest } from '@/types'

interface ApprovalDialogProps {
  request: HITLRequest
}

export function ApprovalDialog({ request }: ApprovalDialogProps): React.ReactElement {
  const { respondToApproval } = useAppStore()
  const [isEditing, setIsEditing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)

  // Defensive: ensure tool_call and args exist
  const toolCall = request?.tool_call || { id: '', name: 'unknown', args: {} }
  const args = toolCall.args || {}

  const [editedArgs, setEditedArgs] = useState(JSON.stringify(args, null, 2))

  const handleApprove = async (): Promise<void> => {
    if (isEditing) {
      try {
        const parsed = JSON.parse(editedArgs)
        await respondToApproval('edit', parsed)
      } catch {
        // Invalid JSON, show error
        return
      }
    } else {
      await respondToApproval('approve')
    }
  }

  const handleReject = async (): Promise<void> => {
    await respondToApproval('reject')
  }

  // Get a preview of the command for execute tool
  const getCommandPreview = (): string | null => {
    if (toolCall.name === 'execute' && args.command) {
      const cmd = String(args.command)
      return cmd.length > 60 ? cmd.substring(0, 60) + '...' : cmd
    }
    return null
  }

  const commandPreview = getCommandPreview()

  return (
    <div className="rounded-md border border-amber-500/50 bg-amber-500/5 overflow-hidden">
      {/* Header - always visible */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-amber-500/10 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-center size-8 rounded-md bg-amber-500/20 text-amber-500">
          <Terminal className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Approval Required</span>
            <Badge variant="warning" className="text-[10px] px-1.5 py-0">
              {toolCall.name}
            </Badge>
          </div>
          {commandPreview && !isExpanded && (
            <div className="text-xs text-muted-foreground font-mono truncate mt-0.5">
              {commandPreview}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isExpanded && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation()
                  handleReject()
                }}
              >
                <X className="size-3 mr-1" />
                Reject
              </Button>
              <Button
                size="sm"
                variant="nominal"
                className="h-7 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  handleApprove()
                }}
              >
                <Check className="size-3 mr-1" />
                Run
              </Button>
            </>
          )}
          {isExpanded ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-amber-500/20">
          {/* Arguments */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-section-header text-[10px]">ARGUMENTS</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit2 className="size-3 mr-1" />
                {isEditing ? 'Cancel' : 'Edit'}
              </Button>
            </div>

            {isEditing ? (
              <textarea
                value={editedArgs}
                onChange={(e) => setEditedArgs(e.target.value)}
                className="w-full h-32 rounded-sm border border-border bg-background p-2 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
            ) : (
              <pre className="rounded-sm border border-border bg-background p-2 font-mono text-xs overflow-x-auto max-h-32">
                {JSON.stringify(args, null, 2)}
              </pre>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 mt-3">
            <Button variant="outline" size="sm" className="h-8" onClick={handleReject}>
              <X className="size-3.5 mr-1" />
              Reject
            </Button>
            <Button variant="nominal" size="sm" className="h-8" onClick={handleApprove}>
              <Check className="size-3.5 mr-1" />
              {isEditing ? 'Apply & Run' : 'Run'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
