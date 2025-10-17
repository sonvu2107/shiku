import { useState, useEffect } from "react";
import { checkCookies } from "../utils/tokenManager.js";

/**
 * Debug component to check session persistence
 */
export default function SessionDebug() {
  const [debugInfo, setDebugInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkSession = async () => {
    setLoading(true);
    try {
      const info = await checkCookies();
      setDebugInfo(info);
    } catch (error) {
      console.error("Debug check failed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  if (!debugInfo) {
    return (
      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h3 className="text-lg font-bold mb-2">Session Debug</h3>
        <p>Loading debug info...</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <h3 className="text-lg font-bold mb-2">Session Debug</h3>
      
      <div className="space-y-2 text-sm">
        <div>
          <strong>Timestamp:</strong> {debugInfo.timestamp}
        </div>
        
        <div>
          <strong>Cookies:</strong>
          <ul className="ml-4">
            <li>Access Token: <span className={debugInfo.cookies.accessToken === "EXISTS" ? "text-green-600" : "text-red-600"}>{debugInfo.cookies.accessToken}</span></li>
            <li>Refresh Token: <span className={debugInfo.cookies.refreshToken === "EXISTS" ? "text-green-600" : "text-red-600"}>{debugInfo.cookies.refreshToken}</span></li>
            <li>CSRF Token: <span className={debugInfo.cookies.csrf === "EXISTS" ? "text-green-600" : "text-red-600"}>{debugInfo.cookies.csrf}</span></li>
          </ul>
        </div>
        
        <div>
          <strong>Cookie Names:</strong> {debugInfo.cookieNames.join(", ") || "None"}
        </div>
        
        <div>
          <strong>Message:</strong> {debugInfo.message}
        </div>
      </div>
      
      <button 
        onClick={checkSession}
        disabled={loading}
        className="mt-3 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? "Checking..." : "Refresh Debug Info"}
      </button>
    </div>
  );
}
