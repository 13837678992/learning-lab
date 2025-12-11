const {app, BrowserWindow, ipcMain, nativeTheme} = require('electron/main')
const path = require('node:path')

let bluetoothPinCallback
let selectBluetoothCallback

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600, // 修复高度错误
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        }
    });
    mainWindow.webContents.on('select-bluetooth-device',(event,deviceList,callback)=>
        event.preventDefault()
        selectBluetoothCallback = callback
        const result = deviceList.find(device => device.name === "YourDeviceName")
        if(result){
            callback(result.deviceId)
        }else {

        }

    )


}

// const createWindow = () => {
//     const win = new BrowserWindow({
//         width: 800,
//         height: 600,
//         webPreferences: {
//             preload: path.join(__dirname, 'preload.js')
//         }
//     })
//
//     win.loadFile('index.html')
//     win.webContents.openDevTools(); // 自动打开开发者工具
// }
//
// ipcMain.handle('dark-mode:toggle', () => {
//     console.log(nativeTheme, 'dark-mode:toggle')
//     if (nativeTheme.shouldUseDarkColors) {
//         nativeTheme.themeSource = 'light'
//     } else {
//         nativeTheme.themeSource = 'dark'
//     }
//     return nativeTheme.shouldUseDarkColors
// })
// ipcMain.handle('dark-mode:system', () => {
//     nativeTheme.themeSource = 'system'
// })
// app.whenReady().then(() => {
//     createWindow()
//
//     app.on('activate', () => {
//         if (BrowserWindow.getAllWindows().length === 0) {
//             createWindow()
//         }
//     })
// })
//
// app.on('window-all-closed', () => {
//     if (process.platform !== 'darwin') {
//         app.quit()
//     }
// })

/**
 * 预加载
 */
// app.on("ready",()=>{
//     ipcMain.handle('ping', () => 'pong')
//     createWindow()
//     app.on('activate', () => {
//         if (BrowserWindow.getAllWindows().length === 0) createWindow()
//     })
// })
// app.on("window-all-closed",()=>{
//     console.log("All windows closed")
//     if (process.platform !== "win32")  app.quit()
// })

