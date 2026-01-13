import { useState } from 'react'
import { AlertTriangle, Check, X, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/store'
import type { HITLRequest } from '@/types'

interface ApprovalDialogProps {
  request: HITLRequest
}

export function ApprovalDialog({ request }: ApprovalDialogProps) {
  const { respondToApproval } = useAppStore()
  const [isEditing, setIsEditing] = useState(false)
  const [editedArgs, setEditedArgs] = useState(
    JSON.stringify(request.tool_call.args, null, 2)
  )

  const handleApprove = async () => {
    if (isEditing) {
      try {
        const parsed = JSON.parse(editedArgs)
        await respondToApproval('edit', parsed)
      } catch (e) {
        // Invalid JSON, show error
        return
      }
    } else {
      await respondToApproval('approve')
    }
  }

  const handleReject = async () => {
    await respondToApproval('reject')
  }

  const getToolWarning = () => {
    const name = request.tool_call.name
    if (name === 'execute') return 'This will execute a shell command'
    if (name === 'write_file') return 'This will create or overwrite a file'
    if (name === 'edit_file') return 'This will modify an existing file'
    return null
  }

  const warning = getToolWarning()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-sm border border-border bg-card p-6 shadow-lg">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="size-5 text-status-warning" />
              <h2 className="text-lg font-medium">Tool Approval Required</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              The agent wants to execute the following action
            </p>
          </div>
          <Badge variant="warning">{request.tool_call.name}</Badge>
        </div>

        {/* Warning */}
        {warning && (
          <div className="mb-4 rounded-sm border border-status-warning/30 bg-status-warning/10 p-3 text-sm text-status-warning">
            {warning}
          </div>
        )}

        {/* Arguments */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-section-header">ARGUMENTS</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit2 className="size-3 mr-1" />
              {isEditing ? 'Cancel Edit' : 'Edit'}
            </Button>
          </div>
          
          {isEditing ? (
            <textarea
              value={editedArgs}
              onChange={(e) => setEditedArgs(e.target.value)}
              className="w-full h-48 rounded-sm border border-border bg-background p-3 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          ) : (
            <pre className="rounded-sm border border-border bg-background p-3 font-mono text-xs overflow-x-auto max-h-48">
              {JSON.stringify(request.tool_call.args, null, 2)}
            </pre>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={handleReject}>
            <X className="size-4 mr-1" />
            Reject
          </Button>
          <Button variant="nominal" onClick={handleApprove}>
            <Check className="size-4 mr-1" />
            {isEditing ? 'Apply & Approve' : 'Approve'}
          </Button>
        </div>
      </div>
    </div>
  )
}
