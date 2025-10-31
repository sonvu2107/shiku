/**
 * KeepAlive Utility - Giữ server Render luôn chạy
 * Ping health endpoint định kỳ để tránh server sleep
 */

let keepAliveInterval = null;
let isKeepAliveActive = false;

/**
 * Ping server health endpoint
 */
const pingServer = async () => {
  try {
    const response = await fetch('/api/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Server keepalive ping successful:', {
        status: data.status,
        uptime: Math.round(data.uptime / 60) + ' minutes',
        timestamp: new Date().toLocaleTimeString()
      });
    } else {
      console.warn('⚠️ Server keepalive ping failed:', response.status);
    }
  } catch (error) {
    console.warn('❌ Server keepalive error:', error.message);
  }
};

/**
 * Bắt đầu keepalive service
 * @param {number} intervalMinutes - Thời gian ping (phút)
 * @param {boolean} onlyWhenActive - Chỉ ping khi tab active
 */
export const startKeepAlive = (intervalMinutes = 10, onlyWhenActive = true) => {
  if (isKeepAliveActive) {
    console.log('🔄 KeepAlive service is already running');
    return;
  }

  const intervalMs = intervalMinutes * 60 * 1000;
  
  console.log(`🚀 Starting KeepAlive service (${intervalMinutes} min intervals)`);
  
  // Ping ngay lập tức
  pingServer();
  
  // Setup interval
  keepAliveInterval = setInterval(() => {
    // Chỉ ping khi tab active (nếu được bật)
    if (onlyWhenActive && document.hidden) {
      console.log('⏸️ Tab inactive, skipping keepalive ping');
      return;
    }
    
    pingServer();
  }, intervalMs);
  
  isKeepAliveActive = true;
  
  // Cleanup khi page unload
  const cleanup = () => stopKeepAlive();
  window.addEventListener('beforeunload', cleanup);
  
  return cleanup;
};

/**
 * Dừng keepalive service
 */
export const stopKeepAlive = () => {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
    isKeepAliveActive = false;
    console.log('🛑 KeepAlive service stopped');
  }
};

/**
 * Kiểm tra trạng thái keepalive
 */
export const getKeepAliveStatus = () => ({
  active: isKeepAliveActive,
  interval: keepAliveInterval ? 'Running' : 'Stopped'
});

/**
 * Hook React cho keepalive
 */
export const useKeepAlive = (enabled = true, intervalMinutes = 10) => {
  const [status, setStatus] = React.useState(getKeepAliveStatus());
  
  React.useEffect(() => {
    if (!enabled) return;
    
    const cleanup = startKeepAlive(intervalMinutes, true);
    
    // Update status
    const updateStatus = () => setStatus(getKeepAliveStatus());
    const statusInterval = setInterval(updateStatus, 1000);
    
    return () => {
      cleanup?.();
      clearInterval(statusInterval);
    };
  }, [enabled, intervalMinutes]);
  
  return status;
};

// Auto-start nếu không phải development
if (process.env.NODE_ENV === 'production') {
  // Đợi DOM load xong
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      startKeepAlive(10, true);
    });
  } else {
    startKeepAlive(10, true);
  }
}

export default {
  start: startKeepAlive,
  stop: stopKeepAlive,
  status: getKeepAliveStatus,
  ping: pingServer
};