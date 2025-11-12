// Popup script for Ghost VPN Proxy Extension

document.addEventListener('DOMContentLoaded', () => {
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  const serverInfo = document.getElementById('serverInfo');
  const setupForm = document.getElementById('setupForm');
  const connectBtn = document.getElementById('connectBtn');
  const disconnectBtn = document.getElementById('disconnectBtn');
  const proxyHostInput = document.getElementById('proxyHost');
  const proxyPortInput = document.getElementById('proxyPort');
  const openDashboardBtn = document.getElementById('openDashboard');

  // Load saved state
  chrome.storage.local.get(['connected', 'host', 'port'], (data) => {
    if (data.connected && data.host && data.port) {
      updateUI(true, data.host, data.port);
      proxyHostInput.value = data.host;
      proxyPortInput.value = data.port;
    }
  });

  // Connect button
  connectBtn.addEventListener('click', () => {
    const host = proxyHostInput.value.trim();
    const port = proxyPortInput.value.trim();

    if (!host) {
      alert('Please enter server IP');
      return;
    }

    chrome.runtime.sendMessage(
      { action: 'connect', proxyHost: host, proxyPort: port },
      (response) => {
        if (response.success) {
          updateUI(true, host, port);
        }
      }
    );
  });

  // Disconnect button
  disconnectBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'disconnect' }, (response) => {
      if (response.success) {
        updateUI(false);
      }
    });
  });

  // Open dashboard
  openDashboardBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://whistel.space' });
  });

  // Update UI based on connection status
  function updateUI(connected, host = '', port = '') {
    if (connected) {
      statusIndicator.classList.remove('disconnected');
      statusIndicator.classList.add('connected');
      statusText.textContent = 'Connected';
      serverInfo.textContent = `${host}:${port}`;
      serverInfo.classList.remove('hidden');
      setupForm.classList.add('hidden');
      disconnectBtn.classList.remove('hidden');
    } else {
      statusIndicator.classList.remove('connected');
      statusIndicator.classList.add('disconnected');
      statusText.textContent = 'Disconnected';
      serverInfo.classList.add('hidden');
      setupForm.classList.remove('hidden');
      disconnectBtn.classList.add('hidden');
    }
  }
});

