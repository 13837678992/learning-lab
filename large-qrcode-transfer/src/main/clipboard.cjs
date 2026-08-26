const { clipboard } = require('electron')

function setupClipboardHandlers(ipcMain) {
  ipcMain.handle('clipboard:read-text', () => {
    try {
      return { success: true, data: clipboard.readText() }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('clipboard:write-text', (_event, text) => {
    try {
      clipboard.writeText(text)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })
}

module.exports = { setupClipboardHandlers }
