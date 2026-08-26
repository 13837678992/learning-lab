function setupIpcHandlers(ipcMain) {
  ipcMain.handle('app:version', () => {
    return '1.0.0'
  })
}

module.exports = { setupIpcHandlers }
