#!/usr/bin/env node

/**
 * WHISTLE Provider Portal (neo-blessed TUI)
 *
 * Full-screen, interactive terminal with:
 *  - 3D WHISTLE title
 *  - Left pane: Cache providers
 *  - Right pane: Validator providers
 *  - Footer with key hints
 *
 * Keys:
 *  - Tab / Shift+Tab: switch focus between panes
 *  - ↑ / ↓: move selection
 *  - Enter: run selected action
 *  - D: open docs
 *  - Q / Esc / Ctrl+C: quit
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const blessed = require('neo-blessed');
let figlet = null;
try {
  figlet = require('figlet');
} catch (e) {
  figlet = null;
}

// -----------------------------------------------------------------------------
// Screen + Layout
// -----------------------------------------------------------------------------

const screen = blessed.screen({
  smartCSR: true,
  fullUnicode: true,
  title: 'WHISTLE Provider Portal',
});

// Quit keys
screen.key(['C-c', 'q', 'Q', 'escape'], () => {
  screen.destroy();
  process.exit(0);
});

// Header box with 3D WHISTLE title
const headerBox = blessed.box({
  parent: screen,
  top: 0,
  left: 0,
  width: '100%',
  height: 15,
  tags: true,
  style: { fg: 'cyan', bg: 'black' },
});

function drawHeader() {
  // Use box drawing characters that work reliably on Windows
  const linesArr = [
    '╔═══════════════════════════════════════════════════════════════════════╗',
    '║                                                                       ║',
    '║   ██╗    ██╗██╗  ██╗██╗███████╗████████╗██╗     ███████╗              ║',
    '║   ██║    ██║██║  ██║██║██╔════╝╚══██╔══╝██║     ██╔════╝              ║',
    '║   ██║ █╗ ██║███████║██║███████╗   ██║   ██║     █████╗                ║',
    '║   ██║███╗██║██╔══██║██║╚════██║   ██║   ██║     ██╔══╝                ║',
    '║   ╚███╔███╔╝██║  ██║██║███████║   ██║   ███████╗███████╗              ║',
    '║    ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝╚══════╝   ╚═╝   ╚══════╝╚══════╝              ║',
    '║                                                                       ║',
    '╚═══════════════════════════════════════════════════════════════════════╝',
  ];
  
  // Simple rendering without the double-layer effect
  const rendered = linesArr.map(line => `{cyan-fg}${line}{/cyan-fg}`).join('\n');
  
  headerBox.setContent(
    rendered + '\n\n{bold}{yellow-fg}PROVIDER PORTAL v1.0{/yellow-fg}{/bold}\n{white-fg}Navigate: ↑↓ Keys | Tab: Switch Panes | Enter: Select | Q: Quit{/white-fg}'
  );
}

// Left pane: cache providers
const cacheList = blessed.list({
  parent: screen,
  label: ' Cache Providers ',
  top: 8,
  left: 0,
  width: '50%',
  height: '55%',
  keys: true,
  mouse: true,
  border: 'line',
  tags: true,
  style: {
    fg: 'white',
    bg: 'black',
    border: { fg: 'cyan' },
    selected: { bg: 'cyan', fg: 'black' },
  },
  items: [
    '▶ Easy Cache Node Start',
    '▶ Cache Node Deep Dive',
    '▶ View Cache Metrics',
    '▶ Example Docker Commands',
  ],
});

// Right pane: validator providers
const validatorList = blessed.list({
  parent: screen,
  label: ' Validator Providers ',
  top: 8,
  left: '50%',
  width: '50%',
  height: '55%',
  keys: true,
  mouse: true,
  border: 'line',
  tags: true,
  style: {
    fg: 'white',
    bg: 'black',
    border: { fg: 'cyan' },
    selected: { bg: 'cyan', fg: 'black' },
  },
  items: [
    '▶ Validator Operator Overview',
    '▶ Validator Onboarding Checklist',
    '▶ Reward Flow Simulation',
    '▶ Monitoring Stack Example',
  ],
});

// Footer / status bar
const footer = blessed.box({
  parent: screen,
  bottom: 0,
  left: 0,
  width: '100%',
  height: 3,
  tags: true,
  style: { fg: 'gray', bg: 'black' },
});

footer.setContent(
  ' {bold}TAB{/bold}: switch pane   {bold}ENTER{/bold}: run   {bold}D{/bold}: docs   {bold}Q{/bold}: quit'
);

// Metrics box (live snapshot)
const metricsBox = blessed.box({
  parent: screen,
  top: '63%',
  left: 0,
  width: '100%',
  height: '17%',
  tags: true,
  border: 'line',
  label: ' Network Snapshot ',
  style: {
    fg: 'white',
    bg: 'black',
    border: { fg: 'green' },
  },
});

// Info box (lower middle)
const infoBox = blessed.box({
  parent: screen,
  top: '78%',
  left: 0,
  width: '100%',
  height: '22%',
  tags: true,
  padding: { left: 1, right: 1 },
  style: { fg: 'white', bg: 'black' },
});

function setInfo(text) {
  infoBox.setContent(text);
  screen.render();
}

// -----------------------------------------------------------------------------
// Metrics (simulated)
// -----------------------------------------------------------------------------

const metrics = {
  totalCacheNodes: 128,
  activeCacheNodes: 117,
  avgHitRate: 0.84,
  avgLatencyMs: 9,
  rpcQueries24h: 1_250_000,
  validatorCount: 12,
  x402PerMinute: 320,
  nlx402SuccessRate: 0.998,
  errorRate: 0.003,
};

const spinnerFrames = ['|', '/', '-', '\\\\'];
let spinnerIndex = 0;

function updateMetrics() {
  // Light random drift to feel alive
  metrics.activeCacheNodes = Math.max(
    80,
    Math.min(
      metrics.totalCacheNodes,
      metrics.activeCacheNodes + (Math.random() > 0.5 ? 1 : -1)
    )
  );
  metrics.avgHitRate = Math.max(
    0.7,
    Math.min(0.95, metrics.avgHitRate + (Math.random() - 0.5) * 0.01)
  );
  metrics.avgLatencyMs = Math.max(
    5,
    Math.min(25, metrics.avgLatencyMs + (Math.random() - 0.5) * 1.5)
  );
  metrics.rpcQueries24h = Math.max(
    500_000,
    metrics.rpcQueries24h + Math.floor((Math.random() - 0.4) * 10_000)
  );

  metrics.x402PerMinute = Math.max(
    100,
    Math.min(1_000, metrics.x402PerMinute + Math.floor((Math.random() - 0.5) * 40))
  );
  metrics.nlx402SuccessRate = Math.max(
    0.97,
    Math.min(0.999, metrics.nlx402SuccessRate + (Math.random() - 0.5) * 0.0005)
  );
  metrics.errorRate = Math.max(
    0,
    Math.min(0.02, metrics.errorRate + (Math.random() - 0.5) * 0.0007)
  );

  const spinner = spinnerFrames[spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length];

  const content =
    `{green-fg}[${spinner}] Cache Nodes{/green-fg}: ${metrics.activeCacheNodes}/${metrics.totalCacheNodes}` +
    `   {green-fg}Hit Rate{/green-fg}: ${(metrics.avgHitRate * 100).toFixed(1)}%` +
    `   {green-fg}Latency{/green-fg}: ${metrics.avgLatencyMs.toFixed(1)} ms\n` +
    `{cyan-fg}RPC Queries (24h){/cyan-fg}: ${metrics.rpcQueries24h.toLocaleString()}` +
    `   {magenta-fg}   Validators{/magenta-fg}: ${metrics.validatorCount}\n` +
    `{yellow-fg}x402 / min{/yellow-fg}: ${metrics.x402PerMinute.toLocaleString()}` +
    `   {cyan-fg}NLx402 OK{/cyan-fg}: ${(metrics.nlx402SuccessRate * 100).toFixed(2)}%` +
    `   {red-fg}Error Rate{/red-fg}: ${(metrics.errorRate * 100).toFixed(2)}%`;

  metricsBox.setContent(content);
  screen.render();
}

// -----------------------------------------------------------------------------
// Actions
// -----------------------------------------------------------------------------

async function runCacheEasy() {
  // Overlay "mock terminal" showing how a real start looks, with optional real run.
  const overlay = blessed.box({
    parent: screen,
    top: 'center',
    left: 'center',
    width: '80%',
    height: '70%',
    border: 'line',
    label: ' Cache Node Startup ',
    tags: true,
    style: {
      fg: 'white',
      bg: 'black',
      border: { fg: 'cyan' },
    },
  });

  const log = blessed.log({
    parent: overlay,
    top: 1,
    left: 1,
    width: '98%',
    height: '80%',
    tags: true,
    keys: true,
    mouse: true,
    scrollbar: {
      ch: ' ',
      inverse: true,
    },
    style: {
      fg: 'white',
      bg: 'black',
    },
  });

  const hint = blessed.box({
    parent: overlay,
    bottom: 0,
    left: 1,
    width: '98%',
    height: 3,
    tags: true,
    style: { fg: 'gray', bg: 'black' },
    content:
      ' {bold}Q{/bold}: close  {bold}R{/bold}: run cache node launcher (Windows/Linux/Mac)',
  });

  screen.render();

  const lines = [
    '{gray-fg}> Initialising WHISTLE cache node environment...{/gray-fg}',
    '> Detecting Docker installation...',
    '{green-fg}OK{/green-fg}  Docker Desktop detected.',
    '> Checking existing containers...',
    '  - Stopping previous container: whistle-cache (if running)...',
    '  - Removing old container: whistle-cache (if present)...',
    '',
    '> Preparing run command:',
    '  docker run -d --name whistle-cache \\',
    '    -e WALLET=7BZQtBPn2yotP2vAWNi3Vf2SPNq7Ffrs1Ti5FVUAEkHr \\',
    '    -p 8546:8545 \\',
    '    --restart unless-stopped \\',
    '    whistlenet/cache-node:latest',
    '',
    '> Starting container...',
    '{green-fg}OK{/green-fg}  Container started: whistle-cache',
    '',
    '> Health checks:',
    '  - Metrics endpoint: http://localhost:8546/metrics',
    '  - Logs: docker logs -f whistle-cache',
    '',
    '{cyan-fg}Cache node is now serving RPC from the edge and reporting metrics ' +
    'back to the coordinator.{/cyan-fg}',
  ];

  let i = 0;
  function streamNext() {
    if (i >= lines.length) return;
    log.log(lines[i]);
    screen.render();
    i += 1;
    setTimeout(streamNext, 450);
  }
  streamNext();

  overlay.key(['q', 'Q', 'escape'], () => {
    overlay.destroy();
    screen.render();
  });

  overlay.key(['r', 'R'], () => {
    const platform = os.platform();
    
    if (platform === 'win32') {
      const scriptPath = path.resolve(__dirname, '..', 'CACHE-NODE-EASY.bat');
      if (fs.existsSync(scriptPath)) {
        log.log('');
        log.log('{yellow-fg}> Launching real CACHE-NODE-EASY.bat in a new window...{/yellow-fg}');
        spawn('cmd.exe', ['/c', 'start', '""', scriptPath], {
          detached: true,
          stdio: 'ignore',
        }).unref();
        screen.render();
      } else {
        log.log('{red-fg}> Windows launcher not found.{/red-fg}');
        screen.render();
      }
    } else if (platform === 'linux' || platform === 'darwin') {
      const scriptPath = path.resolve(__dirname, '..', 'CACHE-NODE-EASY.sh');
      if (fs.existsSync(scriptPath)) {
        log.log('');
        log.log('{yellow-fg}> Launching CACHE-NODE-EASY.sh...{/yellow-fg}');
        log.log('{cyan-fg}> Check your terminal for the cache node setup!{/cyan-fg}');
        
        // Make script executable
        try {
          fs.chmodSync(scriptPath, '755');
        } catch (e) {
          // Ignore chmod errors
        }
        
        // Try different terminal emulators
        const terminals = [
          { cmd: 'gnome-terminal', args: ['--', 'bash', scriptPath] },
          { cmd: 'konsole', args: ['-e', 'bash', scriptPath] },
          { cmd: 'xfce4-terminal', args: ['-e', `bash ${scriptPath}`] },
          { cmd: 'xterm', args: ['-e', 'bash', scriptPath] },
          { cmd: 'mate-terminal', args: ['-e', `bash ${scriptPath}`] },
        ];
        
        if (platform === 'darwin') {
          // macOS - use Terminal.app
          spawn('open', ['-a', 'Terminal', scriptPath], {
            detached: true,
            stdio: 'ignore',
          }).unref();
          log.log('{green-fg}> Opened in Terminal.app{/green-fg}');
          screen.render();
          return;
        }
        
        // Linux - try each terminal emulator
        let launched = false;
        for (const term of terminals) {
          try {
            const which = spawn('which', [term.cmd]);
            which.on('close', (code) => {
              if (code === 0 && !launched) {
                launched = true;
                spawn(term.cmd, term.args, {
                  detached: true,
                  stdio: 'ignore',
                }).unref();
                log.log(`{green-fg}> Opened in ${term.cmd}{/green-fg}`);
                screen.render();
              }
            });
          } catch (e) {
            // Continue trying other terminals
          }
        }
        
        // Fallback: run in background
        setTimeout(() => {
          if (!launched) {
            log.log('{yellow-fg}> No terminal found. Running in background...{/yellow-fg}');
            spawn('bash', [scriptPath], {
              detached: true,
              stdio: 'ignore',
            }).unref();
            screen.render();
          }
        }, 1000);
      } else {
        log.log('{red-fg}> Linux launcher not found at: ' + scriptPath + '{/red-fg}');
        log.log('{cyan-fg}> You can run directly: docker run -d --name whistle-cache -e WALLET_ADDRESS=YOUR_WALLET -p 8546:8545 whistlenet/cache-node:latest{/cyan-fg}');
        screen.render();
      }
    } else {
      log.log('{red-fg}> Platform not supported: ' + platform + '{/red-fg}');
      screen.render();
    }
  });
}

function cacheDeepDive() {
  setInfo(
    '{bold}Cache Node Deep Dive{/bold}\n\n' +
    '• Listens for RPC requests from the WHISTLE coordinator.\n' +
    '• Serves hot data from cache when possible, falls back to upstream RPCs.\n' +
    '• Reports cache hits / misses and latency back to the network.\n\n' +
    'Responsibilities:\n' +
    '  - Keep the node online and reachable (ports + firewall).\n' +
    '  - Keep Docker + the cache-node image up to date.\n' +
    '  - Monitor CPU, memory, disk and bandwidth.\n\n' +
    'Economics (high-level): each valid cache hit contributes to your share\n' +
    'of rewards, distributed via the WHISTLE contract and RPC logic.'
  );
}

function cacheMetrics() {
  setInfo(
    '{bold}Cache Metrics{/bold}\n\n' +
    'This view pairs with the Network Snapshot panel above.\n\n' +
    `• Active cache nodes: ~${metrics.activeCacheNodes}/${metrics.totalCacheNodes}\n` +
    `• Average hit rate:   ~${(metrics.avgHitRate * 100).toFixed(1)}%\n` +
    `• Average latency:    ~${metrics.avgLatencyMs.toFixed(1)} ms\n` +
    `• RPC volume (24h):   ~${metrics.rpcQueries24h.toLocaleString()} queries\n\n` +
    'In production this would be wired to the coordinator and on-chain stats,\n' +
    'letting you see how your node compares to the rest of the network.'
  );
}

function cacheDockerExamples() {
  setInfo(
    '{bold}Docker Commands{/bold}\n\n' +
    '{cyan-fg}Windows (PowerShell):{/cyan-fg}\n' +
    '  docker run -d --name whistle-cache \\\n' +
    '    -e WALLET=7BZQtBPn2yotP2vAWNi3Vf2SPNq7Ffrs1Ti5FVUAEkHr \\\n' +
    '    -p 8546:8545 \\\n' +
    '    --restart unless-stopped \\\n' +
    '    whistlenet/cache-node:latest\n\n' +
    '{cyan-fg}Linux (Ubuntu):{/cyan-fg}\n' +
    '  docker run -d --name whistle-cache \\\n' +
    '    -e WALLET=7BZQtBPn2yotP2vAWNi3Vf2SPNq7Ffrs1Ti5FVUAEkHr \\\n' +
    '    -p 8546:8545 \\\n' +
    '    --restart unless-stopped \\\n' +
    '    whistlenet/cache-node:latest\n\n' +
    'Exact commands may evolve with the published image and coordinator\n' +
    'configuration; always check the latest docs before deploying.'
  );
}

function validatorOverview() {
  setInfo(
    '{bold}Validator Operator Overview{/bold}\n\n' +
    'This track is for professional operators already running, or planning to run,\n' +
    'full Solana validators and plugging into the WHISTLE economy.\n\n' +
    'Expectations:\n' +
    '  - Hardware that comfortably meets Solana mainnet requirements.\n' +
    '  - Stable networking and monitoring (Prometheus, Grafana, etc.).\n' +
    '  - Familiarity with validator tooling, upgrades and incident response.\n\n' +
    'WHISTLE fits on top by routing RPC traffic to you and accounting rewards\n' +
    'based on performance and reliability.'
  );
}

function validatorChecklist() {
  setInfo(
    '{bold}Validator Onboarding Checklist{/bold}\n\n' +
    '1. Validator ready (mainnet-grade hardware + monitoring).\n' +
    '2. Read WHISTLE RPC + contract docs (architecture, rewards, slashing).\n' +
    '3. Decide which RPC endpoint(s) to expose, and capacity / limits.\n' +
    '4. Coordinate with the WHISTLE team for registration and test flow.'
  );
}

function validatorRewardSimulation() {
  setInfo(
    '{bold}Reward Flow Simulation (conceptual){/bold}\n\n' +
    'Think of a block of RPC revenue flowing into the WHISTLE system. Roughly:\n\n' +
    '  • Part of each request is used to pay cache providers for cache hits.\n' +
    '  • A share goes to validator-backed RPC for ground-truth and finality.\n' +
    '  • A protocol slice is routed back to WHISTLE stakers.\n\n' +
    'On top of that, NLx402 handles the nonce-locked payment quotes and\n' +
    'splits out a facilitator fee, while the remainder goes to the WHISTLE\n' +
    'economy. This screen stays high-level on purpose; precise numbers live\n' +
    'in the on-chain contract and docs.'
  );
}

function validatorMonitoringStack() {
  setInfo(
    '{bold}Monitoring Stack Example{/bold}\n\n' +
    'Recommended stack for validators and serious cache providers:\n\n' +
    '  • Prometheus: scrape Solana + node exporter metrics.\n' +
    '  • Grafana: dashboards for RPC latency, slot height, block production.\n' +
    '  • Loki / ELK: log aggregation for quick incident drill-down.\n' +
    '  • Alertmanager: pager/alerts on missed slots, high error rates, etc.\n\n' +
    'WHISTLE can plug into this by exposing exporter endpoints or pushing\n' +
    'simple JSON metrics, so you see both Solana health and WHISTLE-specific\n' +
    'KPIs (cache hit ratio, NLx402 throughput, provider reputation) in one place.'
  );
}

function openDocs() {
  const url = 'https://github.com/DylanPort/whitelspace';
  setInfo(
    '{bold}Provider Docs{/bold}\n\n' +
    'Main repository (RPC + providers + NLx402 integration):\n' +
    `  {cyan-fg}${url}{/cyan-fg}\n\n` +
    'Trying to open this URL in your default browser...'
  );

  let cmd;
  let args;
  if (os.platform() === 'win32') {
    cmd = 'cmd';
    args = ['/c', 'start', '', url];
  } else if (os.platform() === 'darwin') {
    cmd = 'open';
    args = [url];
  } else {
    cmd = 'xdg-open';
    args = [url];
  }

  try {
    spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref();
  } catch (e) {
    setInfo(
      '{red-fg}Failed to auto-open browser.{/red-fg}\n\n' +
      `Please open manually: ${url}`
    );
  }
}

// -----------------------------------------------------------------------------
// Interaction
// -----------------------------------------------------------------------------

cacheList.on('select', (item, index) => {
  if (index === 0) runCacheEasy();
  if (index === 1) cacheDeepDive();
  if (index === 2) cacheMetrics();
  if (index === 3) cacheDockerExamples();
});

validatorList.on('select', (item, index) => {
  if (index === 0) validatorOverview();
  if (index === 1) validatorChecklist();
  if (index === 2) validatorRewardSimulation();
  if (index === 3) validatorMonitoringStack();
});

screen.key(['d', 'D'], () => openDocs());

// Tab focus switching
let focusOnCache = true;
function focusToggle() {
  focusOnCache = !focusOnCache;
  if (focusOnCache) {
    cacheList.focus();
  } else {
    validatorList.focus();
  }
  screen.render();
}

screen.key(['tab', 'S-tab'], focusToggle);

// Initial draw
drawHeader();
cacheList.focus();
setInfo(
  'Welcome to the WHISTLE Provider Portal.\n\n' +
  'Use the left pane for cache nodes and the right pane for validators.\n' +
  'TAB switches panes, ENTER runs the selected action.'
);
updateMetrics();
setInterval(updateMetrics, 3000);
screen.render();



