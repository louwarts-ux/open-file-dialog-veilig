const selectDirBtn = document.getElementById('select-directory')
const output = document.getElementById('selected-file')

selectDirBtn.addEventListener('click', async () => {
  try {
    const paths = await window.fileDialog.open()
    // textContent in plaats van innerHTML: een bestandsnaam met HTML wordt gewoon tekst.
    output.textContent = paths.length > 0
      ? `You selected: ${paths.join(', ')}`
      : 'Geen keuze gemaakt'
  } catch (err) {
    output.textContent = `Fout: ${err.message}`
  }
})
