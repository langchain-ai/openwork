import { useState, useEffect } from 'react'
import { Eye, EyeOff, Loader2, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAppStore } from '@/lib/store'
import type { Provider } from '@/types'

interface ApiKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  provider: Provider | null
}

const PROVIDER_INFO: Record<string, { placeholder: string; envVar: string }> = {
  anthropic: { placeholder: 'sk-ant-...', envVar: 'ANTHROPIC_API_KEY' },
  openai: { placeholder: 'sk-...', envVar: 'OPENAI_API_KEY' },
  google: { placeholder: 'AIza...', envVar: 'GOOGLE_API_KEY' }
}

export function ApiKeyDialog({ open, onOpenChange, provider }: ApiKeyDialogProps) {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [hasExistingKey, setHasExistingKey] = useState(false)

  const { setApiKey: saveApiKey, deleteApiKey } = useAppStore()

  // Check if there's an existing key when dialog opens
  useEffect(() => {
    if (open && provider) {
      setHasExistingKey(provider.hasApiKey)
      setApiKey('')
      setShowKey(false)
    }
  }, [open, provider])

  if (!provider) return null

  const info = PROVIDER_INFO[provider.id] || { placeholder: '...', envVar: '' }

  async function handleSave() {
    if (!apiKey.trim()) return
    if (!provider) return

    console.log('[ApiKeyDialog] Saving API key for provider:', provider.id)
    setSaving(true)
    try {
      await saveApiKey(provider.id, apiKey.trim())
      console.log('[ApiKeyDialog] API key saved successfully')
      onOpenChange(false)
    } catch (e) {
      console.error('[ApiKeyDialog] Failed to save API key:', e)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!provider) return
    setDeleting(true)
    try {
      await deleteApiKey(provider.id)
      onOpenChange(false)
    } catch (e) {
      console.error('Failed to delete API key:', e)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {hasExistingKey ? `Update ${provider.name} API Key` : `Add ${provider.name} API Key`}
          </DialogTitle>
          <DialogDescription>
            {hasExistingKey
              ? 'Enter a new API key to replace the existing one, or remove it.'
              : `Enter your ${provider.name} API key to use their models.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={hasExistingKey ? '••••••••••••••••' : info.placeholder}
                className="pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Environment variable: <code className="text-foreground">{info.envVar}</code>
            </p>
          </div>
        </div>

        <div className="flex justify-between">
          {hasExistingKey ? (
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
              Remove Key
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={!apiKey.trim() || saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
