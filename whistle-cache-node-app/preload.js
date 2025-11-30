const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  
  // Node control
  startNode: () => ipcRenderer.invoke('start-node'),
  stopNode: () => ipcRenderer.invoke('stop-node'),
  getStatus: () => ipcRenderer.invoke('get-status'),
  getMetrics: () => ipcRenderer.invoke('get-metrics'),
  
  // Window control
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  openFolder: (path) => ipcRenderer.send('open-folder', path),
  
  // Provider operations (read-only - no private key needed)
  providerGetStatusByAddress: (address) => ipcRenderer.invoke('provider-get-status-by-address', address),
  
  // Event listeners
  onNodeStatus: (callback) => ipcRenderer.on('node-status', (_, data) => callback(data)),
  onMetrics: (callback) => ipcRenderer.on('metrics', (_, data) => callback(data)),
  onLog: (callback) => ipcRenderer.on('log', (_, data) => callback(data)),
  onError: (callback) => ipcRenderer.on('error', (_, data) => callback(data)),
  onCacheActivity: (callback) => ipcRenderer.on('cache-activity', (_, data) => callback(data)),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});

