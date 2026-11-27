# open-file-dialog-veilig

De `open-file-dialog`-flow uit [electron/electron-api-demos](https://github.com/electron/electron-api-demos),
herschreven naar het veilige, moderne Electron-patroon.

## Wat is er veranderd

| Origineel | Deze versie |
|---|---|
| `nodeIntegration: true` – pagina heeft volledige Node-toegang | `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true` |
| `ipcRenderer` direct in de pagina | Preload stelt via `contextBridge` alleen `window.fileDialog.open()` beschikbaar |
| Twee losse kanalen (`send` heen, `send` terug) | Eén `ipcRenderer.invoke` ↔ `ipcMain.handle` |
| Geen afzendercontrole | Main accepteert alleen verzoeken van de eigen `index.html` |
| Pad via `innerHTML` (XSS → Node-toegang) | `textContent` + Content-Security-Policy |
| Oude callback-API van `showOpenDialog` | Promise-API, gekoppeld aan het venster |
| — | Nieuwe vensters en navigatie geblokkeerd |

## Flow

```
renderer.js                 preload.js (contextBridge)          main.js
await window.fileDialog ──► ipcRenderer.invoke(           ──► ipcMain.handle('dialog:openFile')
        .open()               'dialog:openFile')                1. afzender controleren
                                                                2. await dialog.showOpenDialog()
output.textContent = …  ◄──────── Promise met gekozen paden ◄──┘
```

## Gebruik

```bash
npm install
npm start
```

## Tests

`test.js` start de echte app met Playwright en controleert:

1. de pagina heeft geen `require`/`process`/`ipcRenderer`, alleen `fileDialog.open`;
2. het gekozen pad komt terug;
3. HTML in een bestandsnaam wordt niet uitgevoerd;
4. annuleren geeft een nette melding;
5. een vreemde pagina met hetzelfde preload-script wordt geweigerd.

```bash
npm install --save-dev playwright
npm test
```

Op Linux zonder scherm: `xvfb-run -a npm test`.
