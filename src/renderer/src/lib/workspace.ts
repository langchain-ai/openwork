import type { FileInfo } from '@/types'

export async function selectWorkspaceFolder(
  currentThreadId: string | null,
  setWorkspacePath: (path: string | null) => void,
  setWorkspaceFiles: (files: FileInfo[]) => void,
  setLoading: (loading: boolean) => void,
  setOpen?: (open: boolean) => void
): Promise<void> {
  if (!currentThreadId) return
  setLoading(true)
  try {
    const path = await window.api.workspace.select(currentThreadId)
    if (path) {
      setWorkspacePath(path)
      const result = await window.api.workspace.loadFromDisk(currentThreadId)
      if (result.success && result.files) {
        setWorkspaceFiles(result.files)
      }
    }
    if (setOpen) setOpen(false)
  } catch (e) {
    console.error('[WorkspacePicker] Select folder error:', e)
  } finally {
    setLoading(false)
  }
}
