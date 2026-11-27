const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const INDEX_FILE = path.join(__dirname, 'index.html')
const INDEX_URL = pathToFileURL(INDEX_FILE).href

// Alleen onze eigen pagina mag IPC-verzoeken doen.
function isTrustedSender (frame) {
  return frame != null && frame.url === INDEX_URL
}

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, // pagina en preload in gescheiden werelden
      nodeIntegration: false, // geen require()/Node in de pagina
      sandbox: true // renderer draait in de OS-sandbox
    }
  })

  // Geen nieuwe vensters en geen navigatie weg van onze eigen pagina.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== INDEX_URL) event.preventDefault()
  })

  win.loadFile(INDEX_FILE)
  return win
}

// invoke/handle: één verzoek, één antwoord (een Promise) in plaats van twee losse kanalen.
ipcMain.handle('dialog:openFile', async (event) => {
  if (!isTrustedSender(event.senderFrame)) {
    throw new Error('IPC-verzoek van onbekende afzender geweigerd')
  }
  const win = BrowserWindow.fromWebContents(event.sender)
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openFile', 'openDirectory']
  })
  return canceled ? [] : filePaths
})

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
