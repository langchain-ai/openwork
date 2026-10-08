import { useState, useEffect } from "react"
import { Eye, EyeOff, Loader2, Trash2, CheckCircle2, XCircle, Zap } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { CustomEndpoint } from "@/types"

interface CustomEndpointDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  endpoint?: CustomEndpoint | null // If provided, we're editing; otherwise creating
  onSave?: () => void
}

interface ConnectionTestResult {
  success: boolean
  models?: string[]
  error?: string
}

export function CustomEndpointDialog({
  open,
  onOpenChange,
  endpoint,
  onSave
}: CustomEndpointDialogProps): React.JSX.Element {
  const isEditing = !!endpoint

  const [id, setId] = useState("")
  const [name, setName] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null)

  // Reset form when dialog opens/closes or endpoint changes
  useEffect(() => {
    if (open) {
      if (endpoint) {
        setId(endpoint.id)
        setName(endpoint.name)
        setBaseUrl(endpoint.baseUrl)
        setApiKey("") // Don't show existing API key
      } else {
        setId("")
        setName("")
        setBaseUrl("")
        setApiKey("")
      }
      setShowKey(false)
      setTestResult(null)
    }
  }, [open, endpoint])

  // Auto-generate ID from name for new endpoints
  useEffect(() => {
    if (!isEditing && name) {
      const generatedId = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
      setId(generatedId)
    }
  }, [name, isEditing])

  async function handleTestConnection(): Promise<void> {
    if (!baseUrl.trim() || !apiKey.trim()) return

    setTesting(true)
    setTestResult(null)

    try {
      const result = await window.api.endpoints.testConnection(baseUrl.trim(), apiKey.trim())
      setTestResult(result)
    } catch (e) {
      setTestResult({
        success: false,
        error: e instanceof Error ? e.message : "Connection test failed"
      })
    } finally {
      setTesting(false)
    }
  }

  async function handleSave(): Promise<void> {
    if (!id.trim() || !name.trim() || !baseUrl.trim()) return
    if (!isEditing && !apiKey.trim()) return

    setSaving(true)
    try {
      if (isEditing) {
        // Update existing endpoint
        await window.api.endpoints.update({
          id: endpoint!.id,
          updates: {
            name: name.trim(),
            baseUrl: baseUrl.trim(),
            ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {})
          }
        })

        // If test was successful, we already have the models - trigger discovery to cache them
        if (testResult?.success && testResult.models) {
          await window.api.endpoints.update({
            id: endpoint!.id,
            updates: { models: testResult.models }
          })
        }
      } else {
        // Create new endpoint
        await window.api.endpoints.create({
          id: id.trim(),
          name: name.trim(),
          baseUrl: baseUrl.trim(),
          apiKey: apiKey.trim()
        })

        // If test was successful, cache the discovered models
        if (testResult?.success && testResult.models) {
          await window.api.endpoints.update({
            id: id.trim(),
            updates: { models: testResult.models }
          })
        }
      }

      onSave?.()
      onOpenChange(false)
    } catch (e) {
      console.error("Failed to save endpoint:", e)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(): Promise<void> {
    if (!endpoint) return

    setDeleting(true)
    try {
      await window.api.endpoints.delete(endpoint.id)
      onSave?.()
      onOpenChange(false)
    } catch (e) {
      console.error("Failed to delete endpoint:", e)
    } finally {
      setDeleting(false)
    }
  }

  const canTest = baseUrl.trim() && apiKey.trim()
  const canSave = id.trim() && name.trim() && baseUrl.trim() && (isEditing || apiKey.trim())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? `Edit ${endpoint?.name}` : "Add Custom Endpoint"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the endpoint configuration or API key."
              : "Add an OpenAI-compatible API endpoint (e.g., Azure OpenAI, local LLM server, vLLM)."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Custom Endpoint"
              autoFocus={!isEditing}
            />
          </div>

          {/* ID (read-only when editing) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              ID <span className="text-muted-foreground font-normal">(used internally)</span>
            </label>
            <Input
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="my-custom-endpoint"
              disabled={isEditing}
              className={isEditing ? "bg-muted" : ""}
            />
          </div>

          {/* Base URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Base URL</label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.example.com/v1"
            />
            <p className="text-xs text-muted-foreground">
              The base URL for the OpenAI-compatible API (e.g., https://api.openai.com/v1)
            </p>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              API Key{" "}
              {isEditing && (
                <span className="text-muted-foreground font-normal">
                  (leave empty to keep current)
                </span>
              )}
            </label>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={isEditing ? "••••••••••••••••" : "sk-..."}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Test Connection */}
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={!canTest || testing}
              className="w-full"
            >
              {testing ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Testing Connection...
                </>
              ) : (
                <>
                  <Zap className="size-4 mr-2" />
                  Test Connection & Discover Models
                </>
              )}
            </Button>
          </div>

          {/* Test Result */}
          {testResult && (
            <div
              className={`p-3 rounded-md text-sm ${
                testResult.success
                  ? "bg-green-500/10 border border-green-500/20"
                  : "bg-red-500/10 border border-red-500/20"
              }`}
            >
              {testResult.success ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="size-4" />
                    <span className="font-medium">Connection successful!</span>
                  </div>
                  {testResult.models && testResult.models.length > 0 && (
                    <div className="text-muted-foreground">
                      <p className="font-medium mb-1">
                        Discovered {testResult.models.length} models:
                      </p>
                      <div className="max-h-24 overflow-y-auto">
                        <ul className="text-xs space-y-0.5 font-mono">
                          {testResult.models.slice(0, 10).map((model) => (
                            <li key={model} className="truncate">
                              {model}
                            </li>
                          ))}
                          {testResult.models.length > 10 && (
                            <li className="text-muted-foreground">
                              ...and {testResult.models.length - 10} more
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <XCircle className="size-4" />
                  <span>{testResult.error || "Connection failed"}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between pt-2">
          {isEditing ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting || saving}
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="size-4 mr-2" />
              )}
              Delete Endpoint
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={!canSave || saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isEditing ? (
                "Update"
              ) : (
                "Add Endpoint"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
