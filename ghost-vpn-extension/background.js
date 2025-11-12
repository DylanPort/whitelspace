// Background script for Ghost VPN Proxy Extension

let isConnected = false;
let proxyConfig = null;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'connect') {
    connectProxy(request.proxyHost, request.proxyPort);
    sendResponse({ success: true });
  } else if (request.action === 'disconnect') {
    disconnectProxy();
    sendResponse({ success: true });
  } else if (request.action === 'getStatus') {
    sendResponse({ connected: isConnected, config: proxyConfig });
  }
  return true;
});

// Connect to SOCKS5 proxy
function connectProxy(host, port) {
  const config = {
    mode: 'fixed_servers',
    rules: {
      singleProxy: {
        scheme: 'socks5',
        host: host,
        port: parseInt(port)
      },
      bypassList: ['localhost', '127.0.0.1']
    }
  };

  chrome.proxy.settings.set(
    { value: config, scope: 'regular' },
    () => {
      isConnected = true;
      proxyConfig = { host, port };
      chrome.storage.local.set({ connected: true, host, port });
      updateIcon(true);
      console.log('✅ Connected to Ghost VPN proxy:', host);
    }
  );
}

// Disconnect proxy
function disconnectProxy() {
  chrome.proxy.settings.clear({ scope: 'regular' }, () => {
    isConnected = false;
    proxyConfig = null;
    chrome.storage.local.set({ connected: false });
    updateIcon(false);
    console.log('⏸️ Disconnected from Ghost VPN proxy');
  });
}

// Update extension icon
function updateIcon(connected) {
  const iconPath = connected ? 'icons/icon-connected' : 'icons/icon';
  chrome.action.setIcon({
    path: {
      16: `${iconPath}16.png`,
      48: `${iconPath}48.png`,
      128: `${iconPath}128.png`
    }
  });
  
  chrome.action.setBadgeText({ text: connected ? 'ON' : '' });
  chrome.action.setBadgeBackgroundColor({ color: connected ? '#10b981' : '#6b7280' });
}

// Restore connection on startup
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['connected', 'host', 'port'], (data) => {
    if (data.connected && data.host && data.port) {
      connectProxy(data.host, data.port);
    }
  });
});

