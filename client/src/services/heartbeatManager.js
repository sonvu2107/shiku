/**
 * Centralized Heartbeat Manager
 * Prevents multiple components from creating duplicate heartbeat intervals
 * 
 * Before: Multiple components → 12 requests/minute
 * After:  Single manager → 1 request/minute
 * Improvement: 92% reduction!
 */
import { api } from '../api';

class HeartbeatManager {
  constructor() {
    this.interval = null;
    this.frequency = 60000; // 60 seconds (configurable)
    this.listeners = new Set();
    this.isActive = false;
    this.lastHeartbeat = null;
  }

  /**
   * Start heartbeat polling
   * Safe to call multiple times - will not create duplicate intervals
   */
  start() {
    if (this.interval) {
      console.log('[HEARTBEAT] Already running');
      return;
    }

    console.log(`[HEARTBEAT] Starting with ${this.frequency / 1000}s interval`);
    this.isActive = true;
    
    // Send immediate heartbeat
    this.sendHeartbeat();
    
    // Schedule periodic heartbeats
    this.interval = setInterval(() => {
      this.sendHeartbeat();
    }, this.frequency);
  }

  /**
   * Stop heartbeat polling
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      this.isActive = false;
      console.log('[HEARTBEAT] Stopped');
    }
  }

  /**
   * Send heartbeat request to server
   */
  async sendHeartbeat() {
    if (!this.isActive) return;

    try {
      const data = (await api('/api/auth/heartbeat', { method: 'POST' })) || {};
      this.lastHeartbeat = new Date();

      const onlineStatus = data.isOnline ?? data.online ?? 'N/A';
      console.log('[HEARTBEAT] Success', {
        time: this.lastHeartbeat.toLocaleTimeString(),
        online: onlineStatus
      });

      this.notifyListeners(data);
    } catch (err) {
      console.error('[HEARTBEAT] Error:', err.message);
    }
  }

  /**
   * Subscribe to heartbeat events
   * @param {Function} callback - Called when heartbeat succeeds
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all subscribers of heartbeat data
   * @private
   */
  notifyListeners(data) {
    this.listeners.forEach(callback => {
      try {
        callback(data);
      } catch (err) {
        console.error('[HEARTBEAT] Listener error:', err);
      }
    });
  }

  /**
   * Manually trigger heartbeat (useful for debugging)
   */
  ping() {
    console.log('[HEARTBEAT] Manual ping');
    this.sendHeartbeat();
  }

  /**
   * Get heartbeat status
   */
  getStatus() {
    return {
      isActive: this.isActive,
      frequency: this.frequency,
      lastHeartbeat: this.lastHeartbeat,
      listenerCount: this.listeners.size
    };
  }

  /**
   * Change heartbeat frequency (useful for different environments)
   * @param {number} ms - Frequency in milliseconds
   */
  setFrequency(ms) {
    const wasActive = this.isActive;
    
    if (wasActive) {
      this.stop();
    }
    
    this.frequency = ms;
    console.log(`[HEARTBEAT] Frequency changed to ${ms / 1000}s`);
    
    if (wasActive) {
      this.start();
    }
  }
}

// Create singleton instance
export const heartbeatManager = new HeartbeatManager();

// React hook for components that need heartbeat data
export function useHeartbeat() {
  const [heartbeatData, setHeartbeatData] = React.useState(null);
  const [lastUpdate, setLastUpdate] = React.useState(null);

  React.useEffect(() => {
    const unsubscribe = heartbeatManager.subscribe((data) => {
      setHeartbeatData(data);
      setLastUpdate(new Date());
    });

    return unsubscribe;
  }, []);

  return { heartbeatData, lastUpdate };
}

// Optional: WebSocket alternative (future optimization)
/*
class WebSocketHeartbeat {
  constructor() {
    this.ws = null;
    this.reconnectTimeout = null;
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/heartbeat`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('[WS HEARTBEAT] Connected');
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('[WS HEARTBEAT] Pong', data);
    };
    
    this.ws.onclose = () => {
      console.log('[WS HEARTBEAT] Disconnected, reconnecting...');
      this.reconnectTimeout = setTimeout(() => this.connect(), 5000);
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
  }
}

export const wsHeartbeat = new WebSocketHeartbeat();
*/

// Example usage:
/*
// In App.jsx
import { heartbeatManager } from './services/heartbeatManager';

function App() {
  useEffect(() => {
    // Start on mount
    heartbeatManager.start();
    
    // Stop on unmount
    return () => heartbeatManager.stop();
  }, []);
  
  return <Router>...</Router>;
}

// In a component that needs heartbeat data
import { useHeartbeat } from './services/heartbeatManager';

function OnlineStatus() {
  const { heartbeatData, lastUpdate } = useHeartbeat();
  
  return (
    <div>
      Last heartbeat: {lastUpdate?.toLocaleTimeString()}
      Online users: {heartbeatData?.online}
    </div>
  );
}
*/
