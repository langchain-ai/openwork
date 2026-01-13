import { useEffect } from 'react'
import { ChevronDown, AlertCircle } from 'lucide-react'
import { useAppStore } from '@/lib/store'

export function ModelSelector() {
  const { models, currentModel, loadModels, setCurrentModel } = useAppStore()

  useEffect(() => {
    loadModels()
  }, [loadModels])

  const selectedModel = models.find(m => m.id === currentModel)

  return (
    <div className="space-y-2">
      <div className="text-section-header">MODEL</div>
      <div className="relative">
        <select
          value={currentModel}
          onChange={(e) => setCurrentModel(e.target.value)}
          className="w-full appearance-none rounded-sm border border-border bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {models.map((model) => (
            <option 
              key={model.id} 
              value={model.id}
              disabled={!model.available}
            >
              {model.name} {!model.available && '(No API key)'}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
      </div>
      {selectedModel && !selectedModel.available && (
        <div className="flex items-center gap-1 text-[10px] text-status-warning">
          <AlertCircle className="size-3" />
          API key required
        </div>
      )}
    </div>
  )
}
