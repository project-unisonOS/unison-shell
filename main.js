import { app, BrowserWindow } from 'electron'
import path from 'node:path'

const isDev = !app.isPackaged

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreen: false,
    webPreferences: {
      preload: path.join(process.cwd(), 'preload.js'),
    },
  })

  win.setTitle('Unison Shell')
  win.loadFile(path.join(process.cwd(), 'renderer', 'index.html'))

  if (isDev) {
    win.webContents.openDevTools({ mode: 'detach' })
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
