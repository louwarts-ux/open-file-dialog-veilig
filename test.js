// Draait de app echt en controleert het veilige gedrag. Vereist: playwright + electron.
const { _electron: electron } = require('playwright')
const assert = require('node:assert/strict')
const path = require('node:path')

async function mockDialog (app, result) {
  await app.evaluate(({ dialog }, r) => { dialog.showOpenDialog = async () => r }, result)
}

;(async () => {
  const app = await electron.launch({ executablePath: require('electron'), args: [path.join(__dirname, '.'), '--no-sandbox'] })
  const page = await app.firstWindow()
  await page.waitForSelector('#select-directory')
  let ok = 0
  const pass = (name) => { ok++; console.log('OK  ', name) }

  // 1. Geen Node en geen ipcRenderer in de pagina; alleen de ene functie.
  const g = await page.evaluate(() => ({
    require: typeof window.require,
    process: typeof window.process,
    ipc: typeof window.ipcRenderer,
    api: Object.keys(window.fileDialog)
  }))
  assert.deepEqual(g, { require: 'undefined', process: 'undefined', ipc: 'undefined', api: ['open'] })
  pass('pagina heeft geen Node-toegang, alleen window.fileDialog.open')

  // 2. Normale keuze wordt getoond.
  await mockDialog(app, { canceled: false, filePaths: ['/home/user/foto.png'] })
  await page.click('#select-directory')
  await page.waitForFunction(() => document.getElementById('selected-file').textContent !== '')
  assert.equal(await page.textContent('#selected-file'), 'You selected: /home/user/foto.png')
  pass('gekozen pad komt via invoke/handle terug')

  // 3. Kwaadaardige bestandsnaam wordt tekst, geen HTML.
  const evil = '/tmp/<img src=x onerror="document.title=\'gehackt\'">.txt'
  await mockDialog(app, { canceled: false, filePaths: [evil] })
  await page.click('#select-directory')
  await page.waitForFunction((e) => document.getElementById('selected-file').textContent.includes(e), evil)
  assert.equal(await page.locator('#selected-file img').count(), 0)
  assert.notEqual(await page.title(), 'gehackt')
  pass('HTML in bestandsnaam wordt niet uitgevoerd (textContent)')

  // 4. Annuleren.
  await mockDialog(app, { canceled: true, filePaths: [] })
  await page.click('#select-directory')
  await page.waitForFunction(() => document.getElementById('selected-file').textContent === 'Geen keuze gemaakt')
  pass('annuleren geeft nette melding')

  // 5. Een andere pagina met hetzelfde preload-script wordt door main geweigerd.
  const rejected = await app.evaluate(async ({ BrowserWindow }, preload) => {
    const w = new BrowserWindow({ show: false, webPreferences: { preload, contextIsolation: true, sandbox: true } })
    await w.loadURL('data:text/html,<p>vreemde pagina</p>')
    const r = await w.webContents.executeJavaScript(
      'window.fileDialog.open().then(() => "toegestaan", e => "geweigerd: " + e.message)')
    w.destroy()
    return r
  }, path.join(__dirname, 'preload.js'))
  assert.match(rejected, /^geweigerd: .*onbekende afzender/)
  pass('verzoek van vreemde pagina geweigerd (afzendercontrole)')

  await app.close()
  console.log(`\n${ok}/5 tests geslaagd`)
})().catch((e) => { console.error('FAIL', e); process.exit(1) })
