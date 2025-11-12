/**
 * Ghost VPN - Kill Switch Implementation
 * Prevents data leaks when VPN disconnects
 */

import { EventEmitter } from 'events';

export interface KillSwitchConfig {
  enabled: boolean;
  blockOnDisconnect: boolean;
  allowedIPs?: string[];
  allowLAN?: boolean;
  allowDHCP?: boolean;
}

export class KillSwitch extends EventEmitter {
  private enabled = false;
  private blocking = false;
  private config: KillSwitchConfig;
  private originalRoutes: any[] = [];

  constructor(config: KillSwitchConfig) {
    super();
    this.config = config;
    this.enabled = config.enabled;
  }

  /**
   * Enable kill switch
   */
  async enable(): Promise<void> {
    if (this.enabled) return;

    try {
      this.emit('enabling');

      // Save original network configuration
      await this.saveNetworkState();

      // Set up firewall rules
      await this.setupFirewallRules();

      this.enabled = true;
      this.emit('enabled');

    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Disable kill switch
   */
  async disable(): Promise<void> {
    if (!this.enabled) return;

    try {
      this.emit('disabling');

      // Remove firewall rules
      await this.removeFirewallRules();

      // Restore original network configuration
      await this.restoreNetworkState();

      this.enabled = false;
      this.blocking = false;
      this.emit('disabled');

    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Activate blocking (VPN disconnected)
   */
  async activate(): Promise<void> {
    if (!this.enabled || this.blocking) return;

    try {
      this.emit('activating');

      // Block all non-VPN traffic
      await this.blockAllTraffic();

      this.blocking = true;
      this.emit('activated');
      this.emit('warning', 'Kill switch activated - Internet blocked until VPN reconnects');

    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Deactivate blocking (VPN reconnected)
   */
  async deactivate(): Promise<void> {
    if (!this.blocking) return;

    try {
      this.emit('deactivating');

      // Unblock traffic
      await this.unblockTraffic();

      this.blocking = false;
      this.emit('deactivated');

    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Check if kill switch is active
   */
  isActive(): boolean {
    return this.enabled;
  }

  /**
   * Check if currently blocking
   */
  isBlocking(): boolean {
    return this.blocking;
  }

  /**
   * Save current network state
   */
  private async saveNetworkState(): Promise<void> {
    const platform = this.detectPlatform();

    switch (platform) {
      case 'windows':
        await this.saveWindowsNetworkState();
        break;
      case 'macos':
        await this.saveMacOSNetworkState();
        break;
      case 'linux':
        await this.saveLinuxNetworkState();
        break;
      case 'web':
        // Web platform doesn't need network state saving
        break;
    }
  }

  /**
   * Restore original network state
   */
  private async restoreNetworkState(): Promise<void> {
    const platform = this.detectPlatform();

    switch (platform) {
      case 'windows':
        await this.restoreWindowsNetworkState();
        break;
      case 'macos':
        await this.restoreMacOSNetworkState();
        break;
      case 'linux':
        await this.restoreLinuxNetworkState();
        break;
    }
  }

  /**
   * Setup firewall rules
   */
  private async setupFirewallRules(): Promise<void> {
    const platform = this.detectPlatform();

    switch (platform) {
      case 'windows':
        await this.setupWindowsFirewall();
        break;
      case 'macos':
        await this.setupMacOSFirewall();
        break;
      case 'linux':
        await this.setupLinuxFirewall();
        break;
      case 'web':
        await this.setupWebFirewall();
        break;
    }
  }

  /**
   * Remove firewall rules
   */
  private async removeFirewallRules(): Promise<void> {
    const platform = this.detectPlatform();

    switch (platform) {
      case 'windows':
        await this.removeWindowsFirewall();
        break;
      case 'macos':
        await this.removeMacOSFirewall();
        break;
      case 'linux':
        await this.removeLinuxFirewall();
        break;
    }
  }

  /**
   * Block all traffic
   */
  private async blockAllTraffic(): Promise<void> {
    const platform = this.detectPlatform();

    switch (platform) {
      case 'windows':
        await this.execCommand('netsh advfirewall set allprofiles firewallpolicy blockinbound,blockoutbound');
        if (this.config.allowLAN) {
          await this.allowLANTraffic();
        }
        break;
      
      case 'macos':
        await this.execCommand('pfctl -d'); // Disable packet filter
        await this.execCommand('pfctl -e'); // Re-enable with block rules
        break;
      
      case 'linux':
        await this.execCommand('iptables -P INPUT DROP');
        await this.execCommand('iptables -P OUTPUT DROP');
        await this.execCommand('iptables -P FORWARD DROP');
        if (this.config.allowLAN) {
          await this.allowLANTraffic();
        }
        break;
      
      case 'web':
        // Web: Use service worker to intercept requests
        await this.blockWebTraffic();
        break;
    }
  }

  /**
   * Unblock traffic
   */
  private async unblockTraffic(): Promise<void> {
    const platform = this.detectPlatform();

    switch (platform) {
      case 'windows':
        await this.execCommand('netsh advfirewall set allprofiles firewallpolicy allowinbound,allowoutbound');
        break;
      
      case 'macos':
        await this.execCommand('pfctl -d');
        break;
      
      case 'linux':
        await this.execCommand('iptables -P INPUT ACCEPT');
        await this.execCommand('iptables -P OUTPUT ACCEPT');
        await this.execCommand('iptables -P FORWARD ACCEPT');
        await this.execCommand('iptables -F'); // Flush rules
        break;
      
      case 'web':
        await this.unblockWebTraffic();
        break;
    }
  }

  /**
   * Allow LAN traffic
   */
  private async allowLANTraffic(): Promise<void> {
    const platform = this.detectPlatform();

    const lanRanges = [
      '10.0.0.0/8',
      '172.16.0.0/12',
      '192.168.0.0/16',
      '169.254.0.0/16'
    ];

    switch (platform) {
      case 'linux':
        for (const range of lanRanges) {
          await this.execCommand(`iptables -A INPUT -s ${range} -j ACCEPT`);
          await this.execCommand(`iptables -A OUTPUT -d ${range} -j ACCEPT`);
        }
        break;
      
      // Similar for other platforms...
    }
  }

  /**
   * Platform-specific implementations
   */
  private async setupWindowsFirewall(): Promise<void> {
    const ruleName = 'GhostVPN-KillSwitch';
    
    // Create firewall rule to block non-VPN traffic
    await this.execCommand(
      `netsh advfirewall firewall add rule name="${ruleName}" ` +
      `dir=out action=block program=any enable=yes`
    );
  }

  private async removeWindowsFirewall(): Promise<void> {
    await this.execCommand('netsh advfirewall firewall delete rule name="GhostVPN-KillSwitch"');
  }

  private async setupLinuxFirewall(): Promise<void> {
    // Use iptables to create kill switch rules
    const commands = [
      'iptables -N GHOST_VPN_KS',
      'iptables -A OUTPUT -j GHOST_VPN_KS',
      'iptables -A GHOST_VPN_KS -o lo -j ACCEPT', // Allow localhost
    ];

    if (this.config.allowLAN) {
      commands.push(
        'iptables -A GHOST_VPN_KS -d 192.168.0.0/16 -j ACCEPT',
        'iptables -A GHOST_VPN_KS -d 10.0.0.0/8 -j ACCEPT',
        'iptables -A GHOST_VPN_KS -d 172.16.0.0/12 -j ACCEPT'
      );
    }

    commands.push('iptables -A GHOST_VPN_KS -j DROP'); // Drop everything else

    for (const cmd of commands) {
      await this.execCommand(cmd);
    }
  }

  private async removeLinuxFirewall(): Promise<void> {
    await this.execCommand('iptables -D OUTPUT -j GHOST_VPN_KS');
    await this.execCommand('iptables -F GHOST_VPN_KS');
    await this.execCommand('iptables -X GHOST_VPN_KS');
  }

  private async setupMacOSFirewall(): Promise<void> {
    // Use pfctl (packet filter) for macOS
    const pfConf = `
block drop all
pass on lo0
${this.config.allowLAN ? 'pass to 192.168.0.0/16\npass to 10.0.0.0/8\npass to 172.16.0.0/12' : ''}
    `.trim();

    // Write pf config and enable
    await this.execCommand(`echo "${pfConf}" | pfctl -f -`);
    await this.execCommand('pfctl -e');
  }

  private async removeMacOSFirewall(): Promise<void> {
    await this.execCommand('pfctl -d');
  }

  private async setupWebFirewall(): Promise<void> {
    // Register service worker to intercept network requests
    if ('serviceWorker' in navigator) {
      await navigator.serviceWorker.register('/ghost-vpn-kill-switch-sw.js');
    }
  }

  private async blockWebTraffic(): Promise<void> {
    // Send message to service worker to block all requests
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'BLOCK_ALL'
      });
    }
  }

  private async unblockWebTraffic(): Promise<void> {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'UNBLOCK_ALL'
      });
    }
  }

  private async saveWindowsNetworkState(): Promise<void> {
    // Save current firewall rules
    const result = await this.execCommand('netsh advfirewall show allprofiles');
    this.originalRoutes.push({ platform: 'windows', state: result });
  }

  private async restoreWindowsNetworkState(): Promise<void> {
    // Restore saved state
    // Implementation depends on saved data structure
  }

  private async saveLinuxNetworkState(): Promise<void> {
    const result = await this.execCommand('iptables-save');
    this.originalRoutes.push({ platform: 'linux', state: result });
  }

  private async restoreLinuxNetworkState(): Promise<void> {
    const saved = this.originalRoutes.find(r => r.platform === 'linux');
    if (saved) {
      await this.execCommand(`echo "${saved.state}" | iptables-restore`);
    }
  }

  private async saveMacOSNetworkState(): Promise<void> {
    const result = await this.execCommand('pfctl -s rules');
    this.originalRoutes.push({ platform: 'macos', state: result });
  }

  private async restoreMacOSNetworkState(): Promise<void> {
    await this.execCommand('pfctl -d');
  }

  /**
   * Execute system command
   */
  private async execCommand(command: string): Promise<string> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execPromise = promisify(exec);

    try {
      const { stdout, stderr } = await execPromise(command);
      return stdout;
    } catch (error) {
      throw new Error(`Command failed: ${command}\n${error}`);
    }
  }

  /**
   * Detect platform
   */
  private detectPlatform(): 'windows' | 'macos' | 'linux' | 'web' {
    if (typeof process !== 'undefined' && process.platform) {
      if (process.platform === 'win32') return 'windows';
      if (process.platform === 'darwin') return 'macos';
      if (process.platform === 'linux') return 'linux';
    }
    return 'web';
  }
}

export default KillSwitch;

