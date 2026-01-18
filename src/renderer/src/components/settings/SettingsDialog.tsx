import { useState, useEffect, useCallback } from 'react'
import { Check, Loader2, Settings, Plus, Pencil } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ProviderConfigDialog } from '@/components/chat/ProviderConfigDialog'
import { PROVIDER_REGISTRY } from '../../../../shared/providers'
import type { ProviderId, SavedProviderConfig } from '@/types'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Get providers that require configuration (exclude ollama)
const CONFIGURABLE_PROVIDERS = Object.values(PROVIDER_REGISTRY).filter((p) => p.requiresConfig)

interface ProviderConfigState {
  configs: SavedProviderConfig[]
  activeConfigId: string | null
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps): React.ReactElement {
  const [providerStates, setProviderStates] = useState<Record<string, ProviderConfigState>>({})
  const [loading, setLoading] = useState(true)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [configProviderId, setConfigProviderId] = useState<ProviderId | null>(null)
  const [editingConfig, setEditingConfig] = useState<SavedProviderConfig | null>(null)

  const loadAllProviderConfigs = useCallback(async (): Promise<void> => {
    const states: Record<string, ProviderConfigState> = {}

    for (const provider of CONFIGURABLE_PROVIDERS) {
      try {
        const configs = await window.api.models.listProviderConfigs(provider.id)
        const activeConfig = await window.api.models.getActiveProviderConfigById(provider.id)
        states[provider.id] = {
          configs,
          activeConfigId: activeConfig?.id || null
        }
      } catch {
        states[provider.id] = { configs: [], activeConfigId: null }
      }
    }

    setProviderStates(states)
    setLoading(false)
  }, [])

  // Load existing settings on mount
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Loading state before async fetch is a valid pattern
      setLoading(true)
      void loadAllProviderConfigs()
    }
  }, [open, loadAllProviderConfigs])

  function handleAddConfiguration(providerId: ProviderId): void {
    setConfigProviderId(providerId)
    setEditingConfig(null)
    setConfigDialogOpen(true)
  }

  function handleEditConfiguration(providerId: ProviderId, config: SavedProviderConfig): void {
    setConfigProviderId(providerId)
    setEditingConfig(config)
    setConfigDialogOpen(true)
  }

  function handleConfigDialogClose(isOpen: boolean): void {
    setConfigDialogOpen(isOpen)
    if (!isOpen) {
      // Reload provider configs when dialog closes
      loadAllProviderConfigs()
    }
  }

  return (
    <>
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
            <div className="text-section-header">PROVIDERS</div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {CONFIGURABLE_PROVIDERS.map((provider) => {
                  const state = providerStates[provider.id]
                  const configCount = state?.configs.length || 0
                  const hasConfigs = configCount > 0

                  return (
                    <div key={provider.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">{provider.name}</label>
                        {hasConfigs ? (
                          <span className="flex items-center gap-1 text-xs text-status-nominal">
                            <Check className="size-3" />
                            {configCount} configuration{configCount !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not configured</span>
                        )}
                      </div>

                      {/* Show existing configs */}
                      {hasConfigs && (
                        <div className="space-y-1 pl-2 border-l-2 border-muted">
                          {state.configs.map((config) => (
                            <div
                              key={config.id}
                              className="flex items-center justify-between text-xs text-muted-foreground group"
                            >
                              <span className="flex items-center gap-1.5">
                                {config.name}
                                {state.activeConfigId === config.id && (
                                  <span className="text-[10px] text-status-nominal">(active)</span>
                                )}
                              </span>
                              <button
                                onClick={() => handleEditConfiguration(provider.id, config)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                              >
                                <Pencil className="size-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddConfiguration(provider.id)}
                          className="flex items-center gap-2"
                        >
                          {hasConfigs ? (
                            <>
                              <Plus className="size-4" />
                              Add Another
                            </>
                          ) : (
                            <>
                              <Settings className="size-4" />
                              Configure
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                })}
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

      <ProviderConfigDialog
        open={configDialogOpen}
        onOpenChange={handleConfigDialogClose}
        providerId={configProviderId}
        editingConfig={editingConfig}
      />
    </>
  )
}
