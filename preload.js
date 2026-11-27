const { contextBridge, ipcRenderer } = require('electron')

// Stel alleen deze ene functie beschikbaar aan de pagina, nooit ipcRenderer zelf.
contextBridge.exposeInMainWorld('fileDialog', {
  open: () => ipcRenderer.invoke('dialog:openFile')
})
