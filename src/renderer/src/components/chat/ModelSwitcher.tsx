import { useState, useEffect } from "react"
import { ChevronDown, Check, AlertCircle, Key } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/lib/store"
import { useCurrentThread } from "@/lib/thread-context"
import { cn } from "@/lib/utils"
import { ApiKeyDialog } from "./ApiKeyDialog"
import type { Provider, ProviderId } from "@/types"

// Provider icons as simple SVG components
function AnthropicIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.304 3.541h-3.672l6.696 16.918h3.672l-6.696-16.918zm-10.608 0L0 20.459h3.744l1.368-3.562h7.044l1.368 3.562h3.744L10.608 3.541H6.696zm.576 10.852l2.352-6.122 2.352 6.122H7.272z" />
    </svg>
  )
}

function OpenAIIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
    </svg>
  )
}

function GoogleIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z" />
    </svg>
  )
}

function OllamaIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.518,8.513c-0.344-1.259-1.309-2.275-2.585-2.731l-0.038-0.012c-0.297-0.088-0.569-0.244-0.803-0.456C18.258,4.524,19,3.012,19,3c0-1.637-1.343-3-3-3s-3,1.363-3,3 c0,0.012,0.73,1.503-0.085,2.291C12.675,5.503,12.4,5.666,12.112,5.753c-1.314,0.469-2.306,1.522-2.618,2.816 c-0.134,0.038-0.266,0.091-0.394,0.156c-0.128-0.066-0.259-0.119-0.394-0.159c-0.312-1.291-1.303-2.344-2.622-2.812l-0.044-0.016 C5.759,5.656,5.497,5.5,5.275,5.291C4.444,4.516,5,3.009,5,3c0-1.637-1.343-3-3-3S-1,1.363-1,3s1.343,3,3,3 c0.009,0,1.244-0.65,1.906-0.641c0.35,0.003,0.684,0.106,0.984,0.288c0.809,0.491,1.406,1.294,1.644,2.238 c-1.291,0.597-2.181,1.906-2.181,3.431c0,1.528,0.894,2.841,2.188,3.441c-0.241,0.953-0.838,1.759-1.65,2.253 c-0.297,0.178-0.631,0.281-0.978,0.284C2.26,17.291,1.01,16.641,1,16.638C1.5,15.688,1,14.525,1,14c0-0.553,0.447-1,1-1 s1,0.447,1,1c0,0.412-0.262,0.75-0.609,0.916C2.4,14.922,3,15,3,15c1.654,0,3,1.347,3,3s-1.346,3-3,3s-3-1.347-3-3 c0-0.012,0.612-1.381,1.884-2.022c0.016-0.009,0.028-0.019,0.041-0.028C2.569,15.659,3,14.881,3,14c0-1.103-0.897-2-2-2S-1,12.897-1,14 c0,1.637,1.343,3,3,3c0.009,0,1.263-0.669,1.922-1.312c0.266,0.259,0.575,0.472,0.916,0.631L5,16.388 c0.334,0.156,0.694,0.256,1.069,0.297c0.012,0.003,0.025,0.003,0.038,0.003c0.419,0,0.825-0.075,1.212-0.212 c0.378-0.128,0.731-0.316,1.05-0.553l0.056-0.044c1.191,0.741,2.609,1.159,4.103,1.159c1.616,0,3.138-0.491,4.403-1.334l0.022-0.016 c0.306,0.219,0.647,0.394,1.009,0.516c0.384,0.131,0.784,0.203,1.197,0.203c0.012,0,0.025,0,0.038-0.003 c0.375-0.041,0.738-0.141,1.072-0.297l0.159-0.069c0.341-0.159,0.65-0.372,0.919-0.631C21.738,16.331,23,17,23,17 c1.657,0,3-1.363,3-3s-1.343-3-3-3s-3,1.363-3,3c0,0.003-1.25,0.653-1.922,0.638c-0.347-0.003-0.681-0.106-0.978-0.284 c-0.812-0.494-1.409-1.3-1.65-2.253C14.738,10.497,15.631,9.184,15.631,7.656C15.631,6.131,14.741,4.822,13.45,4.225 c0.238-0.944,0.834-1.747,1.644-2.238c0.3-0.181,0.634-0.284,0.984-0.288C16.744,1.709,18,2.35,18,2.35C17.5,3.3,18,4.463,18,5 c0,0.553-0.447,1-1,1s-1-0.447-1-1c0-0.412,0.278-0.781,0.612-0.916C16.6,4.078,16,4,16,4c-1.657,0-3-1.363-3-3s1.343-3,3-3 s3,1.363,3,3c0,0.012-0.612,1.381-1.888,2.022C17.097,4.031,17.084,4.041,17.072,4.05c0.65,0.291,1.081,1.069,1.081,1.95 c0,1.103,0.897,2,2,2s2-0.897,2-2c0-1.637-1.343-3-3-3c-0.009,0-1.263,0.669-1.922,1.312C17.703,4.022,18.003,3.778,18.337,3.584 c0.038-0.019,0.075-0.038,0.116-0.053c1.319-0.469,2.309-1.522,2.622-2.812c0.134-0.038,0.266-0.094,0.394-0.159 c0.128,0.066,0.259,0.119,0.394,0.156C22.175,2.009,23.166,3.063,24.481,3.531l0.044,0.016C24.819,3.641,25.081,3.8,25.303,4.012 C26.134,4.787,25.578,6.291,25.578,6.3c0,1.637,1.343,3,3,3s3-1.363,3-3S30.234,3.3,28.578,3.3c-0.009,0-1.244,0.65-1.906,0.641 c-0.35-0.003-0.684-0.106-0.984-0.288c-0.809-0.491-1.406-1.294-1.644-2.238c1.291-0.597,2.181-1.906,2.181-3.431 c0-1.528-0.894-2.841-2.188-3.441c0.241-0.953,0.838-1.759,1.65-2.253c0.297-0.178,0.631-0.281,0.978-0.284 C27.319,1.709,28.569,2.359,28.578,2.363C28.078,3.313,28.578,4.475,28.578,5c0,0.553-0.447,1-1,1s-1-0.447-1-1 c0-0.412,0.262-0.75,0.609-0.916C27.178,4.078,26.578,4,26.578,4c-1.654,0-3-1.347-3-3s1.346-3,3-3s3,1.347,3,3 c0,0.012-0.612,1.381-1.884,2.022c-0.016,0.009-0.028,0.019-0.041,0.028C27.009,3.341,26.578,4.119,26.578,5 c0,1.103,0.897,2,2,2s2-0.897,2-2c0-1.637-1.343-3-3-3c-0.009,0-1.263,0.669-1.922,1.312C25.391,3.572,25.081,3.784,24.741,3.944 L24.581,4.012c-0.334-0.156-0.694-0.256-1.069-0.297c-0.012-0.003-0.025-0.003-0.038-0.003c-0.419,0-0.825,0.075-1.212,0.212 c-0.378,0.128-0.731,0.316-1.05,0.553l-0.056,0.044c-1.191-0.741-2.609-1.159-4.103-1.159C15.438,2.834,13.916,3.325,12.65,4.169 l-0.022,0.016C12.322,3.966,11.981,3.791,11.619,3.669c-0.384-0.131-0.784-0.203-1.197-0.203c-0.012,0-0.025,0-0.038,0.003 C10.009,3.509,9.647,3.609,9.312,3.766l-0.159,0.069C8.812,3.994,8.503,4.206,8.234,4.466C8.841,5,9,6,9,7s-1,3-3,3s-3-2-3-3 S3.447,4.516,4.275,5.291C4.497,5.5,4.759,5.656,5.044,5.753l0.044,0.016C6.362,6.222,7.353,7.275,7.666,8.566 C7.8,8.606,7.931,8.659,8.059,8.725c0.128,0.066,0.259,0.119,0.394,0.156C8.766,10.175,9.756,11.228,11.072,11.697z" />
    </svg>
  )
}

const PROVIDER_ICONS: Record<ProviderId, React.FC<{ className?: string }>> = {
  anthropic: AnthropicIcon,
  openai: OpenAIIcon,
  google: GoogleIcon,
  ollama: OllamaIcon
}

// Fallback providers in case the backend hasn't loaded them yet
const FALLBACK_PROVIDERS: Provider[] = [
  { id: "anthropic", name: "Anthropic", hasApiKey: false },
  { id: "openai", name: "OpenAI", hasApiKey: false },
  { id: "google", name: "Google", hasApiKey: false },
  { id: "ollama", name: "Ollama (Local)", hasApiKey: true }
]

interface ModelSwitcherProps {
  threadId: string
}

export function ModelSwitcher({ threadId }: ModelSwitcherProps): React.JSX.Element {
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

  // Determine effective provider ID (manual selection > current model > default)
  const effectiveProviderId =
    selectedProviderId ||
    (currentModel ? models.find((m) => m.id === currentModel)?.provider : null) ||
    (displayProviders.length > 0 ? displayProviders[0].id : null)

  const selectedModel = models.find((m) => m.id === currentModel)
  const filteredModels = effectiveProviderId
    ? models.filter((m) => m.provider === effectiveProviderId)
    : []
  const selectedProvider = displayProviders.find((p) => p.id === effectiveProviderId)

  function handleProviderClick(provider: Provider): void {
    setSelectedProviderId(provider.id)
  }

  function handleModelSelect(modelId: string): void {
    setCurrentModel(modelId)
    setOpen(false)
  }

  function handleConfigureApiKey(provider: Provider): void {
    setApiKeyProvider(provider)
    setApiKeyDialogOpen(true)
  }

  function handleApiKeyDialogClose(isOpen: boolean): void {
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
                {PROVIDER_ICONS[selectedModel.provider]?.({ className: "size-3.5" })}
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
                        effectiveProviderId === provider.id
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
                  <Button size="sm" onClick={() => handleConfigureApiKey(selectedProvider)}>
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
                      <p className="text-xs text-muted-foreground px-2 py-4">No models available</p>
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
