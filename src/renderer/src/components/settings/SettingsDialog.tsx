import { useState, useEffect } from 'react'
import { Eye, EyeOff, Check, AlertCircle, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ProviderConfig {
  id: string
  name: string
  envVar: string
  placeholder: string
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    envVar: 'ANTHROPIC_API_KEY',
    placeholder: 'sk-ant-...'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    envVar: 'OPENAI_API_KEY',
    placeholder: 'sk-...'
  },
  {
    id: 'google',
    name: 'Google AI',
    envVar: 'GOOGLE_API_KEY',
    placeholder: 'AIza...'
  }
]

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [savedKeys, setSavedKeys] = useState<Record<string, boolean>>({})
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  // Load existing settings on mount
  useEffect(() => {
    if (open) {
      loadApiKeys()
    }
  }, [open])

  async function loadApiKeys() {
    setLoading(true)
    const keys: Record<string, string> = {}
    const saved: Record<string, boolean> = {}

    for (const provider of PROVIDERS) {
      try {
        const key = await window.api.models.getApiKey(provider.id)
        if (key) {
          // Show masked version
          keys[provider.id] = '••••••••••••••••'
          saved[provider.id] = true
        } else {
          keys[provider.id] = ''
          saved[provider.id] = false
        }
      } catch (e) {
        keys[provider.id] = ''
        saved[provider.id] = false
      }
    }

    setApiKeys(keys)
    setSavedKeys(saved)
    setLoading(false)
  }

  async function saveApiKey(providerId: string) {
    const key = apiKeys[providerId]
    if (!key || key === '••••••••••••••••') return

    setSaving((prev) => ({ ...prev, [providerId]: true }))

    try {
      await window.api.models.setApiKey(providerId, key)
      setSavedKeys((prev) => ({ ...prev, [providerId]: true }))
      setApiKeys((prev) => ({ ...prev, [providerId]: '••••••••••••••••' }))
      setShowKeys((prev) => ({ ...prev, [providerId]: false }))
    } catch (e) {
      console.error('Failed to save API key:', e)
    } finally {
      setSaving((prev) => ({ ...prev, [providerId]: false }))
    }
  }

  function handleKeyChange(providerId: string, value: string) {
    // If user starts typing on a masked field, clear it
    if (apiKeys[providerId] === '••••••••••••••••' && value.length > 16) {
      value = value.slice(16)
    }
    setApiKeys((prev) => ({ ...prev, [providerId]: value }))
    setSavedKeys((prev) => ({ ...prev, [providerId]: false }))
  }

  function toggleShowKey(providerId: string) {
    setShowKeys((prev) => ({ ...prev, [providerId]: !prev[providerId] }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure API keys for model providers. Keys are stored securely on your device.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <div className="space-y-6 py-2">
          <div className="text-section-header">API KEYS</div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {PROVIDERS.map((provider) => (
                <div key={provider.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">{provider.name}</label>
                    {savedKeys[provider.id] ? (
                      <span className="flex items-center gap-1 text-xs text-status-nominal">
                        <Check className="size-3" />
                        Configured
                      </span>
                    ) : apiKeys[provider.id] ? (
                      <span className="flex items-center gap-1 text-xs text-status-warning">
                        <AlertCircle className="size-3" />
                        Unsaved
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not set</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showKeys[provider.id] ? 'text' : 'password'}
                        value={apiKeys[provider.id] || ''}
                        onChange={(e) => handleKeyChange(provider.id, e.target.value)}
                        placeholder={provider.placeholder}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => toggleShowKey(provider.id)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showKeys[provider.id] ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                    <Button
                      variant={savedKeys[provider.id] ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => saveApiKey(provider.id)}
                      disabled={
                        saving[provider.id] ||
                        !apiKeys[provider.id] ||
                        apiKeys[provider.id] === '••••••••••••••••'
                      }
                    >
                      {saving[provider.id] ? <Loader2 className="size-4 animate-spin" /> : 'Save'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Environment variable: <code className="text-foreground">{provider.envVar}</code>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
