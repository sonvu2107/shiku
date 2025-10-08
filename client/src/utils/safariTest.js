// Safari Test Utility
// This script helps test Safari session and cookie functionality

/**
 * Test Safari session and cookie functionality
 * Run this in Safari console to debug session issues
 */
export async function testSafariSession() {
  console.log("=== Safari Session Test ===");
  
  try {
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
    
    // Test 1: Check current session status
    console.log("1. Checking current session status...");
    const statusResponse = await fetch(`${API_URL}/api/csrf-status`, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors',
      cache: 'no-cache'
    });
    
    if (statusResponse.ok) {
      const status = await statusResponse.json();
      console.log("Session status:", status);
      
      if (!status.sessionStatus.hasSession) {
        console.warn("❌ No session found! Attempting to create one...");
        
        // Test 2: Try to create a session
        console.log("2. Attempting to create session...");
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
          console.log("✅ Session created:", sessionData);
          
          // Test 3: Verify session was created
          console.log("3. Verifying session creation...");
          const verifyResponse = await fetch(`${API_URL}/api/csrf-status`, {
            method: 'GET',
            credentials: 'include',
            mode: 'cors',
            cache: 'no-cache'
          });
          
          if (verifyResponse.ok) {
            const verifyData = await verifyResponse.json();
            console.log("Session verification:", verifyData);
            
            if (verifyData.sessionStatus.hasSession) {
              console.log("✅ Session successfully created and verified!");
              return true;
            } else {
              console.error("❌ Session creation failed - no session after creation");
              return false;
            }
          } else {
            console.error("❌ Failed to verify session:", verifyResponse.status);
            return false;
          }
        } else {
          console.error("❌ Failed to create session:", sessionResponse.status);
          return false;
        }
      } else {
        console.log("✅ Session already exists");
        return true;
      }
    } else {
      console.error("❌ Failed to check session status:", statusResponse.status);
      return false;
    }
    
  } catch (error) {
    console.error("❌ Safari session test failed:", error);
    return false;
  }
}

/**
 * Test Safari cookie functionality
 */
export async function testSafariCookies() {
  console.log("=== Safari Cookie Test ===");
  
  try {
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
    
    // Test cookie reception
    const response = await fetch(`${API_URL}/api/csrf-status`, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors',
      cache: 'no-cache'
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log("Cookie test result:", data);
      
      const hasCookies = Object.keys(data.cookiesReceived).length > 0;
      console.log("Safari can receive cookies:", hasCookies);
      
      if (hasCookies) {
        console.log("✅ Safari cookie functionality working");
        return true;
      } else {
        console.warn("⚠️ Safari cannot receive cookies - this may be a configuration issue");
        return false;
      }
    } else {
      console.error("❌ Cookie test failed:", response.status);
      return false;
    }
    
  } catch (error) {
    console.error("❌ Safari cookie test failed:", error);
    return false;
  }
}

/**
 * Comprehensive Safari test
 */
export async function runSafariTests() {
  console.log("🚀 Running comprehensive Safari tests...");
  
  const cookieTest = await testSafariCookies();
  const sessionTest = await testSafariSession();
  
  console.log("=== Test Results ===");
  console.log("Cookie functionality:", cookieTest ? "✅ Working" : "❌ Failed");
  console.log("Session functionality:", sessionTest ? "✅ Working" : "❌ Failed");
  
  if (cookieTest && sessionTest) {
    console.log("🎉 All Safari tests passed! Your browser should work properly.");
    return true;
  } else {
    console.log("⚠️ Some Safari tests failed. You may experience issues with like/emote buttons.");
    return false;
  }
}

// Make functions available globally for console testing
if (typeof window !== 'undefined') {
  window.testSafariSession = testSafariSession;
  window.testSafariCookies = testSafariCookies;
  window.runSafariTests = runSafariTests;
}
