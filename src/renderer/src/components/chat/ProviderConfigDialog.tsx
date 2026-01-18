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
import {
  PROVIDER_REGISTRY,
  isBuiltInProvider,
  getFieldsForPreset,
  getNameFieldForPreset,
  type FieldConfig
} from '../../../../shared/providers'
import type { ProviderId, SavedProviderConfig, UserProvider } from '@/types'

type ProviderConfig = Record<string, string>

/**
 * Extract api-version query parameter from a URL string.
 * Handles both `api-version` and `apiVersion` parameter names.
 */
function extractApiVersionFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url)
    // Try common parameter names
    const version = urlObj.searchParams.get('api-version') || urlObj.searchParams.get('apiVersion')
    return version
  } catch {
    // Not a valid URL, try regex as fallback
    const match = url.match(/[?&]api-version=([^&]+)/i)
    return match ? match[1] : null
  }
}

interface ProviderConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  providerId: ProviderId | null
  // Optional: existing config to edit (if not provided, creates new)
  editingConfig?: SavedProviderConfig | null
  // Optional: user providers list for looking up custom provider preset types
  userProviders?: UserProvider[]
  // Optional: existing configs for prepopulation when adding new config
  existingConfigs?: SavedProviderConfig[]
}

export function ProviderConfigDialog({
  open,
  onOpenChange,
  providerId,
  editingConfig,
  userProviders = [],
  existingConfigs = []
}: ProviderConfigDialogProps): React.ReactElement | null {
  const [config, setConfig] = useState<ProviderConfig>({})
  const [showFields, setShowFields] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [hasExistingConfig, setHasExistingConfig] = useState(false)
  const [configId, setConfigId] = useState<string | null>(null)

  // Get provider metadata - handle both built-in and custom providers
  const isCustomProvider = providerId ? !isBuiltInProvider(providerId) : false
  const provider =
    providerId && isBuiltInProvider(providerId) ? PROVIDER_REGISTRY[providerId] : null

  // For custom providers, look up the preset type
  const customProvider = isCustomProvider ? userProviders.find((p) => p.id === providerId) : null
  const customPresetType = customProvider?.presetType || 'api'

  // Get fields based on provider type
  const fields = isCustomProvider ? getFieldsForPreset(customPresetType) : provider?.fields || []
  const nameField = isCustomProvider
    ? getNameFieldForPreset(customPresetType)
    : provider?.nameField || ''

  // Reset state when dialog opens/closes or provider changes
  useEffect(() => {
    if (open && providerId) {
      if (editingConfig) {
        // Editing existing config
        setHasExistingConfig(true)
        setConfigId(editingConfig.id)

        // For password fields, clear the value but track that it exists
        const displayConfig: ProviderConfig = {}
        for (const field of fields) {
          if (field.type === 'password' && editingConfig.config[field.key]) {
            displayConfig[field.key] = '' // Don't show actual password
          } else {
            displayConfig[field.key] = editingConfig.config[field.key] || ''
          }
        }
        setConfig(displayConfig)
      } else {
        // Creating new config
        setHasExistingConfig(false)
        setConfigId(null)

        // Initialize with prepopulated values from existing configs (except passwords and name field)
        const initialConfig: ProviderConfig = {}
        const latestConfig = existingConfigs.length > 0 ? existingConfigs[0] : null

        for (const field of fields) {
          // Don't prepopulate password fields or the name field (should be unique)
          if (field.type === 'password' || field.key === nameField) {
            initialConfig[field.key] = ''
          } else if (latestConfig && latestConfig.config[field.key]) {
            // Prepopulate from latest existing config
            initialConfig[field.key] = latestConfig.config[field.key]
          } else {
            initialConfig[field.key] = ''
          }
        }
        setConfig(initialConfig)
      }
      setShowFields({})
    }
  }, [open, providerId, editingConfig, existingConfigs])

  function handleFieldChange(key: string, value: string): void {
    setConfig((prev) => {
      const newConfig = { ...prev, [key]: value }

      // Auto-extract api-version from URL fields
      const field = fields.find((f) => f.key === key)
      if (field?.type === 'url' && value) {
        const extractedVersion = extractApiVersionFromUrl(value)
        if (extractedVersion) {
          // Find the apiVersion field and update it if it exists and is empty or different
          const apiVersionField = fields.find((f) => f.key === 'apiVersion')
          if (apiVersionField && (!prev.apiVersion || prev.apiVersion !== extractedVersion)) {
            newConfig.apiVersion = extractedVersion
          }
        }
      }

      return newConfig
    })
  }

  function toggleShowField(key: string): void {
    setShowFields((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSave(): Promise<void> {
    if (!providerId) return
    // For built-in providers, we need the provider metadata; for custom, we have fields
    if (!isCustomProvider && !provider) return

    // Validation is handled by canSave, but double-check here
    if (!canSave) return

    setSaving(true)
    try {
      // Build final config, merging with existing for empty password fields
      // Trim all string values to remove accidental whitespace
      const finalConfig: ProviderConfig = {}
      for (const [key, value] of Object.entries(config)) {
        finalConfig[key] = typeof value === 'string' ? value.trim() : value
      }

      if (hasExistingConfig && editingConfig) {
        // Keep existing password values if new ones are empty
        for (const field of fields) {
          if (field.type === 'password' && !finalConfig[field.key]) {
            finalConfig[field.key] = editingConfig.config[field.key]
          }
        }
      }

      // Get the config name from the nameField
      const configName = nameField ? finalConfig[nameField] || 'Default' : 'Default'

      // Create the SavedProviderConfig object
      const savedConfig: SavedProviderConfig = {
        id: configId || crypto.randomUUID(),
        name: configName,
        config: finalConfig,
        createdAt: editingConfig?.createdAt || new Date().toISOString()
      }

      await window.api.models.saveProviderConfigById(providerId, savedConfig)
      onOpenChange(false)
    } catch (e) {
      console.error('Failed to save provider config:', e)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(): Promise<void> {
    if (!providerId || !configId) return

    setDeleting(true)
    try {
      await window.api.models.deleteProviderConfigById(providerId, configId)
      onOpenChange(false)
    } catch (e) {
      console.error('Failed to delete provider config:', e)
    } finally {
      setDeleting(false)
    }
  }

  // Check if we can save - all required fields must have values
  // For existing configs, password fields can be empty (keeps existing value)
  const canSave = fields.every((field) => {
    const value = config[field.key]
    // For password fields with existing config, empty is OK (keeps existing)
    if (field.type === 'password' && hasExistingConfig && !value) {
      return true
    }
    // apiVersion is always optional
    if (field.key === 'apiVersion') {
      return true
    }
    // All other fields need a value
    return !!value
  })

  // For built-in providers, we need provider metadata; for custom providers, we have fields
  if (!providerId || (!isCustomProvider && !provider)) return null

  // Get provider name for display
  const providerDisplayName = isCustomProvider
    ? customProvider?.name || 'Custom Provider'
    : provider!.name

  const dialogTitle = hasExistingConfig
    ? `Edit ${providerDisplayName} Configuration`
    : `Add ${providerDisplayName} Configuration`

  const dialogDescription = hasExistingConfig
    ? `Update your ${providerDisplayName} settings.${fields.some((f) => f.type === 'password') ? ' Leave password fields blank to keep existing values.' : ''}`
    : existingConfigs.length > 0
      ? `Add another model configuration. Fields are prepopulated from your existing config.`
      : `Enter your ${providerDisplayName} credentials.`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {fields.map((field) => (
            <FieldInput
              key={field.key}
              field={field}
              value={config[field.key] || ''}
              onChange={(value) => handleFieldChange(field.key, value)}
              onBlur={
                field.type === 'url'
                  ? () => handleFieldChange(field.key, config[field.key] || '')
                  : undefined
              }
              onPaste={
                field.type === 'url'
                  ? (pastedValue) => {
                      // Extract API version from pasted URL immediately
                      const extractedVersion = extractApiVersionFromUrl(pastedValue)
                      if (extractedVersion) {
                        const apiVersionField = fields.find((f) => f.key === 'apiVersion')
                        if (apiVersionField) {
                          setConfig((prev) => ({ ...prev, apiVersion: extractedVersion }))
                        }
                      }
                    }
                  : undefined
              }
              showValue={showFields[field.key] || false}
              onToggleShow={() => toggleShowField(field.key)}
              hasExistingValue={hasExistingConfig && field.type === 'password'}
            />
          ))}
        </div>

        <div className="flex justify-between pt-2">
          {hasExistingConfig ? (
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
              Remove
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={!canSave || saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Individual field input component
interface FieldInputProps {
  field: FieldConfig
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  onPaste?: (pastedValue: string) => void
  showValue: boolean
  onToggleShow: () => void
  hasExistingValue: boolean
}

function FieldInput({
  field,
  value,
  onChange,
  onBlur,
  onPaste,
  showValue,
  onToggleShow,
  hasExistingValue
}: FieldInputProps): React.ReactElement {
  const isPassword = field.type === 'password'
  const isUrl = field.type === 'url'
  const inputType = isPassword ? (showValue ? 'text' : 'password') : isUrl ? 'url' : 'text'
  const hasRightButton = isPassword

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>): void {
    if (onPaste) {
      const pastedText = e.clipboardData.getData('text')
      // Let the default paste happen, then call onPaste with the full value
      setTimeout(() => {
        onPaste(pastedText)
      }, 0)
    }
  }

  return (
    <div className="space-y-2">
      <label htmlFor={`field-${field.key}`} className="text-sm font-medium">
        {field.label}
      </label>
      <div className="relative">
        <Input
          id={`field-${field.key}`}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onPaste={handlePaste}
          placeholder={hasExistingValue ? '••••••••••••••••' : field.placeholder}
          className={hasRightButton ? 'pr-10' : ''}
        />
        {isPassword && (
          <button
            type="button"
            onClick={onToggleShow}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showValue ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
      {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
    </div>
  )
}
