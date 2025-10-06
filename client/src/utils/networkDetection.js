/**
 * networkDetection.js - Utility để phát hiện tình trạng mạng
 * Cải thiện trải nghiệm người dùng trên mạng chậm/không ổn định
 */

/**
 * Kiểm tra kết nối mạng
 * @returns {boolean} true nếu đang online
 */
export function isOnline() {
  return navigator.onLine;
}

/**
 * Ước tính chất lượng kết nối dựa trên Network Information API
 * @returns {string} "slow", "medium", "fast" hoặc "unknown"
 */
export function getConnectionQuality() {
  // Check if Network Information API is available
  if ('connection' in navigator && 'effectiveType' in navigator.connection) {
    const { effectiveType } = navigator.connection;
    switch (effectiveType) {
      case 'slow-2g':
      case '2g':
        return 'slow';
      case '3g':
        return 'medium';
      case '4g':
        return 'fast';
      default:
        return 'unknown';
    }
  }
  return 'unknown';
}

/**
 * Theo dõi sự thay đổi kết nối mạng
 * @param {Function} onNetworkChange - Callback khi mạng thay đổi
 * @returns {Function} - Function để hủy theo dõi
 */
export function listenToNetworkChanges(onNetworkChange) {
  const handleOnline = () => onNetworkChange(true, getConnectionQuality());
  const handleOffline = () => onNetworkChange(false, 'offline');
  
  // Track connection quality changes if supported
  let connectionChange = null;
  if ('connection' in navigator) {
    connectionChange = () => onNetworkChange(isOnline(), getConnectionQuality());
    navigator.connection.addEventListener('change', connectionChange);
  }

  // Track online/offline status
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    if (connectionChange && 'connection' in navigator) {
      navigator.connection.removeEventListener('change', connectionChange);
    }
  };
}