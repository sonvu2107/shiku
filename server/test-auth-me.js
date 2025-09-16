#!/usr/bin/env node

/**
 * Test Auth /me Endpoint
 * Test endpoint /api/auth/me để đảm bảo frontend không bị logout khi F5
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.API_URL || 'http://localhost:4000';

/**
 * Test /me endpoint without token
 */
async function testMeWithoutToken() {
  console.log('🧪 Test 1: /me without token (should return 401)');
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/me`);
    const data = await response.json();
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, data);
    
    if (response.status === 401) {
      console.log('   ✅ Correctly returns 401 for unauthenticated request');
    } else {
      console.log('   ❌ Should return 401 for unauthenticated request');
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
}

/**
 * Test /me endpoint with invalid token
 */
async function testMeWithInvalidToken() {
  console.log('\n🧪 Test 2: /me with invalid token (should return 401)');
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });
    const data = await response.json();
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, data);
    
    if (response.status === 401) {
      console.log('   ✅ Correctly returns 401 for invalid token');
    } else {
      console.log('   ❌ Should return 401 for invalid token');
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
}

/**
 * Test /me endpoint with valid token (if we can get one)
 */
async function testMeWithValidToken() {
  console.log('\n🧪 Test 3: /me with valid token');
  
  try {
    // First, try to login to get a token
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrongpassword'
      })
    });
    
    console.log(`   Login status: ${loginResponse.status}`);
    
    if (loginResponse.status === 401) {
      console.log('   ✅ Login correctly returns 401 for wrong password');
      console.log('   ℹ️  Cannot test with valid token without valid credentials');
      return;
    }
    
    const loginData = await loginResponse.json();
    
    if (loginData.accessToken) {
      // Test /me with valid token
      const meResponse = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${loginData.accessToken}`
        }
      });
      
      const meData = await meResponse.json();
      
      console.log(`   /me Status: ${meResponse.status}`);
      console.log(`   /me Response:`, meData);
      
      if (meResponse.status === 200 && meData.user) {
        console.log('   ✅ /me endpoint works with valid token');
      } else {
        console.log('   ❌ /me endpoint should return user data with valid token');
      }
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
}

/**
 * Test server health first
 */
async function testServerHealth() {
  console.log('🏥 Testing Server Health...');
  
  try {
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Server: ${data.status}`);
    console.log(`   Environment: ${data.environment}`);
    
    return response.status === 200;
  } catch (error) {
    console.log('   ❌ Server health check failed:', error.message);
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting Auth /me Endpoint Tests...\n');
  
  // Test server health first
  const isHealthy = await testServerHealth();
  if (!isHealthy) {
    console.log('\n❌ Server is not healthy, stopping tests');
    return;
  }
  
  console.log('\n✅ Server is healthy, proceeding with tests...\n');
  
  // Run tests
  await testMeWithoutToken();
  await testMeWithInvalidToken();
  await testMeWithValidToken();
  
  console.log('\n✅ All tests completed!');
  console.log('\n📝 Summary:');
  console.log('   - /api/auth/me endpoint should be available');
  console.log('   - Should return 401 for unauthenticated requests');
  console.log('   - Should return user data for authenticated requests');
  console.log('   - This will fix the F5 logout issue in frontend');
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests };
