// Safari-specific session handling
// This utility helps manage sessions and cookies specifically for Safari compatibility

/**
 * Safari Session Manager
 * Handles session initialization and cookie management for Safari
 */

/**
 * Initialize Safari session
 * This function should be called when the app loads to ensure Safari has a session
 */
export async function initializeSafariSession() {
  try {
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
    
    // First, try to get CSRF status to check if we have a session
    const statusResponse = await fetch(`${API_URL}/api/csrf-status`, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors',
      cache: 'no-cache',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    
    if (statusResponse.ok) {
      const status = await statusResponse.json();

      if (status.sessionStatus.hasSession) {
        return true;
      }
    }

    // If no session, try to create one by calling a simple endpoint
    
    const sessionResponse = await fetch(`${API_URL}/api/csrf-token`, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors',
      cache: 'no-cache',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    
    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json();
      return true;
    } else {
      console.error("Failed to create Safari session:", sessionResponse.status);
      return false;
    }
    
  } catch (error) {
    console.error("Error initializing Safari session:", error);
    return false;
  }
}

/**
 * Check if Safari session is valid
 */
export async function checkSafariSession() {
  try {
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
    
    const response = await fetch(`${API_URL}/api/csrf-status`, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors',
      cache: 'no-cache'
    });
    
    if (response.ok) {
      const status = await response.json();
      return status.sessionStatus.hasSession;
    }
    
    return false;
  } catch (error) {
    console.error("Error checking Safari session:", error);
    return false;
  }
}

/**
 * Safari-specific cookie test
 * Test if Safari can receive and send cookies properly
 */
export async function testSafariCookies() {
  try {
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
    
    // Test cookie reception
    const testResponse = await fetch(`${API_URL}/api/csrf-status`, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors',
      cache: 'no-cache'
    });
    
    if (testResponse.ok) {
      const data = await testResponse.json();

      const hasCookies = Object.keys(data.cookiesReceived).length > 0;

      return {
        canReceiveCookies: hasCookies,
        sessionExists: data.sessionStatus.hasSession,
        csrfTokenExists: data.csrfStatus.hasStoredToken,
        cookies: data.cookiesReceived
      };
    }
    
    return {
      canReceiveCookies: false,
      sessionExists: false,
      csrfTokenExists: false,
      cookies: {}
    };
    
  } catch (error) {
    console.error("Safari cookie test failed:", error);
    return {
      canReceiveCookies: false,
      sessionExists: false,
      csrfTokenExists: false,
      cookies: {},
      error: error.message
    };
  }
}

/**
 * Safari session recovery
 * Attempt to recover session if it's lost
 */
export async function recoverSafariSession() {
  try {
    // First, try to initialize a new session
    const sessionCreated = await initializeSafariSession();

    if (sessionCreated) {
      return true;
    }

    // If that fails, try a different approach
    
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
    
    // Try to make a simple request that should create a session
    const recoveryResponse = await fetch(`${API_URL}/api/csrf-token`, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors',
      cache: 'no-cache',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });

    if (recoveryResponse.ok) {
      return true;
    }

    console.error("All session recovery methods failed");
    return false;
    
  } catch (error) {
    console.error("Safari session recovery error:", error);
    return false;
  }
}
