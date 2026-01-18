import { useState, useEffect, useRef, useCallback, forwardRef } from 'react'
import {
  ChevronDown,
  Check,
  AlertCircle,
  Key,
  Plus,
  Pencil,
  RefreshCw,
  Settings,
  Loader2,
  Trash2
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { ProviderConfigDialog } from './ProviderConfigDialog'
import { AddProviderDialog } from './AddProviderDialog'
import type {
  Provider,
  ProviderId,
  SavedProviderConfig,
  ModelConfig,
  ProviderApiType,
  ProviderPresetType,
  UserProvider
} from '@/types'

// Provider icons as simple SVG components
function AnthropicIcon({ className }: { className?: string }): React.ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.304 3.541h-3.672l6.696 16.918h3.672l-6.696-16.918zm-10.608 0L0 20.459h3.744l1.368-3.562h7.044l1.368 3.562h3.744L10.608 3.541H6.696zm.576 10.852l2.352-6.122 2.352 6.122H7.272z" />
    </svg>
  )
}

function OpenAIIcon({ className }: { className?: string }): React.ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
    </svg>
  )
}

function GoogleIcon({ className }: { className?: string }): React.ReactElement {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z" />
    </svg>
  )
}

// Azure AI Foundry icon (monochrome, uses currentColor)
function AzureFoundryIcon({ className }: { className?: string }): React.ReactElement {
  return (
    <svg className={className} viewBox="0 0 18 18" fill="currentColor">
      <path d="m11.52,1.59c-.34,0-.61.27-.61.61l-.06,11.23c0,1.64-1.33,2.97-2.97,2.97H2.49c-.26,0-.43-.25-.35-.49L6.46,3.58c.42-1.19,1.54-1.99,2.8-1.99h2.27Z" />
      <path d="m11.52,1.59c.44,0,.83.33.97.81s.96,3.45.96,3.45v5.9h-2.97l.06-10.17h.98Z" />
      <path d="m15.88,6.2c0-.21-.17-.37-.37-.37h-1.75c-1.23,0-2.23,1-2.23,2.23v3.7h2.12c1.23,0,2.23-1,2.23-2.23v-3.33Z" />
    </svg>
  )
}

// Built-in provider icons - custom providers won't have icons
const PROVIDER_ICONS: Record<string, React.FC<{ className?: string }>> = {
  anthropic: AnthropicIcon,
  openai: OpenAIIcon,
  azure: AzureFoundryIcon,
  google: GoogleIcon,
  ollama: () => null // No icon for ollama yet
}

// Generic icon for custom providers
function CustomProviderIcon({ className }: { className?: string }): React.ReactElement {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

// Fallback providers in case the backend hasn't loaded them yet
const FALLBACK_PROVIDERS: Provider[] = [
  { id: 'anthropic', name: 'Anthropic', hasApiKey: false, modelSelection: 'multi' },
  { id: 'openai', name: 'OpenAI', hasApiKey: false, modelSelection: 'multi' },
  { id: 'google', name: 'Google', hasApiKey: false, modelSelection: 'multi' }
]

/**
 * Get the appropriate icon for a provider.
 * For custom providers, checks if name contains "azure" or "foundry" (case-insensitive)
 * to use the Azure Foundry icon.
 */
function getProviderIcon(provider: Provider): React.FC<{ className?: string }> | null {
  // Built-in providers use their registered icons
  if (!provider.isCustom && PROVIDER_ICONS[provider.id]) {
    return PROVIDER_ICONS[provider.id]
  }

  // Custom providers: check if name contains azure or foundry
  if (provider.isCustom) {
    const nameLower = provider.name.toLowerCase()
    if (nameLower.includes('azure') || nameLower.includes('foundry')) {
      return AzureFoundryIcon
    }
    return CustomProviderIcon
  }

  return null
}

// Isolated button component - only re-renders when its specific state changes
// Uses forwardRef to work with PopoverTrigger's asChild
const ModelSwitcherButton = forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof Button>
>(function ModelSwitcherButton(props, ref) {
  const modelsLoading = useAppStore((state) => state.modelsLoading)
  const providersLoading = useAppStore((state) => state.providersLoading)
  const models = useAppStore((state) => state.models)
  const providers = useAppStore((state) => state.providers)
  const currentModel = useAppStore((state) => state.currentModel)

  // Still loading if either models or providers are loading
  const isLoading = modelsLoading || providersLoading

  // Check if current model is a custom provider deployment (format: {providerId}:deployment)
  const isCustomDeployment = currentModel?.endsWith(':deployment')
  const customProviderId = isCustomDeployment ? currentModel.replace(':deployment', '') : null
  const customProvider = customProviderId ? providers.find((p) => p.id === customProviderId) : null

  const selectedModel = models.find((m) => m.id === currentModel)
  const currentModelProvider = selectedModel
    ? providers.find((p) => p.id === selectedModel.provider)
    : customProvider

  // Valid if we have a regular model with API key OR a custom deployment with API key
  const hasValidModel = !!(
    (selectedModel && currentModelProvider?.hasApiKey) ||
    (customProvider && customProvider.hasApiKey)
  )

  // Get display name
  const displayName = selectedModel?.id || (customProvider ? customProvider.name : null)

  // Render the appropriate icon for custom providers
  const renderCustomProviderIcon = (): React.ReactElement | null => {
    if (!customProvider) return null
    const nameLower = customProvider.name.toLowerCase()
    if (nameLower.includes('azure') || nameLower.includes('foundry')) {
      return <AzureFoundryIcon className="size-3.5" />
    }
    return <CustomProviderIcon className="size-3.5" />
  }

  return (
    <Button
      ref={ref}
      variant={isLoading ? 'ghost' : hasValidModel ? 'ghost' : 'outline'}
      size="sm"
      className={cn(
        'h-7 gap-1.5 px-2 text-xs cursor-pointer',
        isLoading
          ? 'text-muted-foreground'
          : hasValidModel
            ? 'text-muted-foreground hover:text-foreground'
            : 'text-amber-500 border-amber-500/50 hover:bg-amber-500/10'
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="size-3.5 animate-spin" />
          <span className="text-muted-foreground">Loading...</span>
        </>
      ) : hasValidModel && (selectedModel || customProvider) ? (
        <>
          {selectedModel
            ? PROVIDER_ICONS[selectedModel.provider]?.({ className: 'size-3.5' })
            : renderCustomProviderIcon()}
          <span className="font-mono">{displayName}</span>
        </>
      ) : (
        <span>Configure a Model</span>
      )}
      <ChevronDown className="size-3" />
    </Button>
  )
})

// Unified model/config item component
interface ModelItemProps {
  name: string
  isActive: boolean
  isPending: boolean // Waiting to switch when task finishes
  isRunning: boolean
  onSelect: () => void
  onEdit: () => void
}

function ModelItem({
  name,
  isActive,
  isPending,
  isRunning,
  onSelect,
  onEdit
}: ModelItemProps): React.ReactElement {
  function handleEdit(e: React.MouseEvent): void {
    e.stopPropagation()
    onEdit()
  }

  return (
    <div
      onClick={onSelect}
      className={cn(
        'flex items-center gap-1 px-2 py-1 rounded-sm text-xs transition-colors group cursor-pointer',
        isActive
          ? 'bg-muted text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
        isRunning && !isActive && !isPending && 'opacity-50'
      )}
    >
      <span className="flex-1 truncate text-left font-mono">{name}</span>
      {/* Active: large green check */}
      {isActive && !isPending && <Check className="size-3.5 shrink-0 text-green-500" />}
      {/* Pending: rotating yellow refresh icon */}
      {isPending && (
        <div className="shrink-0" title="Will switch when current task finishes">
          <RefreshCw className="size-3 text-yellow-500 animate-spin" />
        </div>
      )}
      {/* Inactive (not pending): small gray check on hover */}
      {!isActive && !isPending && (
        <Check className="size-2.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
      <button
        onClick={handleEdit}
        className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity cursor-pointer"
        title="Edit configuration"
      >
        <Pencil className="size-3" />
      </button>
    </div>
  )
}

export function ModelSwitcher(): React.ReactElement {
  const [open, setOpen] = useState(false)
  const [selectedProviderId, setSelectedProviderId] = useState<ProviderId | null>(null)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [configProviderId, setConfigProviderId] = useState<ProviderId | null>(null)
  const [editingConfig, setEditingConfig] = useState<SavedProviderConfig | null>(null)
  const [providerConfigs, setProviderConfigs] = useState<SavedProviderConfig[]>([])
  const [activeConfigId, setActiveConfigId] = useState<string | null>(null)
  const [providerDataLoading, setProviderDataLoading] = useState(false)

  // Models for the selected provider (for 'multi' type providers)
  const [providerModels, setProviderModels] = useState<ModelConfig[]>([])

  // Add model dialog state
  const [addModelDialogOpen, setAddModelDialogOpen] = useState(false)

  // Add provider dialog state
  const [addProviderDialogOpen, setAddProviderDialogOpen] = useState(false)

  // User providers (for custom provider API type lookup)
  const [userProviders, setUserProviders] = useState<UserProvider[]>([])

  // Pending switch state - for when user wants to switch but task is running
  const [pendingConfigId, setPendingConfigId] = useState<string | null>(null)
  const [pendingProviderId, setPendingProviderId] = useState<ProviderId | null>(null)
  const wasRunningRef = useRef(false)

  // Use selectors to minimize re-renders
  // Note: modelsLoading is NOT subscribed here - it's isolated in ModelSwitcherButton
  const models = useAppStore((state) => state.models)
  const providers = useAppStore((state) => state.providers)
  const currentModel = useAppStore((state) => state.currentModel)
  const loadModels = useAppStore((state) => state.loadModels)
  const loadProviders = useAppStore((state) => state.loadProviders)
  const setCurrentModel = useAppStore((state) => state.setCurrentModel)
  const loadingThreadId = useAppStore((state) => state.loadingThreadId)

  /**
   * Determines if a task/AI process is currently running.
   *
   * HOW THIS WORKS:
   * - `loadingThreadId` is set in ChatContainer.tsx based on `stream.isLoading`
   *   from the @langchain/langgraph-sdk useStream hook
   * - When the LangGraph agent is actively streaming a response, `stream.isLoading` is true
   * - This gets synced to the global store as `loadingThreadId = threadId`
   *
   * WHAT THIS COVERS:
   * - Agent invocations (user sends message, agent responds)
   * - Tool executions during agent runs
   * - Human-in-the-loop approval flows
   *
   * POTENTIAL GAPS (future features that might NOT be caught by this check):
   * - Background tasks not using LangGraph streaming (e.g., batch file operations)
   * - Long-running operations outside the agent (e.g., file indexing, embeddings)
   * - Multiple concurrent agent streams (currently only tracks one thread)
   * - Operations in the main process that don't emit stream events
   *
   * If adding new async features, consider:
   * 1. Using the existing loadingThreadId mechanism if it's a streaming operation
   * 2. Adding a separate loading state to the store for non-streaming operations
   * 3. Creating a unified "isBusy" computed property that combines all blocking states
   */
  const isRunning = !!loadingThreadId

  // Effect to apply pending config when task finishes
  useEffect(() => {
    // Detect transition from running to not running
    if (wasRunningRef.current && !isRunning && pendingConfigId && pendingProviderId) {
      // Task just finished, apply pending config
      applyPendingConfig()
    }
    wasRunningRef.current = isRunning
  }, [isRunning, pendingConfigId, pendingProviderId])

  async function applyPendingConfig(): Promise<void> {
    if (!pendingConfigId || !pendingProviderId) return

    try {
      await window.api.models.setActiveProviderConfigId(pendingProviderId, pendingConfigId)
      setActiveConfigId(pendingConfigId)
      loadProviders()
      loadModels()
    } catch (e) {
      console.error('Failed to apply pending config:', e)
    } finally {
      setPendingConfigId(null)
      setPendingProviderId(null)
    }
  }

  // Load user providers
  async function loadUserProviders(): Promise<void> {
    try {
      const providers = await window.api.providers.listUserProviders()
      setUserProviders(providers)
    } catch (e) {
      console.error('Failed to load user providers:', e)
    }
  }

  // Load models and providers on mount
  useEffect(() => {
    loadModels()
    loadProviders()
    loadUserProviders()
  }, [loadModels, loadProviders])

  // Use fallback providers if none loaded
  const displayProviders = providers.length > 0 ? providers : FALLBACK_PROVIDERS

  // When popover opens, set selected provider based on current model
  useEffect(() => {
    if (open) {
      let providerId: ProviderId | null = null
      if (currentModel) {
        // Check if it's a custom deployment (format: {providerId}:deployment)
        if (currentModel.endsWith(':deployment')) {
          providerId = currentModel.replace(':deployment', '')
        } else {
          // Regular model - find its provider
          const model = models.find((m) => m.id === currentModel)
          if (model) {
            providerId = model.provider
          }
        }
      }
      // Default to first provider if no current model
      if (!providerId && displayProviders.length > 0) {
        providerId = displayProviders[0].id
      }
      if (providerId) {
        setSelectedProviderId(providerId)
      }
    }
  }, [open, currentModel, models, displayProviders])

  // Load configs and models for selected provider (also reloads when popover opens)
  useEffect(() => {
    if (selectedProviderId && open) {
      loadProviderData(selectedProviderId)
    }
  }, [selectedProviderId, open])

  async function loadProviderData(providerId: ProviderId): Promise<void> {
    setProviderDataLoading(true)
    try {
      // Load configs
      const configs = await window.api.models.listProviderConfigs(providerId)
      console.log(`[ModelSwitcher] Provider ${providerId} configs:`, configs)
      setProviderConfigs(configs)

      // Get active config ID
      const activeConfig = await window.api.models.getActiveProviderConfigById(providerId)
      console.log(`[ModelSwitcher] Provider ${providerId} active config:`, activeConfig)
      setActiveConfigId(activeConfig?.id || null)

      // Load models for this provider (for 'multi' type providers)
      const models = await window.api.models.listByProvider(providerId)
      console.log(`[ModelSwitcher] Provider ${providerId} models:`, models)
      setProviderModels(models)
    } catch (e) {
      console.error('Failed to load provider data:', e)
      setProviderConfigs([])
      setActiveConfigId(null)
      setProviderModels([])
    } finally {
      setProviderDataLoading(false)
    }
  }

  // Reload data when dialog closes
  const reloadProviderData = useCallback(() => {
    if (selectedProviderId) {
      loadProviderData(selectedProviderId)
    }
  }, [selectedProviderId])

  const selectedProvider = displayProviders.find((p) => p.id === selectedProviderId)

  // Determine if this is a multi-model or deployment provider
  const isMultiModelProvider = selectedProvider?.modelSelection === 'multi'
  const isDeploymentProvider = selectedProvider?.modelSelection === 'deployment'

  // Debug: Log provider selection info when popover is open
  if (open && selectedProvider) {
    console.log(`[ModelSwitcher] Selected provider: ${selectedProvider.id}`, {
      modelSelection: selectedProvider.modelSelection,
      hasApiKey: selectedProvider.hasApiKey,
      isMultiModelProvider,
      isDeploymentProvider,
      providerModelsCount: providerModels.length,
      providerConfigsCount: providerConfigs.length
    })
  }

  function handleProviderClick(provider: Provider): void {
    setSelectedProviderId(provider.id)
  }

  function handleModelSelect(modelId: string): void {
    if (isRunning) return // Don't switch while running
    setCurrentModel(modelId)
    setOpen(false)
  }

  function handleModelEdit(_model: ModelConfig): void {
    void _model // Parameter required by callback signature but not used here
    // For models, edit the active provider config
    if (selectedProviderId && activeConfigId) {
      const activeConfig = providerConfigs.find((c) => c.id === activeConfigId)
      if (activeConfig) {
        setConfigProviderId(selectedProviderId)
        setEditingConfig(activeConfig)
        setConfigDialogOpen(true)
        return
      }
    }
    // If no config exists, create new one
    if (selectedProviderId) {
      setConfigProviderId(selectedProviderId)
      setEditingConfig(null)
      setConfigDialogOpen(true)
    }
  }

  function handleAddConfiguration(provider: Provider): void {
    setConfigProviderId(provider.id)
    // If provider already has configs, edit the active one instead of creating new
    if (providerConfigs.length > 0 && activeConfigId) {
      const activeConfig = providerConfigs.find((c) => c.id === activeConfigId)
      setEditingConfig(activeConfig || providerConfigs[0])
    } else {
      setEditingConfig(null) // Create new
    }
    setConfigDialogOpen(true)
  }

  function handleAddNewConfiguration(provider: Provider): void {
    setConfigProviderId(provider.id)
    setEditingConfig(null) // Create new
    setConfigDialogOpen(true)
  }

  function handleEditConfiguration(config: SavedProviderConfig): void {
    setConfigProviderId(selectedProviderId)
    setEditingConfig(config)
    setConfigDialogOpen(true)
  }

  async function handleSelectConfig(config: SavedProviderConfig): Promise<void> {
    if (!selectedProviderId) return

    // Check if this deployment is already the current model
    const deploymentModelId = `${selectedProviderId}:deployment`
    const isAlreadyCurrentModel = currentModel === deploymentModelId

    // If already active AND already current model, do nothing
    if (activeConfigId === config.id && isAlreadyCurrentModel && !pendingConfigId) {
      console.log('[ModelSwitcher] Config already active and current, closing popover')
      setOpen(false)
      return
    }

    // If running, set as pending instead of switching immediately
    if (isRunning) {
      setPendingConfigId(config.id)
      setPendingProviderId(selectedProviderId)
      return
    }

    // Clear any pending state
    setPendingConfigId(null)
    setPendingProviderId(null)

    console.log(
      '[ModelSwitcher] Activating config:',
      config.id,
      'for provider:',
      selectedProviderId
    )

    try {
      // Set this config as active for the provider
      await window.api.models.setActiveProviderConfigId(selectedProviderId, config.id)
      setActiveConfigId(config.id)

      // Set this deployment as the current model
      console.log('[ModelSwitcher] Setting current model to:', deploymentModelId)
      setCurrentModel(deploymentModelId)

      // Refresh providers to update hasApiKey status
      loadProviders()
      loadModels()

      // Close the popover after selection
      setOpen(false)
    } catch (e) {
      console.error('Failed to set active config:', e)
    }
  }

  function handleCancelPending(): void {
    setPendingConfigId(null)
    setPendingProviderId(null)
  }

  function handleConfigDialogClose(isOpen: boolean): void {
    setConfigDialogOpen(isOpen)
    if (!isOpen) {
      // Refresh data after dialog closes
      reloadProviderData()
      loadProviders()
      loadModels()
    }
  }

  async function handleAddModel(modelId: string, modelName: string): Promise<void> {
    if (!selectedProviderId || !modelId.trim()) return

    try {
      await window.api.models.addUserModel({
        id: modelId.trim(),
        name: modelName.trim() || modelId.trim(),
        provider: selectedProviderId,
        model: modelId.trim(), // API model name is the same as ID for custom models
        description: 'Custom model'
      })

      // Reload models
      reloadProviderData()
      loadModels()
      setAddModelDialogOpen(false)
    } catch (e) {
      console.error('Failed to add model:', e)
    }
  }

  async function handleAddProvider(
    name: string,
    apiType: ProviderApiType,
    presetType: ProviderPresetType
  ): Promise<void> {
    console.log('[ModelSwitcher] handleAddProvider called:', { name, apiType, presetType })
    if (!name.trim()) {
      console.log('[ModelSwitcher] Empty name, returning')
      return
    }

    try {
      console.log('[ModelSwitcher] Calling addUserProvider...')
      const newProvider = await window.api.providers.addUserProvider(
        name.trim(),
        apiType,
        presetType
      )
      console.log('[ModelSwitcher] Created provider:', newProvider)
      // Refresh providers list and user providers
      await loadProviders()
      await loadUserProviders()
      console.log('[ModelSwitcher] Providers reloaded')
      // Select the new provider
      setSelectedProviderId(newProvider.id)
      // Close the add provider dialog first
      setAddProviderDialogOpen(false)
      // Use a small delay to let the dialog close animation complete before opening the next one
      setTimeout(() => {
        // Open the config dialog to add the first deployment
        setConfigProviderId(newProvider.id)
        setEditingConfig(null) // Create new config
        setConfigDialogOpen(true)
        console.log('[ModelSwitcher] Config dialog should be open now')
      }, 100)
    } catch (e) {
      console.error('Failed to add provider:', e)
    }
  }

  async function handleDeleteProvider(providerId: string): Promise<void> {
    try {
      await window.api.providers.deleteUserProvider(providerId)
      // Refresh providers list and user providers
      await loadProviders()
      await loadUserProviders()
      // If the deleted provider was selected, select the first available provider
      if (selectedProviderId === providerId && displayProviders.length > 0) {
        setSelectedProviderId(displayProviders[0].id)
      }
    } catch (e) {
      console.error('Failed to delete provider:', e)
    }
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <ModelSwitcherButton />
        </PopoverTrigger>
        <PopoverContent
          className="w-[420px] p-0 bg-background border-border"
          align="start"
          sideOffset={8}
        >
          <div className="flex min-h-[280px]">
            {/* Provider column */}
            <div className="w-[140px] border-r border-border p-2 bg-muted/30">
              <div className="flex items-center justify-between px-2 py-1.5">
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Provider
                </div>
                <button
                  onClick={() => setAddProviderDialogOpen(true)}
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Add custom provider"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
              <div className="space-y-0.5">
                {displayProviders.map((provider) => {
                  const Icon = getProviderIcon(provider)
                  return (
                    <div
                      key={provider.id}
                      onClick={() => handleProviderClick(provider)}
                      className={cn(
                        'w-full flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs transition-colors text-left cursor-pointer group',
                        selectedProviderId === provider.id
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                    >
                      {Icon && <Icon className="size-3.5 shrink-0" />}
                      <span className="flex-1 truncate">{provider.name}</span>
                      {!provider.hasApiKey && (
                        <AlertCircle className="size-3 text-status-warning shrink-0" />
                      )}
                      {/* Delete button for custom providers */}
                      {provider.isCustom && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteProvider(provider.id)
                          }}
                          className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity cursor-pointer"
                          title="Delete provider"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Models column */}
            <div className="flex-1 p-2">
              <div className="flex items-center justify-between px-2 py-1.5">
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {isDeploymentProvider ? 'Deployments' : 'Model'}
                </div>
                <div className="flex items-center gap-1">
                  {/* Config button for multi-model providers (shows API key status) */}
                  {isMultiModelProvider && selectedProvider && (
                    <>
                      <button
                        onClick={() => handleAddConfiguration(selectedProvider)}
                        className={cn(
                          'flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded transition-colors cursor-pointer',
                          selectedProvider.hasApiKey
                            ? 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                            : 'text-status-warning hover:bg-status-warning/10'
                        )}
                        title={selectedProvider.hasApiKey ? 'Manage API Key' : 'Configure API Key'}
                      >
                        <Settings className="size-3" />
                        <span>{selectedProvider.hasApiKey ? 'API' : 'Configure'}</span>
                      </button>
                      <button
                        onClick={() => setAddModelDialogOpen(true)}
                        className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title="Add custom model"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </>
                  )}
                  {/* Config button for deployment providers */}
                  {isDeploymentProvider && selectedProvider && (
                    <>
                      {providerConfigs.length > 0 && (
                        <button
                          onClick={() => {
                            const configToEdit = activeConfigId
                              ? providerConfigs.find((c) => c.id === activeConfigId)
                              : providerConfigs[0]
                            if (configToEdit) {
                              handleEditConfiguration(configToEdit)
                            }
                          }}
                          className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded transition-colors cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          title="API Settings"
                        >
                          <Settings className="size-3" />
                          <span>API</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleAddNewConfiguration(selectedProvider)}
                        className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title="Add deployment"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {selectedProvider && !selectedProvider.hasApiKey && isMultiModelProvider ? (
                // No API key configured (only for multi-model providers)
                <div className="flex flex-col items-center justify-center h-[200px] px-4 text-center">
                  <Key className="size-6 text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground mb-3">
                    Configuration required for {selectedProvider.name}
                  </p>
                  <Button size="sm" onClick={() => handleAddConfiguration(selectedProvider)}>
                    Configure
                  </Button>
                </div>
              ) : isMultiModelProvider ? (
                // MULTI-MODEL PROVIDERS (Anthropic, OpenAI, Google)
                // Show model list
                <div className="flex flex-col h-[240px]">
                  <div className="overflow-y-auto flex-1 space-y-0.5">
                    {/* Loading state */}
                    {providerDataLoading ? (
                      <div className="flex items-center gap-2 px-2 py-4">
                        <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Loading models...</span>
                      </div>
                    ) : (
                      <>
                        {/* Models list */}
                        {providerModels.map((model) => (
                          <ModelItem
                            key={model.id}
                            name={model.name || model.id}
                            isActive={currentModel === model.id}
                            isPending={false}
                            isRunning={isRunning}
                            onSelect={() => handleModelSelect(model.id)}
                            onEdit={() => handleModelEdit(model)}
                          />
                        ))}

                        {/* Show message if no models */}
                        {providerModels.length === 0 && (
                          <p className="text-xs text-muted-foreground px-2 py-4">
                            No models available
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                // DEPLOYMENT PROVIDERS (Azure)
                // Show configs as models - each config IS a deployment
                <div className="flex flex-col h-[240px]">
                  <div className="overflow-y-auto flex-1 space-y-0.5">
                    {/* Loading state */}
                    {providerDataLoading ? (
                      <div className="flex items-center gap-2 px-2 py-4">
                        <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Loading deployments...
                        </span>
                      </div>
                    ) : (
                      <>
                        {/* Deployments (configs) */}
                        {providerConfigs.map((config) => {
                          // For deployments, isActive should be true ONLY if:
                          // 1. This is the active config for this provider AND
                          // 2. This provider's deployment is the current model
                          const isCurrentProviderDeployment =
                            currentModel === `${selectedProviderId}:deployment`
                          const isActiveDeployment =
                            activeConfigId === config.id && isCurrentProviderDeployment

                          return (
                            <ModelItem
                              key={config.id}
                              name={config.name}
                              isActive={isActiveDeployment}
                              isPending={pendingConfigId === config.id}
                              isRunning={isRunning}
                              onSelect={() => handleSelectConfig(config)}
                              onEdit={() => handleEditConfiguration(config)}
                            />
                          )
                        })}

                        {/* Show message if no configs */}
                        {providerConfigs.length === 0 && (
                          <p className="text-xs text-muted-foreground px-2 py-4">
                            No deployments configured
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Pending switch status message */}
                  {pendingConfigId && isRunning && (
                    <div className="border-t border-border mt-2 pt-2 px-2">
                      <div className="flex items-center gap-2 text-xs">
                        <RefreshCw className="size-3 text-yellow-500 animate-spin shrink-0" />
                        <span className="flex-1 text-muted-foreground">
                          Will switch when task finishes
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs"
                          onClick={handleCancelPending}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <ProviderConfigDialog
        open={configDialogOpen}
        onOpenChange={handleConfigDialogClose}
        providerId={configProviderId}
        editingConfig={editingConfig}
        userProviders={userProviders}
        existingConfigs={configProviderId === selectedProviderId ? providerConfigs : []}
      />

      <AddModelDialog
        open={addModelDialogOpen}
        onOpenChange={setAddModelDialogOpen}
        onSave={handleAddModel}
        providerName={selectedProvider?.name || ''}
      />

      <AddProviderDialog
        open={addProviderDialogOpen}
        onOpenChange={setAddProviderDialogOpen}
        onSave={handleAddProvider}
      />
    </>
  )
}

// Simple dialog for adding a custom model
function AddModelDialog({
  open,
  onOpenChange,
  onSave,
  providerName
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (modelId: string, modelName: string) => void
  providerName: string
}): React.ReactElement | null {
  const [modelId, setModelId] = useState('')
  const [modelName, setModelName] = useState('')

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    if (modelId.trim()) {
      onSave(modelId, modelName)
      setModelId('')
      setModelName('')
    }
  }

  function handleClose(): void {
    setModelId('')
    setModelName('')
    onOpenChange(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-50 w-[400px] bg-background border border-border rounded-lg shadow-lg p-4">
        <h3 className="text-sm font-medium mb-4">Add Custom Model for {providerName}</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Model ID (required)
            </label>
            <input
              type="text"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              placeholder="e.g., claude-3-opus-20240229"
              className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              The exact model identifier used by the API
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Display Name (optional)
            </label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="e.g., Claude 3 Opus"
              className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!modelId.trim()}>
              Add Model
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
