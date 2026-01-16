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
  google: { placeholder: 'AIza...', envVar: 'GOOGLE_API_KEY' },
  azure: { placeholder: 'Azure key', envVar: 'AZURE_OPENAI_API_KEY' }
}

export function ApiKeyDialog({ open, onOpenChange, provider }: ApiKeyDialogProps) {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [hasExistingKey, setHasExistingKey] = useState(false)

  const [azureConfig, setAzureConfig] = useState<{
    endpointOrTargetUri: string
    deployment: string
    apiVersion: string
  }>({ endpointOrTargetUri: '', deployment: '', apiVersion: '' })

  const {
    getApiKey,
    setApiKey: saveApiKey,
    deleteApiKey,
    getAzureConfig,
    setAzureConfig: saveAzureConfig,
    setAzureEndpoint
  } = useAppStore()

  // Check if there's an existing key when dialog opens
  useEffect(() => {
    async function load(): Promise<void> {
      if (!open || !provider) return

      setApiKey('')
      setShowKey(false)

      if (provider.id !== 'azure') {
        setHasExistingKey(provider.hasApiKey)
        return
      }

      try {
        const [key, config] = await Promise.all([
          getApiKey('azure'),
          getAzureConfig()
        ])

        setHasExistingKey(!!key)
        setAzureConfig({
          endpointOrTargetUri: config?.endpoint ?? '',
          deployment: config?.deployment ?? '',
          apiVersion: config?.apiVersion ?? ''
        })
      } catch (e) {
        console.error('[ApiKeyDialog] Failed to load Azure config:', e)
        setHasExistingKey(false)
        setAzureConfig({ endpointOrTargetUri: '', deployment: '', apiVersion: '' })
      }
    }

    load()
  }, [open, provider])

  if (!provider) return null

  const info = PROVIDER_INFO[provider.id] || { placeholder: '...', envVar: '' }

  async function handleSave() {
    if (!provider) return
    
    console.log('[ApiKeyDialog] Saving API key for provider:', provider.id)
    setSaving(true)
    try {
      if (provider.id === 'azure') {
        const keyToSave = apiKey.trim()

        if (keyToSave) {
          await saveApiKey('azure', keyToSave)
        } else if (!hasExistingKey) {
          return
        }

        if (!azureConfig.endpointOrTargetUri.trim() || !azureConfig.deployment.trim()) {
          return
        }

        const endpointResult = await setAzureEndpoint(azureConfig.endpointOrTargetUri)
        const apiVersion = azureConfig.apiVersion.trim() || endpointResult?.apiVersion || ''
        const endpoint = endpointResult?.endpoint || azureConfig.endpointOrTargetUri.trim()

        if (!apiVersion) {
          return
        }

        await saveAzureConfig({
          endpoint,
          deployment: azureConfig.deployment.trim(),
          apiVersion
        })

        onOpenChange(false)
        return
      }

      if (!apiKey.trim()) return
      await saveApiKey(provider.id, apiKey.trim())
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
              ? 'For security, saved keys cannot be displayed. Enter a new key to replace the existing one, or remove it.'
              : provider.id === 'azure'
                ? 'Enter your Azure OpenAI API key and deployment configuration.'
                : `Enter your ${provider.name} API key to use their models.`
            }
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
              {apiKey.trim() ? (
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              ) : (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showKey ? <EyeOff className="size-4 opacity-40" /> : <Eye className="size-4 opacity-40" />}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Environment variable: <code className="text-foreground">{info.envVar}</code>
            </p>
          </div>

          {provider.id === 'azure' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Input
                  type="text"
                  value={azureConfig.endpointOrTargetUri}
                  onChange={(e) =>
                    setAzureConfig((prev) => ({ ...prev, endpointOrTargetUri: e.target.value }))
                  }
                  placeholder="Azure OpenAI endpoint or deployment Target URI"
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Paste your base endpoint (e.g. https://&lt;your-resource-name&gt;.openai.azure.com) or the full deployment Target URI from Azure.
                </p>
              </div>

              <div className="space-y-2">
                <Input
                  type="text"
                  value={azureConfig.deployment}
                  onChange={(e) => setAzureConfig((prev) => ({ ...prev, deployment: e.target.value }))}
                  placeholder="Deployment name (e.g. gpt-4.1)"
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-2">
                <Input
                  type="text"
                  value={azureConfig.apiVersion}
                  onChange={(e) => setAzureConfig((prev) => ({ ...prev, apiVersion: e.target.value }))}
                  placeholder="API version (e.g. 2024-05-01-preview)"
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  If you paste a full Target URI above, api-version can be extracted automatically.
                </p>
              </div>
            </div>
          )}
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
            <Button
              type="button"
              onClick={handleSave}
              disabled={
                saving ||
                (provider.id === 'azure'
                  ? (!apiKey.trim() && !hasExistingKey) ||
                    !azureConfig.endpointOrTargetUri.trim() ||
                    !azureConfig.deployment.trim() ||
                    (!azureConfig.apiVersion.trim() && !azureConfig.endpointOrTargetUri.includes('api-version'))
                  : !apiKey.trim())
              }
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
