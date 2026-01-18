import { useEffect, useState, useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { createHighlighterCore, type HighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'

// Import bundled themes and languages
import githubDarkDefault from 'shiki/themes/github-dark-default.mjs'
import langTypescript from 'shiki/langs/typescript.mjs'
import langTsx from 'shiki/langs/tsx.mjs'
import langJavascript from 'shiki/langs/javascript.mjs'
import langJsx from 'shiki/langs/jsx.mjs'
import langPython from 'shiki/langs/python.mjs'
import langJson from 'shiki/langs/json.mjs'
import langCss from 'shiki/langs/css.mjs'
import langHtml from 'shiki/langs/html.mjs'
import langMarkdown from 'shiki/langs/markdown.mjs'
import langYaml from 'shiki/langs/yaml.mjs'
import langBash from 'shiki/langs/bash.mjs'
import langSql from 'shiki/langs/sql.mjs'

// Singleton highlighter instance (using JS engine - no WASM needed)
let highlighterPromise: Promise<HighlighterCore> | null = null

async function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [githubDarkDefault],
      langs: [
        langTypescript,
        langTsx,
        langJavascript,
        langJsx,
        langPython,
        langJson,
        langCss,
        langHtml,
        langMarkdown,
        langYaml,
        langBash,
        langSql
      ],
      engine: createJavaScriptRegexEngine()
    })
  }
  return highlighterPromise
}

interface CodeViewerProps {
  filePath: string
  content: string
}

// Map file extensions to Shiki language identifiers (only languages we've loaded)
const SUPPORTED_LANGS = new Set([
  'typescript',
  'tsx',
  'javascript',
  'jsx',
  'python',
  'json',
  'css',
  'html',
  'markdown',
  'yaml',
  'bash',
  'sql'
])

function getLanguage(ext: string | undefined): string | null {
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    mjs: 'javascript',
    cjs: 'javascript',
    py: 'python',
    json: 'json',
    css: 'css',
    html: 'html',
    htm: 'html',
    md: 'markdown',
    mdx: 'markdown',
    yaml: 'yaml',
    yml: 'yaml',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    sql: 'sql'
  }

  const lang = ext ? langMap[ext] : null
  return lang && SUPPORTED_LANGS.has(lang) ? lang : null
}

export function CodeViewer({ filePath, content }: CodeViewerProps) {
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null)

  // Get file extension for syntax highlighting
  const fileName = filePath.split('/').pop() || filePath
  const ext = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : undefined
  const language = useMemo(() => getLanguage(ext), [ext])

  // Highlight code with Shiki
  useEffect(() => {
    let cancelled = false

    async function highlight() {
      if (content === undefined || language === null) {
        setHighlightedHtml(null)
        return
      }

      try {
        console.log('[CodeViewer] Starting highlight for', language)
        const highlighter = await getHighlighter()

        if (cancelled) return

        const html = highlighter.codeToHtml(content, {
          lang: language,
          theme: 'github-dark-default'
        })

        if (cancelled) return

        console.log('[CodeViewer] Highlighting complete, html length:', html.length)
        setHighlightedHtml(html)
      } catch (e) {
        console.error('[CodeViewer] Shiki highlighting failed:', e)
        setHighlightedHtml(null)
      }
    }

    highlight()

    return () => {
      cancelled = true
    }
  }, [content, language])

  const lineCount = content?.split('\n').length ?? 0

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      {/* File path header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-background/50 text-xs text-muted-foreground shrink-0">
        <span className="truncate">{filePath}</span>
        <span className="text-muted-foreground/50">•</span>
        <span>{lineCount} lines</span>
        <span className="text-muted-foreground/50">•</span>
        <span className="text-muted-foreground/70">{language || 'plain text'}</span>
      </div>

      {/* File content with syntax highlighting */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="shiki-wrapper">
          {highlightedHtml ? (
            <div className="shiki-content" dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
          ) : (
            // Fallback plain text rendering
            <pre className="p-4 text-sm font-mono leading-relaxed whitespace-pre-wrap break-all">
              {content}
            </pre>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
