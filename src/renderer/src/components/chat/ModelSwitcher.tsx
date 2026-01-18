import { useState, useEffect } from 'react'
import { ChevronDown, Check, AlertCircle, Key } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'
import { useCurrentThread } from '@/lib/thread-context'
import { cn } from '@/lib/utils'
import { ApiKeyDialog } from './ApiKeyDialog'
import type { Provider, ProviderId } from '@/types'

// Provider icons as simple SVG components
function AnthropicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.304 3.541h-3.672l6.696 16.918h3.672l-6.696-16.918zm-10.608 0L0 20.459h3.744l1.368-3.562h7.044l1.368 3.562h3.744L10.608 3.541H6.696zm.576 10.852l2.352-6.122 2.352 6.122H7.272z"/>
    </svg>
  )
}

function OpenAIIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
    </svg>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z"/>
    </svg>
  )
}

function DeepSeekIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3c-4.962 0-9 4.038-9 9s4.038 9 9 9c3.938 0 7.29-2.55 8.485-6.087h-3.27A5.507 5.507 0 0 1 12 17.5 5.5 5.5 0 1 1 17.5 12c0 .286-.022.566-.064.84h3.255C20.898 7.635 16.655 3 12 3z"/>
    </svg>
  )
}

const PROVIDER_ICONS: Record<ProviderId, React.FC<{ className?: string }>> = {
  anthropic: AnthropicIcon,
  openai: OpenAIIcon,
  google: GoogleIcon,
  deepseek: DeepSeekIcon,
  ollama: () => null // No icon for ollama yet
}

// Fallback providers in case the backend hasn't loaded them yet
const FALLBACK_PROVIDERS: Provider[] = [
  { id: 'anthropic', name: 'Anthropic', hasApiKey: false },
  { id: 'openai', name: 'OpenAI', hasApiKey: false },
  { id: 'google', name: 'Google', hasApiKey: false },
  { id: 'deepseek', name: 'DeepSeek', hasApiKey: false }
]

interface ModelSwitcherProps {
  threadId: string
}

export function ModelSwitcher({ threadId }: ModelSwitcherProps) {
  const [open, setOpen] = useState(false)
  const [selectedProviderId, setSelectedProviderId] = useState<ProviderId | null>(null)
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false)
  const [apiKeyProvider, setApiKeyProvider] = useState<Provider | null>(null)
  
  const { models, providers, loadModels, loadProviders } = useAppStore()
  const { currentModel, setCurrentModel } = useCurrentThread(threadId)

  // Load models and providers on mount
  useEffect(() => {
    loadModels()
    loadProviders()
  }, [loadModels, loadProviders])

  // Use fallback providers if none loaded
  const displayProviders = providers.length > 0 ? providers : FALLBACK_PROVIDERS

  // Set initial selected provider based on current model
  useEffect(() => {
    if (!selectedProviderId && currentModel) {
      const model = models.find(m => m.id === currentModel)
      if (model) {
        setSelectedProviderId(model.provider)
      }
    }
    // Default to first provider if none selected
    if (!selectedProviderId && displayProviders.length > 0) {
      setSelectedProviderId(displayProviders[0].id)
    }
  }, [currentModel, models, selectedProviderId, displayProviders])

  const selectedModel = models.find(m => m.id === currentModel)
  const filteredModels = selectedProviderId 
    ? models.filter(m => m.provider === selectedProviderId)
    : []
  const selectedProvider = displayProviders.find(p => p.id === selectedProviderId)

  function handleProviderClick(provider: Provider) {
    setSelectedProviderId(provider.id)
  }

  function handleModelSelect(modelId: string) {
    setCurrentModel(modelId)
    window.api.models.setDefault(modelId).catch((error) => {
      console.error('[ModelSwitcher] Failed to persist default model:', error)
    })
    setOpen(false)
  }

  function handleConfigureApiKey(provider: Provider) {
    setApiKeyProvider(provider)
    setApiKeyDialogOpen(true)
  }

  function handleApiKeyDialogClose(isOpen: boolean) {
    setApiKeyDialogOpen(isOpen)
    if (!isOpen) {
      // Refresh providers after dialog closes
      loadProviders()
      loadModels()
    }
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            {selectedModel ? (
              <>
                {PROVIDER_ICONS[selectedModel.provider]?.({ className: 'size-3.5' })}
                <span className="font-mono">{selectedModel.id}</span>
              </>
            ) : (
              <span>Select model</span>
            )}
            <ChevronDown className="size-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[420px] p-0 bg-background border-border" 
          align="start"
          sideOffset={8}
        >
          <div className="flex min-h-[240px]">
            {/* Provider column */}
            <div className="w-[140px] border-r border-border p-2 bg-muted/30">
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 py-1.5">
                Provider
              </div>
              <div className="space-y-0.5">
                {displayProviders.map((provider) => {
                  const Icon = PROVIDER_ICONS[provider.id]
                  return (
                    <button
                      key={provider.id}
                      onClick={() => handleProviderClick(provider)}
                      className={cn(
                        "w-full flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs transition-colors text-left",
                        selectedProviderId === provider.id
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      {Icon && <Icon className="size-3.5 shrink-0" />}
                      <span className="flex-1 truncate">{provider.name}</span>
                      {!provider.hasApiKey && (
                        <AlertCircle className="size-3 text-status-warning shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Models column */}
            <div className="flex-1 p-2">
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 py-1.5">
                Model
              </div>
              
              {selectedProvider && !selectedProvider.hasApiKey ? (
                // No API key configured
                <div className="flex flex-col items-center justify-center h-[180px] px-4 text-center">
                  <Key className="size-6 text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground mb-3">
                    API key required for {selectedProvider.name}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => handleConfigureApiKey(selectedProvider)}
                  >
                    Configure API Key
                  </Button>
                </div>
              ) : (
                // Show models list with scrollable area
                <div className="flex flex-col h-[200px]">
                  <div className="overflow-y-auto flex-1 space-y-0.5">
                    {filteredModels.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => handleModelSelect(model.id)}
                        className={cn(
                          "w-full flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs transition-colors text-left font-mono",
                          currentModel === model.id
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        <span className="flex-1 truncate">{model.id}</span>
                        {currentModel === model.id && (
                          <Check className="size-3.5 shrink-0 text-foreground" />
                        )}
                      </button>
                    ))}
                    
                    {filteredModels.length === 0 && (
                      <p className="text-xs text-muted-foreground px-2 py-4">
                        No models available
                      </p>
                    )}
                  </div>
                  
                  {/* Configure API key link for providers that have a key */}
                  {selectedProvider?.hasApiKey && (
                    <button
                      onClick={() => handleConfigureApiKey(selectedProvider)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors mt-2 border-t border-border pt-2"
                    >
                      <Key className="size-3.5" />
                      <span>Edit API Key</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <ApiKeyDialog
        open={apiKeyDialogOpen}
        onOpenChange={handleApiKeyDialogClose}
        provider={apiKeyProvider}
      />
    </>
  )
}
