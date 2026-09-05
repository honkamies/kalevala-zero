const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

// Disable autoplay policy restrictions so game music and SFX start immediately
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    backgroundColor: '#06090e',
    title: 'Kalevala Zero - Sampo Cyber-ARPG',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allows smooth loading of local game assets
      allowRunningInsecureContent: true
    }
  });

  win.setMenuBarVisibility(false);
  Menu.setApplicationMenu(null);

  // Load the built game html
  win.loadFile(path.join(__dirname, 'dist', 'index.html'));

  // Toggle fullscreen with F11
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
