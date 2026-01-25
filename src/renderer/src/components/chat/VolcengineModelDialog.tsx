import { useEffect, useState } from "react"
import { Loader2, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAppStore } from "@/lib/store"

interface VolcengineModelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VolcengineModelDialog({
  open,
  onOpenChange
}: VolcengineModelDialogProps): React.JSX.Element {
  const [modelId, setModelId] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { models, addCustomModel, deleteCustomModel } = useAppStore()

  const customModels = models.filter((model) => model.custom && model.provider === "volcengine")

  useEffect(() => {
    if (open) {
      setModelId("")
      setError(null)
    }
  }, [open])

  async function handleSave(): Promise<void> {
    const trimmed = modelId.trim()
    if (!trimmed) {
      setError("Model ID is required")
      return
    }

    setSaving(true)
    setError(null)
    try {
      await addCustomModel({
        id: trimmed,
        provider: "volcengine",
        model: trimmed,
        name: trimmed,
        description: "Custom Volcengine Ark model"
      })
      onOpenChange(false)
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to add model"
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(modelId: string): Promise<void> {
    try {
      await deleteCustomModel(modelId)
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to delete model"
      setError(message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Add Volcengine Model</DialogTitle>
          <DialogDescription>
            Enter your Volcengine Ark endpoint ID (e.g., ep-xxxxxxxxxxxxxxxxx).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Input
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              placeholder="ep-... ..."
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              This value will be used as both the model ID and endpoint.
            </p>
            {error && <p className="text-xs text-status-critical">{error}</p>}
          </div>

          {customModels.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Existing Models
              </div>
              <div className="space-y-1">
                {customModels.map((model) => (
                  <div
                    key={model.id}
                    className="flex items-center gap-2 rounded-sm border border-border px-2 py-1"
                  >
                    <span className="flex-1 truncate text-xs font-mono">{model.id}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(model.id)}
                      aria-label={`Remove ${model.id}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={!modelId.trim() || saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Add Model"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
