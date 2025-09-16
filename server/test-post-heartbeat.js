#!/usr/bin/env node

/**
 * Test POST Heartbeat Endpoint
 * Test endpoint POST /api/auth/heartbeat để đảm bảo frontend monitoring hoạt động
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.API_URL || 'http://localhost:4000';

/**
 * Test POST /api/auth/heartbeat without token
 */
async function testPostHeartbeatWithoutToken() {
  console.log('🧪 Test 1: POST /api/auth/heartbeat without token (should return 401)');
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
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
 * Test POST /api/auth/heartbeat with invalid token
 */
async function testPostHeartbeatWithInvalidToken() {
  console.log('\n🧪 Test 2: POST /api/auth/heartbeat with invalid token (should return 401)');
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
 * Test POST /api/auth/heartbeat with valid token (if we can get one)
 */
async function testPostHeartbeatWithValidToken() {
  console.log('\n🧪 Test 3: POST /api/auth/heartbeat with valid token');
  
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
      // Test POST /api/auth/heartbeat with valid token
      const heartbeatResponse = await fetch(`${BASE_URL}/api/auth/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.accessToken}`
        }
      });
      
      const heartbeatData = await heartbeatResponse.json();
      
      console.log(`   /heartbeat Status: ${heartbeatResponse.status}`);
      console.log(`   /heartbeat Response:`, heartbeatData);
      
      if (heartbeatResponse.status === 200 && heartbeatData.status === 'ok') {
        console.log('   ✅ POST /api/auth/heartbeat endpoint works with valid token');
      } else {
        console.log('   ❌ POST /api/auth/heartbeat endpoint should return 200 with status ok');
      }
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
}

/**
 * Test GET /heartbeat for comparison
 */
async function testGetHeartbeat() {
  console.log('\n🧪 Test 4: GET /heartbeat (for comparison)');
  
  try {
    const response = await fetch(`${BASE_URL}/heartbeat`);
    const data = await response.json();
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, data);
    
    if (response.status === 200 && data.status === 'ok') {
      console.log('   ✅ GET /heartbeat endpoint works');
    } else {
      console.log('   ❌ GET /heartbeat endpoint should return 200 with status ok');
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
  console.log('🚀 Starting POST Heartbeat Endpoint Tests...\n');
  
  // Test server health first
  const isHealthy = await testServerHealth();
  if (!isHealthy) {
    console.log('\n❌ Server is not healthy, stopping tests');
    return;
  }
  
  console.log('\n✅ Server is healthy, proceeding with tests...\n');
  
  // Run tests
  await testPostHeartbeatWithoutToken();
  await testPostHeartbeatWithInvalidToken();
  await testPostHeartbeatWithValidToken();
  await testGetHeartbeat();
  
  console.log('\n✅ All tests completed!');
  console.log('\n📝 Summary:');
  console.log('   - POST /api/auth/heartbeat endpoint should be available');
  console.log('   - Should return 401 for unauthenticated requests');
  console.log('   - Should return 200 with status ok for authenticated requests');
  console.log('   - This will fix the frontend heartbeat monitoring');
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests };
