import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, Zap } from 'lucide-react';
import { getStoredRateLimitInfo, formatTimeUntilReset } from '../utils/rateLimitHandler.js';

/**
 * RateLimitIndicator - Component hiển thị trạng thái rate limiting
 * @param {string} endpoint - API endpoint để check rate limit
 * @param {boolean} showWhenLow - Chỉ hiển thị khi rate limit thấp
 */
export default function RateLimitIndicator({ endpoint = '/api/posts', showWhenLow = true }) {
  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkRateLimit = () => {
      const info = getStoredRateLimitInfo(endpoint);
      if (info) {
        setRateLimitInfo(info);
        
        // Show indicator if remaining is low or warning is set
        const shouldShow = !showWhenLow || 
          info.warning || 
          (info.remaining && info.remaining <= 10) ||
          (info.remaining && info.limit && (info.remaining / info.limit) <= 0.2);
        
        setIsVisible(shouldShow);
      } else {
        setIsVisible(false);
      }
    };

    // Check immediately
    checkRateLimit();

    // Check every 30 seconds
    const interval = setInterval(checkRateLimit, 30000);

    return () => clearInterval(interval);
  }, [endpoint, showWhenLow]);

  if (!isVisible || !rateLimitInfo) {
    return null;
  }

  const usagePercentage = rateLimitInfo.limit ? 
    Math.round((rateLimitInfo.used / rateLimitInfo.limit) * 100) : 0;
  
  const timeUntilReset = formatTimeUntilReset(rateLimitInfo);
  
  // Determine color based on usage
  let colorClass = 'text-green-600';
  let bgClass = 'bg-green-100';
  let icon = <Zap className="w-4 h-4" />;
  
  if (usagePercentage >= 80) {
    colorClass = 'text-red-600';
    bgClass = 'bg-red-100';
    icon = <AlertTriangle className="w-4 h-4" />;
  } else if (usagePercentage >= 60) {
    colorClass = 'text-yellow-600';
    bgClass = 'bg-yellow-100';
    icon = <Clock className="w-4 h-4" />;
  }

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${colorClass} ${bgClass}`}>
      {icon}
      <span className="ml-1">
        {rateLimitInfo.remaining}/{rateLimitInfo.limit} requests
      </span>
      {timeUntilReset && (
        <span className="ml-2 text-xs opacity-75">
          (reset in {timeUntilReset})
        </span>
      )}
    </div>
  );
}

/**
 * RateLimitStatus - Component hiển thị chi tiết rate limit status
 */
export function RateLimitStatus({ endpoint = '/api/posts' }) {
  const [rateLimitInfo, setRateLimitInfo] = useState(null);

  useEffect(() => {
    const checkRateLimit = () => {
      const info = getStoredRateLimitInfo(endpoint);
      setRateLimitInfo(info);
    };

    checkRateLimit();
    const interval = setInterval(checkRateLimit, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [endpoint]);

  if (!rateLimitInfo) {
    return (
      <div className="text-sm text-gray-500">
        No rate limit data available
      </div>
    );
  }

  const usagePercentage = rateLimitInfo.limit ? 
    Math.round((rateLimitInfo.used / rateLimitInfo.limit) * 100) : 0;
  
  const timeUntilReset = formatTimeUntilReset(rateLimitInfo);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">API Usage</span>
        <span className="text-gray-600">
          {rateLimitInfo.used}/{rateLimitInfo.limit} ({usagePercentage}%)
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${
            usagePercentage >= 80 ? 'bg-red-500' : 
            usagePercentage >= 60 ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(usagePercentage, 100)}%` }}
        />
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Remaining: {rateLimitInfo.remaining}</span>
        {timeUntilReset && (
          <span>Reset in: {timeUntilReset}</span>
        )}
      </div>
      
      {rateLimitInfo.warning && (
        <div className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
          ⚠️ Rate limit warning active
        </div>
      )}
    </div>
  );
}
