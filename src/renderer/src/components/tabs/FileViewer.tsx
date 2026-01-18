import { useEffect, useState, useMemo } from 'react'
import { Loader2, AlertCircle, FileCode } from 'lucide-react'
import { useCurrentThread } from '@/lib/thread-context'
import { getFileType, isBinaryFile } from '@/lib/file-types'
import { CodeViewer } from './CodeViewer'
import { ImageViewer } from './ImageViewer'
import { MediaViewer } from './MediaViewer'
import { PDFViewer } from './PDFViewer'
import { BinaryFileViewer } from './BinaryFileViewer'

interface FileViewerProps {
  filePath: string
  threadId: string
}

export function FileViewer({ filePath, threadId }: FileViewerProps): React.JSX.Element | null {
  const { fileContents, setFileContents } = useCurrentThread(threadId)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [binaryContent, setBinaryContent] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<number | undefined>()

  // Get file type info
  const fileName = filePath.split('/').pop() || filePath
  const fileTypeInfo = useMemo(() => getFileType(fileName), [fileName])
  const isBinary = useMemo(() => isBinaryFile(fileName), [fileName])

  // Get cached content or load it
  const content = fileContents[filePath]

  // Reset state when filePath changes
  useEffect(() => {
    setError(null)
    setBinaryContent(null)
    setFileSize(undefined)
  }, [filePath])

  // Load file content (text or binary depending on file type)
  useEffect(() => {
    async function loadFile(): Promise<void> {
      // Skip if already loaded
      if (content !== undefined || binaryContent !== null) {
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        if (isBinary) {
          // Read as binary file (base64)
          const result = await window.api.workspace.readBinaryFile(threadId, filePath)
          if (result.success && result.content !== undefined) {
            setBinaryContent(result.content)
            setFileSize(result.size)
          } else {
            setError(result.error || 'Failed to read file')
          }
        } else {
          // Read as text file
          const result = await window.api.workspace.readFile(threadId, filePath)
          if (result.success && result.content !== undefined) {
            setFileContents(filePath, result.content)
            setFileSize(result.size)
          } else {
            setError(result.error || 'Failed to read file')
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to read file')
      } finally {
        setIsLoading(false)
      }
    }

    loadFile()
  }, [threadId, filePath, content, binaryContent, setFileContents, isBinary])

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin mr-2" />
        <span>Loading file...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground gap-3 p-8">
        <AlertCircle className="size-10 text-status-critical" />
        <div className="text-center">
          <div className="font-medium text-foreground mb-1">Failed to load file</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    )
  }

  if (content === undefined && binaryContent === null) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <FileCode className="size-6 mr-2" />
        <span>No content</span>
      </div>
    )
  }

  // Route to appropriate viewer based on file type
  if (fileTypeInfo.type === 'image' && binaryContent) {
    return (
      <ImageViewer
        filePath={filePath}
        base64Content={binaryContent}
        mimeType={fileTypeInfo.mimeType || 'image/png'}
      />
    )
  }

  if (fileTypeInfo.type === 'video' && binaryContent) {
    return (
      <MediaViewer
        filePath={filePath}
        base64Content={binaryContent}
        mimeType={fileTypeInfo.mimeType || 'video/mp4'}
        mediaType="video"
      />
    )
  }

  if (fileTypeInfo.type === 'audio' && binaryContent) {
    return (
      <MediaViewer
        filePath={filePath}
        base64Content={binaryContent}
        mimeType={fileTypeInfo.mimeType || 'audio/mpeg'}
        mediaType="audio"
      />
    )
  }

  if (fileTypeInfo.type === 'pdf' && binaryContent) {
    return <PDFViewer filePath={filePath} base64Content={binaryContent} />
  }

  if (fileTypeInfo.type === 'binary') {
    return <BinaryFileViewer filePath={filePath} size={fileSize} />
  }

  // Default to code/text viewer
  if (content !== undefined) {
    return <CodeViewer filePath={filePath} content={content} />
  }

  return null
}
