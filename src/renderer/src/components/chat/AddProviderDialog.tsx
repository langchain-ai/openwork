import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { API_TYPE_INFO, PRESET_INFO } from '../../../../shared/providers'
import type { ProviderApiType, ProviderPresetType } from '@/types'

interface AddProviderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (name: string, apiType: ProviderApiType, presetType: ProviderPresetType) => void
}

const API_TYPES: ProviderApiType[] = ['openai', 'anthropic', 'google', 'azure']
const PRESET_TYPES: ProviderPresetType[] = ['api', 'aws-iam', 'google-cloud']

export function AddProviderDialog({
  open,
  onOpenChange,
  onSave
}: AddProviderDialogProps): React.ReactElement {
  const [name, setName] = useState('')
  const [apiType, setApiType] = useState<ProviderApiType>('openai')
  const [presetType, setPresetType] = useState<ProviderPresetType>('api')

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    if (name.trim()) {
      onSave(name.trim(), apiType, presetType)
      // Reset form
      setName('')
      setApiType('openai')
      setPresetType('api')
    }
  }

  function handleClose(): void {
    setName('')
    setApiType('openai')
    setPresetType('api')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add Custom Provider</DialogTitle>
          <DialogDescription>
            Create a custom provider for services like AWS Bedrock, Azure AI Foundry, Together.ai,
            Vertex AI, or other LLM APIs.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* Provider Name */}
          <div className="space-y-2">
            <label htmlFor="provider-name" className="text-sm font-medium">
              Provider Name
            </label>
            <Input
              id="provider-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., AWS Bedrock, My Local LLM"
              autoFocus
            />
          </div>

          {/* Preset Type (Authentication Pattern) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Authentication Type</label>
            <p className="text-xs text-muted-foreground">How you authenticate with this provider</p>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {PRESET_TYPES.map((type) => {
                const info = PRESET_INFO[type]
                const isSelected = presetType === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPresetType(type)}
                    className={`p-3 rounded-md border text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/50'
                    }`}
                  >
                    <div className="text-sm font-medium">{info.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{info.description}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* API Type (only show for 'api' preset) */}
          {presetType === 'api' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">API Format</label>
              <p className="text-xs text-muted-foreground">
                Which API format does this provider use? This determines how requests are sent.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {API_TYPES.map((type) => {
                  const info = API_TYPE_INFO[type]
                  const isSelected = apiType === type
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setApiType(type)}
                      className={`p-3 rounded-md border text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/50'
                      }`}
                    >
                      <div className="text-sm font-medium">{info.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{info.description}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Create Provider
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
