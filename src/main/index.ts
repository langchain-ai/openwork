import { app, shell, BrowserWindow, ipcMain, nativeImage } from 'electron'
import { join } from 'path'
import { registerAgentHandlers } from './ipc/agent'
import { registerThreadHandlers } from './ipc/threads'
import { registerModelHandlers } from './ipc/models'
import { initializeDatabase } from './db'
import { migrateEnvToJsonConfigs } from './storage'

let mainWindow: BrowserWindow | null = null

// Simple dev check - replaces @electron-toolkit/utils is.dev
const isDev = !app.isPackaged

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    show: false,
    backgroundColor: '#0D0D0F',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer based on electron-vite cli
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

console.log('[OpenWork] Main process starting...')

app.whenReady().then(async () => {
  console.log('[OpenWork] App is ready, initializing...')
  // Set app user model id for windows
  if (process.platform === 'win32') {
    app.setAppUserModelId(isDev ? process.execPath : 'com.langchain.openwork')
  }

  // Set dock icon on macOS
  if (process.platform === 'darwin' && app.dock) {
    const iconPath = join(__dirname, '../../resources/icon.png')
    try {
      const icon = nativeImage.createFromPath(iconPath)
      if (!icon.isEmpty()) {
        app.dock.setIcon(icon)
      }
    } catch {
      // Icon not found, use default
    }
  }

  // Default open or close DevTools by F12 in development
  if (isDev) {
    app.on('browser-window-created', (_, window) => {
      window.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F12') {
          window.webContents.toggleDevTools()
          event.preventDefault()
        }
      })
    })
  }

  // Initialize database
  await initializeDatabase()

  // Migrate existing .env configs to JSON format (runs once)
  migrateEnvToJsonConfigs()

  // Register IPC handlers
  registerAgentHandlers(ipcMain)
  registerThreadHandlers(ipcMain)
  registerModelHandlers(ipcMain)

  // Debug: Log available models and configs on startup
  console.log('\n========== OPENWORK STARTUP DEBUG ==========')
  const { getAvailableModels } = await import('./ipc/models')
  const { getProviderConfigs, hasProviderConfig } = await import('./storage')

  const models = getAvailableModels()
  console.log(`[OpenWork] Total available models: ${models.length}`)

  // Group models by provider
  const modelsByProvider: Record<string, string[]> = {}
  for (const m of models) {
    if (!modelsByProvider[m.provider]) modelsByProvider[m.provider] = []
    modelsByProvider[m.provider].push(m.id)
  }
  console.log('[OpenWork] Models by provider:', modelsByProvider)

  // Log provider configs
  const providerIds = ['anthropic', 'openai', 'azure', 'google']
  console.log('[OpenWork] Provider configuration status:')
  for (const providerId of providerIds) {
    const configs = getProviderConfigs(providerId)
    const hasConfig = hasProviderConfig(providerId)
    console.log(
      `  ${providerId}: hasConfig=${hasConfig}, configs=${configs.length}`,
      configs.length > 0 ? configs.map((c) => c.name) : ''
    )
  }
  console.log('=============================================\n')

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
