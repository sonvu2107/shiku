import { 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  Globe, 
  Server, 
  RefreshCw,
  BarChart3,
  Zap,
  Users,
  Shield,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { useAPIMonitoring } from '../hooks/useAPIMonitoring';
import '../styles-mobile-api-monitoring.css';

/**
 * APIMonitoring - Component hiển thị thống kê API và rate limiting
 * @returns {JSX.Element} Component API monitoring
 */
export default function APIMonitoring() {
  const {
    stats,
    rateLimits,
    loading,
    error,
    lastUpdate,
    realtimeUpdates,
    isRealtimeEnabled,
    fetchStats,
    resetStats,
    setIsRealtimeEnabled
  } = useAPIMonitoring();

  const [activeSection, setActiveSection] = useState('overview');
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const sections = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'charts', label: 'Charts', icon: BarChart3 },
    { id: 'limits', label: 'Rate Limits', icon: Shield },
    { id: 'realtime', label: 'Real-time', icon: Clock },
    { id: 'info', label: 'Info', icon: Server }
  ];

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    setShowMobileMenu(false);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (loading) {
    return (
      <div className="mobile-loading">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Đang tải thống kê API...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mobile-error">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          <span>Lỗi: {error}</span>
        </div>
        <button 
          onClick={fetchStats}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline mobile-touch-target"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!stats || !rateLimits) {
    return (
      <div className="text-center py-8 text-gray-500">
        Không có dữ liệu API
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 flex-wrap">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="truncate">API Monitoring</span>
              <div className="flex items-center gap-1 flex-wrap">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                  <Server className="w-3 h-3 mr-1" />
                  Persistent
                </span>
                {isRealtimeEnabled && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                    Live
                  </span>
                )}
              </div>
            </h2>
            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="sm:hidden p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
            >
              {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-gray-600 text-xs sm:text-sm mt-1">
            <span className="block sm:inline">Cập nhật: {lastUpdate.toLocaleTimeString()}</span>
            {isRealtimeEnabled && (
              <span className="block sm:inline sm:ml-2 text-green-600">• Real-time enabled</span>
            )}
            <span className="block sm:inline sm:ml-2 text-blue-600">• Persistent storage</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setIsRealtimeEnabled(!isRealtimeEnabled)}
            className={`btn-outline btn-sm flex items-center gap-1 sm:gap-2 text-xs sm:text-sm ${
              isRealtimeEnabled ? 'text-green-600' : 'text-gray-500'
            }`}
          >
            <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">{isRealtimeEnabled ? 'Disable Live' : 'Enable Live'}</span>
            <span className="sm:hidden">{isRealtimeEnabled ? 'Live' : 'Off'}</span>
          </button>
          <button
            onClick={resetStats}
            className="btn-outline btn-sm flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
          >
            <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Reset Stats</span>
            <span className="sm:hidden">Reset</span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {showMobileMenu && (
        <div className="sm:hidden bg-white border rounded-lg p-4 shadow-lg">
          <div className="grid grid-cols-2 gap-2">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`flex items-center gap-2 p-3 rounded-lg text-sm font-medium transition-colors ${
                    activeSection === section.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {section.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Desktop Navigation */}
      <div className="hidden sm:flex items-center gap-1 bg-gray-50 rounded-lg p-1">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeSection === section.id
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {section.label}
            </button>
          );
        })}
      </div>

      {/* Overview Cards - Mobile Optimized */}
      <div id="overview" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Requests */}
        <div className="bg-blue-50 p-3 sm:p-4 rounded-lg mobile-card">
          <div className="flex items-center gap-2 mb-1 sm:mb-2">
            <Server className="text-blue-600 w-4 h-4 sm:w-6 sm:h-6 flex-shrink-0" />
            <div className="text-lg sm:text-2xl font-bold text-blue-600 truncate mobile-number">
              {stats.overview.totalRequests.toLocaleString()}
            </div>
          </div>
          <div className="text-xs sm:text-sm text-gray-600 mobile-text">Tổng requests</div>
          <div className="text-xs text-gray-500 mt-1 truncate mobile-text">
            {stats.overview.requestsPerMinute} req/min
          </div>
        </div>

        {/* Rate Limit Hits */}
        <div className="bg-red-50 p-3 sm:p-4 rounded-lg mobile-card">
          <div className="flex items-center gap-2 mb-1 sm:mb-2">
            <Shield className="text-red-600 w-4 h-4 sm:w-6 sm:h-6 flex-shrink-0" />
            <div className="text-lg sm:text-2xl font-bold text-red-600 mobile-number">
              {stats.overview.rateLimitHits}
            </div>
          </div>
          <div className="text-xs sm:text-sm text-gray-600 mobile-text">Rate limit hits</div>
          <div className="text-xs text-gray-500 mt-1 mobile-text">
            {stats.overview.rateLimitHitRate}% hit rate
          </div>
        </div>

        {/* Time Since Reset */}
        <div className="bg-green-50 p-3 sm:p-4 rounded-lg mobile-card">
          <div className="flex items-center gap-2 mb-1 sm:mb-2">
            <Clock className="text-green-600 w-4 h-4 sm:w-6 sm:h-6 flex-shrink-0" />
            <div className="text-lg sm:text-2xl font-bold text-green-600 mobile-number">
              {stats.overview.timeSinceReset}
            </div>
          </div>
          <div className="text-xs sm:text-sm text-gray-600 mobile-text">Phút từ reset</div>
          <div className="text-xs text-gray-500 mt-1 truncate mobile-text">
            {new Date(stats.overview.lastReset).toLocaleTimeString()}
          </div>
        </div>

        {/* Top Endpoint */}
        <div className="bg-purple-50 p-3 sm:p-4 rounded-lg mobile-card">
          <div className="flex items-center gap-2 mb-1 sm:mb-2">
            <TrendingUp className="text-purple-600 w-4 h-4 sm:w-6 sm:h-6 flex-shrink-0" />
            <div className="text-lg sm:text-2xl font-bold text-purple-600 mobile-number">
              {stats.topEndpoints[0]?.count || 0}
            </div>
          </div>
          <div className="text-xs sm:text-sm text-gray-600 mobile-text">Top endpoint</div>
          <div className="text-xs text-gray-500 mt-1 truncate mobile-text">
            {stats.topEndpoints[0]?.endpoint || 'N/A'}
          </div>
        </div>
      </div>

      {/* Charts Section - Mobile Optimized */}
      <div id="charts" className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Top Endpoints */}
        <div className="bg-white border rounded-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
            Top 10 Endpoints
          </h3>
          <div className="space-y-2 overflow-x-auto">
            <div className="min-w-[300px] space-y-2">
              {stats.topEndpoints.map((endpoint, index) => (
                <div key={endpoint.endpoint} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-xs sm:text-sm font-medium text-gray-500 w-4 sm:w-6 flex-shrink-0">
                      {index + 1}.
                    </span>
                    <span className="text-xs sm:text-sm truncate min-w-0">
                      {endpoint.endpoint}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-16 sm:w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ 
                          width: `${stats.topEndpoints[0]?.count ? (endpoint.count / stats.topEndpoints[0].count) * 100 : 0}%` 
                        }}
                      />
                    </div>
                    <span className="text-xs sm:text-sm font-medium w-8 sm:w-12 text-right">
                      {endpoint.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top IPs */}
        <div className="bg-white border rounded-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
            Top 10 IPs
          </h3>
          <div className="space-y-2 overflow-x-auto">
            <div className="min-w-[300px] space-y-2">
              {stats.topIPs.map((ip, index) => (
                <div key={ip.ip} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-xs sm:text-sm font-medium text-gray-500 w-4 sm:w-6 flex-shrink-0">
                      {index + 1}.
                    </span>
                    <span className="text-xs sm:text-sm font-mono truncate min-w-0">
                      {ip.ip}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-16 sm:w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full"
                        style={{ 
                          width: `${stats.topIPs[0]?.count ? (ip.count / stats.topIPs[0].count) * 100 : 0}%` 
                        }}
                      />
                    </div>
                    <span className="text-xs sm:text-sm font-medium w-8 sm:w-12 text-right">
                      {ip.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Rate Limits Section - Mobile Optimized */}
      <div id="limits" className="bg-white border rounded-lg p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
          Rate Limits Configuration
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {Object.entries(rateLimits).map(([key, limit]) => (
            <div key={key} className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1 sm:mb-2">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                <span className="font-medium capitalize text-sm sm:text-base truncate">{key}</span>
              </div>
              <div className="text-xs sm:text-sm text-gray-600 mb-1">
                {limit.description}
              </div>
              <div className="text-base sm:text-lg font-bold text-blue-600">
                {limit.max} requests
              </div>
              <div className="text-xs text-gray-500">
                per {limit.windowMs / 60000} minutes
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hourly Distribution - Mobile Optimized */}
      <div className="bg-white border rounded-lg p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          Requests by Hour
        </h3>
        <div className="overflow-x-auto">
          <div className="grid grid-cols-12 gap-1 min-w-[600px]">
            {stats.hourlyDistribution.map((hour, index) => (
              <div key={hour.hour} className="text-center">
                <div className="text-xs text-gray-500 mb-1">
                  {hour.hour}h
                </div>
                <div className="bg-gray-200 rounded h-16 sm:h-20 flex items-end">
                  <div 
                    className="bg-blue-500 w-full rounded"
                    style={{ 
                      height: `${Math.max(2, (hour.requests / Math.max(...stats.hourlyDistribution.map(h => h.requests))) * 100)}%` 
                    }}
                  />
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {hour.requests}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rate Limit Hits by Endpoint - Mobile Optimized */}
      {Object.keys(stats.rateLimitHitsByEndpoint).length > 0 && (
        <div className="bg-white border rounded-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
            Rate Limit Hits by Endpoint
          </h3>
          <div className="space-y-2">
            {Object.entries(stats.rateLimitHitsByEndpoint).map(([endpoint, hits]) => (
              <div key={endpoint} className="flex items-center justify-between bg-red-50 p-2 sm:p-3 rounded">
                <span className="text-xs sm:text-sm font-medium truncate flex-1 min-w-0">{endpoint}</span>
                <span className="text-xs sm:text-sm font-bold text-red-600 flex-shrink-0 ml-2">{hits} hits</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Real-time Updates Feed - Mobile Optimized */}
      {isRealtimeEnabled && realtimeUpdates.length > 0 && (
        <div id="realtime" className="bg-white border rounded-lg p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            Real-time API Calls
            <span className="text-xs sm:text-sm text-gray-500">(Last 50 calls)</span>
          </h3>
          <div className="max-h-64 sm:max-h-96 overflow-y-auto space-y-2">
            {realtimeUpdates.slice(0, 20).map((update) => (
              <div 
                key={update.id} 
                className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    update.statusCode >= 400 ? 'bg-red-500' : 
                    update.statusCode >= 300 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></div>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-xs sm:text-sm">
                      <span className="font-bold text-blue-600">{update.method}</span>
                      <span className="mx-1 sm:mx-2 text-gray-400">•</span>
                      <span className="text-gray-700 truncate">{update.endpoint}</span>
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {update.ip} • {new Date(update.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <div className={`text-xs sm:text-sm font-bold ${
                    update.statusCode >= 400 ? 'text-red-600' : 
                    update.statusCode >= 300 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {update.statusCode}
                  </div>
                  <div className="text-xs text-gray-500">
                    {update.totalRequests}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Persistent Storage Info - Mobile Optimized */}
      <div id="info" className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
        <div className="flex items-start gap-2 sm:gap-3">
          <Server className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-blue-900 mb-1 text-sm sm:text-base">Persistent Storage</h4>
            <p className="text-xs sm:text-sm text-blue-700 mb-2">
              Dữ liệu API monitoring được lưu trữ trong database và không bị mất khi:
            </p>
            <ul className="text-xs text-blue-600 space-y-1">
              <li>• Admin tắt web hoặc đăng xuất</li>
              <li>• Server restart hoặc maintenance</li>
              <li>• Có user khác truy cập hệ thống</li>
            </ul>
            <p className="text-xs text-blue-600 mt-2">
              Dữ liệu cũ hơn 7 ngày sẽ được tự động xóa để tối ưu hiệu suất.
            </p>
          </div>
        </div>
      </div>

      {/* Auto Refresh Indicator - Mobile Optimized */}
      <div className="text-center text-xs sm:text-sm text-gray-500 px-4">
        {isRealtimeEnabled ? (
          <>
            <Activity className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 text-green-600" />
            <span className="hidden sm:inline">Real-time updates enabled • Live monitoring active</span>
            <span className="sm:hidden">Live monitoring active</span>
          </>
        ) : (
          <>
            <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 animate-spin" />
            <span className="hidden sm:inline">Tự động cập nhật mỗi 30 giây</span>
            <span className="sm:hidden">Auto refresh 30s</span>
          </>
        )}
      </div>
    </div>
  );
}
