export type FileType = 'image' | 'video' | 'audio' | 'pdf' | 'code' | 'text' | 'binary'

interface FileTypeInfo {
  type: FileType
  mimeType?: string
  canPreview: boolean
}

const IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'svg',
  'webp',
  'bmp',
  'ico',
  'tiff',
  'tif'
])

const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'ogg', 'ogv', 'mov', 'avi', 'wmv', 'flv', 'mkv'])

const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'oga', 'm4a', 'flac', 'aac', 'weba'])

const PDF_EXTENSIONS = new Set(['pdf'])

const CODE_EXTENSIONS = new Set([
  'ts',
  'tsx',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'py',
  'java',
  'c',
  'cpp',
  'h',
  'hpp',
  'cs',
  'go',
  'rs',
  'rb',
  'php',
  'json',
  'xml',
  'yaml',
  'yml',
  'toml',
  'css',
  'scss',
  'sass',
  'less',
  'html',
  'htm',
  'vue',
  'svelte',
  'md',
  'mdx',
  'markdown',
  'sh',
  'bash',
  'zsh',
  'fish',
  'sql',
  'graphql',
  'proto',
  'dockerfile',
  'makefile'
])

const TEXT_EXTENSIONS = new Set([
  'txt',
  'log',
  'csv',
  'tsv',
  'env',
  'gitignore',
  'editorconfig',
  'conf',
  'config',
  'ini',
  'cfg'
])

export function getFileType(fileName: string): FileTypeInfo {
  const ext = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : undefined

  if (!ext) {
    return { type: 'text', canPreview: true }
  }

  if (IMAGE_EXTENSIONS.has(ext)) {
    return {
      type: 'image',
      mimeType: getMimeType(ext),
      canPreview: true
    }
  }

  if (VIDEO_EXTENSIONS.has(ext)) {
    return {
      type: 'video',
      mimeType: getMimeType(ext),
      canPreview: true
    }
  }

  if (AUDIO_EXTENSIONS.has(ext)) {
    return {
      type: 'audio',
      mimeType: getMimeType(ext),
      canPreview: true
    }
  }

  if (PDF_EXTENSIONS.has(ext)) {
    return {
      type: 'pdf',
      mimeType: 'application/pdf',
      canPreview: true
    }
  }

  if (CODE_EXTENSIONS.has(ext)) {
    return {
      type: 'code',
      canPreview: true
    }
  }

  if (TEXT_EXTENSIONS.has(ext)) {
    return {
      type: 'text',
      canPreview: true
    }
  }

  return {
    type: 'binary',
    canPreview: false
  }
}

function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    // Images
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    bmp: 'image/bmp',
    ico: 'image/x-icon',
    tiff: 'image/tiff',
    tif: 'image/tiff',

    // Video
    mp4: 'video/mp4',
    webm: 'video/webm',
    ogg: 'video/ogg',
    ogv: 'video/ogg',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    wmv: 'video/x-ms-wmv',
    flv: 'video/x-flv',
    mkv: 'video/x-matroska',

    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    oga: 'audio/ogg',
    m4a: 'audio/mp4',
    flac: 'audio/flac',
    aac: 'audio/aac',
    weba: 'audio/webm',

    // PDF
    pdf: 'application/pdf'
  }

  return mimeTypes[ext] || 'application/octet-stream'
}

export function isBinaryFile(fileName: string): boolean {
  const { type } = getFileType(fileName)
  return (
    type === 'image' || type === 'video' || type === 'audio' || type === 'pdf' || type === 'binary'
  )
}
