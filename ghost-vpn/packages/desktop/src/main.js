/**
 * Ghost VPN Desktop - Electron Main Process
 */

const { app, BrowserWindow, Tray, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');
const AutoLaunch = require('auto-launch');
const { GhostVPNClient } = require('@ghost-vpn/core');
const { KillSwitch } = require('@ghost-vpn/core');
const sudo = require('node-sudo');

// Initialize store
const store = new Store();

// Initialize auto-launch
const ghostVPNAutoLauncher = new AutoLaunch({
  name: 'Ghost VPN',
  path: app.getPath('exe')
});

let mainWindow = null;
let tray = null;
let vpnClient = null;
let killSwitch = null;
let isConnected = false;

/**
 * Create main window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: 'Ghost VPN',
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#667eea',
    show: false // Show after ready
  });

  // Load app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle close - minimize to tray
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
      
      // Show notification
      if (tray) {
        tray.displayBalloon({
          title: 'Ghost VPN',
          content: 'Ghost VPN is still running in the background'
        });
      }
    }
    return false;
  });
}

/**
 * Create system tray
 */
function createTray() {
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Ghost VPN',
      enabled: false
    },
    {
      type: 'separator'
    },
    {
      label: 'Connect',
      click: () => connectVPN(),
      id: 'connect',
      visible: !isConnected
    },
    {
      label: 'Disconnect',
      click: () => disconnectVPN(),
      id: 'disconnect',
      visible: isConnected
    },
    {
      type: 'separator'
    },
    {
      label: 'Show Window',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    {
      label: 'Settings',
      click: () => {
        mainWindow.show();
        mainWindow.webContents.send('navigate', '/settings');
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Quit',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('Ghost VPN - Disconnected');

  tray.on('click', () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

/**
 * Initialize VPN client
 */
async function initializeVPN() {
  vpnClient = new GhostVPNClient();
  killSwitch = new KillSwitch({
    enabled: store.get('killSwitch.enabled', true),
    blockOnDisconnect: true,
    allowLAN: store.get('killSwitch.allowLAN', true)
  });

  // Load saved config
  const savedConfig = store.get('vpn.config');
  if (savedConfig) {
    try {
      await vpnClient.loadConfig(savedConfig);
    } catch (error) {
      console.error('Failed to load VPN config:', error);
    }
  }

  // Setup event listeners
  vpnClient.on('connected', () => {
    isConnected = true;
    updateTrayMenu();
    tray.setToolTip('Ghost VPN - Connected');
    mainWindow.webContents.send('vpn-connected');
  });

  vpnClient.on('disconnected', () => {
    isConnected = false;
    updateTrayMenu();
    tray.setToolTip('Ghost VPN - Disconnected');
    mainWindow.webContents.send('vpn-disconnected');
  });

  vpnClient.on('stats-updated', (stats) => {
    mainWindow.webContents.send('vpn-stats', stats);
  });

  vpnClient.on('error', (error) => {
    dialog.showErrorBox('VPN Error', error.message);
  });

  // Auto-connect if enabled
  if (store.get('vpn.autoConnect', false) && savedConfig) {
    setTimeout(() => connectVPN(), 2000);
  }
}

/**
 * Connect to VPN
 */
async function connectVPN() {
  try {
    // Request admin privileges if needed
    if (process.platform !== 'win32' || !process.env.ADMIN) {
      const sudoOptions = {
        name: 'Ghost VPN',
        process: {
          on: function(ps) {
            ps.stdout.on('data', (data) => console.log(data.toString()));
          }
        }
      };
      
      // Re-launch with sudo
      // In production, this would use proper elevation
    }

    await vpnClient.connect();
    await killSwitch.enable();

  } catch (error) {
    dialog.showErrorBox('Connection Failed', error.message);
  }
}

/**
 * Disconnect from VPN
 */
async function disconnectVPN() {
  try {
    await vpnClient.disconnect();
    await killSwitch.disable();
  } catch (error) {
    dialog.showErrorBox('Disconnection Failed', error.message);
  }
}

/**
 * Update tray menu
 */
function updateTrayMenu() {
  const contextMenu = tray.getContextMenu();
  contextMenu.getMenuItemById('connect').visible = !isConnected;
  contextMenu.getMenuItemById('disconnect').visible = isConnected;
  tray.setContextMenu(contextMenu);
}

/**
 * Setup IPC handlers
 */
function setupIPC() {
  // Connect
  ipcMain.handle('vpn:connect', async () => {
    await connectVPN();
    return { success: true };
  });

  // Disconnect
  ipcMain.handle('vpn:disconnect', async () => {
    await disconnectVPN();
    return { success: true };
  });

  // Load config
  ipcMain.handle('vpn:load-config', async (event, config) => {
    try {
      await vpnClient.loadConfig(config);
      store.set('vpn.config', config);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get stats
  ipcMain.handle('vpn:get-stats', () => {
    return vpnClient.getStats();
  });

  // Settings
  ipcMain.handle('settings:get', (event, key) => {
    return store.get(key);
  });

  ipcMain.handle('settings:set', (event, key, value) => {
    store.set(key, value);
    return { success: true };
  });

  // Auto-launch
  ipcMain.handle('settings:set-auto-launch', async (event, enabled) => {
    if (enabled) {
      await ghostVPNAutoLauncher.enable();
    } else {
      await ghostVPNAutoLauncher.disable();
    }
    store.set('autoLaunch', enabled);
    return { success: true };
  });
}

/**
 * Setup auto-updater
 */
function setupAutoUpdater() {
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-available', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: 'A new version of Ghost VPN is available. It will be downloaded in the background.',
      buttons: ['OK']
    });
  });

  autoUpdater.on('update-downloaded', () => {
    const response = dialog.showMessageBoxSync(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'A new version has been downloaded. Restart now to install the update?',
      buttons: ['Restart', 'Later']
    });

    if (response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
}

/**
 * App ready
 */
app.whenReady().then(async () => {
  createWindow();
  createTray();
  await initializeVPN();
  setupIPC();
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

/**
 * App quit
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  app.isQuiting = true;
  
  // Disconnect VPN
  if (isConnected) {
    try {
      await disconnectVPN();
    } catch (error) {
      console.error('Failed to disconnect on quit:', error);
    }
  }
});

// Handle crashes gracefully
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  dialog.showErrorBox('Unexpected Error', error.message);
});

