import { useState } from "react";
import { api } from "../api";

/**
 * ApiTester - Trang test tất cả các API endpoints
 * Chỉ admin mới có thể truy cập
 */
export default function ApiTester() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});
  const [rateLimitInfo, setRateLimitInfo] = useState({});
  const [testSettings, setTestSettings] = useState({
    delayBetweenRequests: 500, // ms delay giữa các requests
    maxConcurrentRequests: 3, // số requests đồng thời tối đa
    retryOnRateLimit: true, // tự động retry khi bị rate limit
    maxRetries: 3 // số lần retry tối đa
  });
  const [testData, setTestData] = useState({
    userId: "",
    postId: "",
    groupId: "",
    searchQuery: "test",
    email: "test@example.com",
    password: "Test123!@#"
  });

  // Danh sách tất cả các API endpoints để test
  const apiEndpoints = [
    // ==================== AUTH APIs ====================
    {
      category: "Authentication",
      name: "Get Current User",
      method: "GET",
      endpoint: "/api/auth/me",
      description: "Lấy thông tin user hiện tại"
    },
    {
      category: "Authentication", 
      name: "Logout",
      method: "POST",
      endpoint: "/api/auth/logout",
      description: "Đăng xuất"
    },

    // ==================== USERS APIs ====================
    {
      category: "Users",
      name: "Get All Users",
      method: "GET", 
      endpoint: "/api/users",
      description: "Lấy danh sách tất cả users (chỉ admin)",
      requiresAdmin: true
    },
    {
      category: "Users",
      name: "Get User by ID",
      method: "GET",
      endpoint: "/api/users/{userId}",
      description: "Lấy thông tin user theo ID",
      needsInput: "userId"
    },
    {
      category: "Users",
      name: "Search Users",
      method: "GET",
      endpoint: "/api/users/search?q={query}",
      description: "Tìm kiếm users",
      needsInput: "searchQuery"
    },

    // ==================== FRIENDS APIs ====================
    {
      category: "Friends",
      name: "Get Friend Requests",
      method: "GET",
      endpoint: "/api/friends/requests",
      description: "Lấy danh sách lời mời kết bạn"
    },
    {
      category: "Friends",
      name: "Get Friends List",
      method: "GET",
      endpoint: "/api/friends/list",
      description: "Lấy danh sách bạn bè"
    },
    {
      category: "Friends",
      name: "Get Friend Suggestions",
      method: "GET",
      endpoint: "/api/friends/suggestions",
      description: "Lấy gợi ý kết bạn"
    },
    {
      category: "Friends",
      name: "Search Friends",
      method: "GET",
      endpoint: "/api/friends/search-friends?q={query}",
      description: "Tìm kiếm trong danh sách bạn bè",
      needsInput: "searchQuery"
    },

    // ==================== POSTS APIs ====================
    {
      category: "Posts",
      name: "Get All Posts",
      method: "GET",
      endpoint: "/api/posts",
      description: "Lấy danh sách tất cả posts"
    },
    {
      category: "Posts",
      name: "Get Post by ID",
      method: "GET",
      endpoint: "/api/posts/{postId}",
      description: "Lấy thông tin post theo ID",
      needsInput: "postId"
    },
    {
      category: "Posts",
      name: "Search Posts",
      method: "GET",
      endpoint: "/api/posts/search?q={query}",
      description: "Tìm kiếm posts",
      needsInput: "searchQuery"
    },

    // ==================== GROUPS APIs ====================
    {
      category: "Groups",
      name: "Get All Groups",
      method: "GET",
      endpoint: "/api/groups",
      description: "Lấy danh sách tất cả groups"
    },
    {
      category: "Groups",
      name: "Get Group by ID",
      method: "GET",
      endpoint: "/api/groups/{groupId}",
      description: "Lấy thông tin group theo ID",
      needsInput: "groupId"
    },

    // ==================== NOTIFICATIONS APIs ====================
    {
      category: "Notifications",
      name: "Get Notifications",
      method: "GET",
      endpoint: "/api/notifications",
      description: "Lấy danh sách thông báo"
    },

    // ==================== MEDIA APIs ====================
    {
      category: "Media",
      name: "Get All Media",
      method: "GET",
      endpoint: "/api/media",
      description: "Lấy danh sách tất cả media"
    },

    // ==================== ADMIN APIs ====================
    {
      category: "Admin",
      name: "Get Admin Stats",
      method: "GET",
      endpoint: "/api/admin/stats",
      description: "Lấy thống kê admin (chỉ admin)",
      requiresAdmin: true
    },
    {
      category: "Admin",
      name: "Get Admin Users",
      method: "GET",
      endpoint: "/api/admin/users",
      description: "Lấy danh sách users cho admin (chỉ admin)",
      requiresAdmin: true
    }
  ];

  const testApi = async (endpoint, retryCount = 0) => {
    const key = `${endpoint.method}-${endpoint.endpoint}`;
    setLoading(prev => ({ ...prev, [key]: true }));
    
    try {
      let url = endpoint.endpoint;
      
      // Replace placeholders with actual values
      if (endpoint.needsInput === "userId" && testData.userId) {
        url = url.replace("{userId}", testData.userId);
      } else if (endpoint.needsInput === "postId" && testData.postId) {
        url = url.replace("{postId}", testData.postId);
      } else if (endpoint.needsInput === "groupId" && testData.groupId) {
        url = url.replace("{groupId}", testData.groupId);
      } else if (endpoint.needsInput === "searchQuery" && testData.searchQuery) {
        url = url.replace("{query}", encodeURIComponent(testData.searchQuery));
      }

      // Add query parameters for search endpoints
      if (endpoint.endpoint.includes("search") && !url.includes("?")) {
        const query = endpoint.needsInput === "searchQuery" ? testData.searchQuery : "test";
        url += `?q=${encodeURIComponent(query)}`;
      }

      const result = await api(url, {
        method: endpoint.method,
        body: endpoint.method !== "GET" ? { test: true } : undefined
      });

      setResults(prev => ({
        ...prev,
        [key]: {
          status: "success",
          data: result,
          timestamp: new Date().toLocaleTimeString(),
          retryCount: retryCount
        }
      }));

      // Clear rate limit info on success
      setRateLimitInfo(prev => {
        const newInfo = { ...prev };
        delete newInfo[key];
        return newInfo;
      });

    } catch (error) {
      // Check if it's a rate limit error
      const isRateLimit = error.message.includes("429") || 
                         error.message.includes("rate limit") || 
                         error.message.includes("quá nhiều yêu cầu");

      if (isRateLimit && testSettings.retryOnRateLimit && retryCount < testSettings.maxRetries) {
        // Calculate retry delay (exponential backoff)
        const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        
        setRateLimitInfo(prev => ({
          ...prev,
          [key]: {
            retryCount: retryCount + 1,
            nextRetry: new Date(Date.now() + retryDelay).toLocaleTimeString(),
            delay: retryDelay
          }
        }));

        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return testApi(endpoint, retryCount + 1);
      }

      setResults(prev => ({
        ...prev,
        [key]: {
          status: "error",
          error: error.message,
          timestamp: new Date().toLocaleTimeString(),
          retryCount: retryCount,
          isRateLimit: isRateLimit
        }
      }));
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const testAllApis = async () => {
    // Process APIs in batches to avoid overwhelming the server
    const batchSize = testSettings.maxConcurrentRequests;
    
    for (let i = 0; i < apiEndpoints.length; i += batchSize) {
      const batch = apiEndpoints.slice(i, i + batchSize);
      
      // Test batch concurrently
      await Promise.all(batch.map(endpoint => testApi(endpoint)));
      
      // Delay between batches
      if (i + batchSize < apiEndpoints.length) {
        await new Promise(resolve => setTimeout(resolve, testSettings.delayBetweenRequests));
      }
    }
  };

  const clearResults = () => {
    setResults({});
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "success": return "text-green-600 bg-green-50";
      case "error": return "text-red-600 bg-red-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "success": return "✅";
      case "error": return "❌";
      default: return "⏳";
    }
  };

  return (
    <div className="w-full px-6 py-6 pt-20">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">API Tester</h1>
        
        {/* Admin Info */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="text-purple-600 mt-0.5">👑</div>
            <div>
              <h3 className="font-semibold text-purple-900 mb-2">Admin APIs</h3>
              <p className="text-sm text-purple-800">
                Một số API yêu cầu quyền admin để truy cập. Đảm bảo bạn đã đăng nhập với tài khoản admin.
                Các API có badge <span className="px-1 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">Admin Only</span> sẽ trả về lỗi 403 nếu không có quyền.
              </p>
            </div>
          </div>
        </div>

        {/* Rate Limiting Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 mt-0.5">ℹ️</div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Rate Limiting Protection</h3>
              <p className="text-sm text-blue-800 mb-2">
                Để tránh bị rate limit khi test API, hãy điều chỉnh các settings sau:
              </p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Delay Between Requests:</strong> Tăng delay giữa các requests (khuyến nghị: 500-1000ms)</li>
                <li>• <strong>Max Concurrent Requests:</strong> Giảm số requests đồng thời (khuyến nghị: 2-3)</li>
                <li>• <strong>Auto Retry:</strong> Bật để tự động retry khi bị rate limit</li>
                <li>• <strong>Max Retries:</strong> Số lần retry tối đa (khuyến nghị: 3-5)</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Test Settings */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Delay Between Requests (ms)</label>
              <input
                type="number"
                value={testSettings.delayBetweenRequests}
                onChange={(e) => setTestSettings(prev => ({ ...prev, delayBetweenRequests: parseInt(e.target.value) || 500 }))}
                className="w-full px-3 py-2 border rounded-lg"
                min="100"
                max="5000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Concurrent Requests</label>
              <input
                type="number"
                value={testSettings.maxConcurrentRequests}
                onChange={(e) => setTestSettings(prev => ({ ...prev, maxConcurrentRequests: parseInt(e.target.value) || 3 }))}
                className="w-full px-3 py-2 border rounded-lg"
                min="1"
                max="10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Retries</label>
              <input
                type="number"
                value={testSettings.maxRetries}
                onChange={(e) => setTestSettings(prev => ({ ...prev, maxRetries: parseInt(e.target.value) || 3 }))}
                className="w-full px-3 py-2 border rounded-lg"
                min="0"
                max="10"
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={testSettings.retryOnRateLimit}
                  onChange={(e) => setTestSettings(prev => ({ ...prev, retryOnRateLimit: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm font-medium">Auto Retry on Rate Limit</span>
              </label>
            </div>
          </div>
        </div>

        {/* Test Data Input */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Data</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">User ID</label>
              <input
                type="text"
                value={testData.userId}
                onChange={(e) => setTestData(prev => ({ ...prev, userId: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Enter user ID for testing"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Post ID</label>
              <input
                type="text"
                value={testData.postId}
                onChange={(e) => setTestData(prev => ({ ...prev, postId: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Enter post ID for testing"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Group ID</label>
              <input
                type="text"
                value={testData.groupId}
                onChange={(e) => setTestData(prev => ({ ...prev, groupId: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Enter group ID for testing"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Search Query</label>
              <input
                type="text"
                value={testData.searchQuery}
                onChange={(e) => setTestData(prev => ({ ...prev, searchQuery: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Enter search query"
              />
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={testAllApis}
            className="btn bg-blue-600 text-white hover:bg-blue-700"
          >
            Test All APIs
          </button>
          <button
            onClick={clearResults}
            className="btn-outline"
          >
            Clear Results
          </button>
          <button
            onClick={() => setTestSettings({
              delayBetweenRequests: 500,
              maxConcurrentRequests: 3,
              retryOnRateLimit: true,
              maxRetries: 3
            })}
            className="btn-outline text-gray-600"
          >
            Reset Settings
          </button>
        </div>

        {/* API Results */}
        <div className="space-y-6">
          {Object.entries(apiEndpoints.reduce((acc, endpoint) => {
            const category = endpoint.category;
            if (!acc[category]) acc[category] = [];
            acc[category].push(endpoint);
            return acc;
          }, {})).map(([category, endpoints]) => (
            <div key={category} className="card">
              <h2 className="text-xl font-semibold mb-4">{category}</h2>
              <div className="space-y-3">
                {endpoints.map((endpoint) => {
                  const key = `${endpoint.method}-${endpoint.endpoint}`;
                  const result = results[key];
                  const isLoading = loading[key];
                  
                  return (
                    <div key={key} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            endpoint.method === "GET" ? "bg-green-100 text-green-800" :
                            endpoint.method === "POST" ? "bg-blue-100 text-blue-800" :
                            endpoint.method === "PUT" ? "bg-yellow-100 text-yellow-800" :
                            "bg-red-100 text-red-800"
                          }`}>
                            {endpoint.method}
                          </span>
                          <code className="text-sm font-mono">{endpoint.endpoint}</code>
                          {endpoint.requiresAdmin && (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              Admin Only
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isLoading && (
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          )}
                          <button
                            onClick={() => testApi(endpoint)}
                            disabled={isLoading}
                            className="btn-sm"
                          >
                            Test
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{endpoint.description}</p>
                      
                      {result && (
                        <div className={`p-3 rounded-lg ${getStatusColor(result.status)}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <span>{getStatusIcon(result.status)}</span>
                            <span className="font-medium">
                              {result.status === "success" ? "Success" : "Error"}
                            </span>
                            <span className="text-xs opacity-75">({result.timestamp})</span>
                            {result.retryCount > 0 && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                Retry {result.retryCount}
                              </span>
                            )}
                            {result.isRateLimit && (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                Rate Limited
                              </span>
                            )}
                          </div>
                          
                          {result.status === "success" ? (
                            <pre className="text-xs overflow-auto max-h-32 bg-white bg-opacity-50 p-2 rounded">
                              {JSON.stringify(result.data, null, 2)}
                            </pre>
                          ) : (
                            <div className="text-sm">
                              <strong>Error:</strong> {result.error}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Rate Limit Info */}
                      {rateLimitInfo[key] && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                          <div className="flex items-center gap-2 text-yellow-800">
                            <span>⏳</span>
                            <span>Retrying in {rateLimitInfo[key].delay}ms...</span>
                            <span className="text-xs">(Attempt {rateLimitInfo[key].retryCount})</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
