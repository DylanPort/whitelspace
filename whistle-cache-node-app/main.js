const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const CacheNode = require('./cache-node');
const WhistleContract = require('./whistle-contract');

// Contract integration
const contract = new WhistleContract();

// Initialize store for settings
const store = new Store({
  defaults: {
    walletAddress: '',
    nodePort: 8545,
    autoStart: true,
    minimizeToTray: true,
    primaryRpc: 'https://api.mainnet-beta.solana.com',
  }
});

let mainWindow = null;
let tray = null;
let cacheNode = null;
let isRunning = false;

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    transparent: false,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('close', (event) => {
    if (store.get('minimizeToTray') && !app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  let trayIcon;
  
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    trayIcon = trayIcon.resize({ width: 16, height: 16 });
  } catch (e) {
    // Create a simple icon if file doesn't exist
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Open WHISTLE Cache Node', 
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        } else {
          createWindow();
        }
      }
    },
    { type: 'separator' },
    { 
      label: isRunning ? '⏹ Stop Node' : '▶ Start Node',
      click: () => {
        if (isRunning) {
          stopNode();
        } else {
          startNode();
        }
      }
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        app.isQuitting = true;
        if (cacheNode) {
          cacheNode.stop();
        }
        app.quit();
      }
    }
  ]);

  tray.setToolTip('WHISTLE Cache Node');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
    } else {
      createWindow();
    }
  });
}

async function startNode() {
  if (isRunning) return;

  const config = {
    port: store.get('nodePort'),
    walletAddress: store.get('walletAddress'),
    primaryRpc: store.get('primaryRpc'),
  };

  cacheNode = new CacheNode(config);
  
  cacheNode.on('started', () => {
    isRunning = true;
    sendToRenderer('node-status', { running: true });
    updateTray();
  });

  cacheNode.on('stopped', () => {
    isRunning = false;
    sendToRenderer('node-status', { running: false });
    updateTray();
  });

  cacheNode.on('metrics', (metrics) => {
    sendToRenderer('metrics', metrics);
  });

  cacheNode.on('log', (log) => {
    sendToRenderer('log', log);
  });

  cacheNode.on('error', (error) => {
    sendToRenderer('error', error);
  });

  cacheNode.on('cache-activity', (activity) => {
    sendToRenderer('cache-activity', activity);
  });

  await cacheNode.start();
}

function stopNode() {
  if (cacheNode) {
    cacheNode.stop();
    cacheNode = null;
  }
  isRunning = false;
  sendToRenderer('node-status', { running: false });
  updateTray();
}

function updateTray() {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Open WHISTLE Cache Node', 
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        } else {
          createWindow();
        }
      }
    },
    { type: 'separator' },
    { 
      label: isRunning ? '⏹ Stop Node' : '▶ Start Node',
      click: () => {
        if (isRunning) {
          stopNode();
        } else {
          startNode();
        }
      }
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        app.isQuitting = true;
        if (cacheNode) {
          cacheNode.stop();
        }
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip(`WHISTLE Cache Node - ${isRunning ? 'Running' : 'Stopped'}`);
}

function sendToRenderer(channel, data) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send(channel, data);
  }
}

// IPC handlers
ipcMain.handle('get-settings', () => {
  return store.store;
});

ipcMain.handle('save-settings', (event, settings) => {
  Object.keys(settings).forEach(key => {
    store.set(key, settings[key]);
  });
  return true;
});

ipcMain.handle('start-node', async () => {
  await startNode();
  return true;
});

ipcMain.handle('stop-node', () => {
  stopNode();
  return true;
});

ipcMain.handle('get-status', () => {
  return {
    running: isRunning,
    metrics: cacheNode ? cacheNode.getMetrics() : null,
  };
});

ipcMain.handle('get-metrics', () => {
  return cacheNode ? cacheNode.getMetrics() : null;
});

ipcMain.on('minimize-window', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('close-window', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('open-external', (event, url) => {
  shell.openExternal(url);
});

ipcMain.on('open-folder', (event, folderPath) => {
  shell.openPath(folderPath);
});

// ============= CONTRACT IPC HANDLERS =============

// Provider status check by address (read-only, no private key needed)
ipcMain.handle('provider-get-status-by-address', async (event, address) => {
  try {
    await contract.connect();
    return await contract.getProviderStatusByAddress(address);
  } catch (error) {
    console.error('Error getting provider status:', error);
    return null;
  }
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  createTray();

  // Auto-start node if configured
  if (store.get('autoStart') && store.get('walletAddress')) {
    setTimeout(() => startNode(), 2000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Don't quit on Windows/Linux if minimize to tray is enabled
    if (!store.get('minimizeToTray')) {
      app.quit();
    }
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (cacheNode) {
    cacheNode.stop();
  }
});

