#!/usr/bin/env node

/**
 * Test Posts API
 * Test các endpoint posts để đảm bảo không còn lỗi 400/403
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.API_URL || 'http://localhost:4000';

/**
 * Test posts API with various parameters
 */
async function testPostsAPI() {
  console.log('🧪 Testing Posts API...\n');
  
  const testCases = [
    {
      name: 'Published posts (no auth)',
      url: '/api/posts?status=published&limit=50',
      expectedStatus: 200
    },
    {
      name: 'Published posts with undefined author',
      url: '/api/posts?author=undefined&status=published&limit=50',
      expectedStatus: 200
    },
    {
      name: 'Private posts without auth',
      url: '/api/posts?author=undefined&status=private&limit=50',
      expectedStatus: 401
    },
    {
      name: 'Invalid author ID',
      url: '/api/posts?author=invalid-id&status=published&limit=50',
      expectedStatus: 400
    },
    {
      name: 'Empty author parameter',
      url: '/api/posts?author=&status=published&limit=50',
      expectedStatus: 200
    },
    {
      name: 'Posts with search query',
      url: '/api/posts?q=test&status=published&limit=50',
      expectedStatus: 200
    }
  ];
  
  for (const testCase of testCases) {
    try {
      console.log(`📤 Testing: ${testCase.name}`);
      console.log(`   URL: ${testCase.url}`);
      
      const response = await fetch(`${BASE_URL}${testCase.url}`);
      const data = await response.json();
      
      console.log(`   Status: ${response.status}`);
      console.log(`   Expected: ${testCase.expectedStatus}`);
      
      if (response.status === testCase.expectedStatus) {
        console.log(`   ✅ PASS`);
      } else {
        console.log(`   ❌ FAIL - Expected ${testCase.expectedStatus}, got ${response.status}`);
        if (data.error) {
          console.log(`   Error: ${data.error}`);
        }
      }
      
      console.log('');
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}\n`);
    }
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
 * Test with authentication (if possible)
 */
async function testPostsWithAuth() {
  console.log('\n🔐 Testing Posts API with Authentication...\n');
  
  try {
    // Try to get a token first
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
    
    if (loginResponse.status === 401) {
      console.log('   ℹ️  Cannot test with auth without valid credentials');
      return;
    }
    
    const loginData = await loginResponse.json();
    
    if (loginData.accessToken) {
      // Test private posts with valid token
      const privateResponse = await fetch(`${BASE_URL}/api/posts?status=private&limit=50`, {
        headers: {
          'Authorization': `Bearer ${loginData.accessToken}`
        }
      });
      
      console.log(`   Private posts status: ${privateResponse.status}`);
      
      if (privateResponse.status === 200) {
        console.log('   ✅ Private posts accessible with valid token');
      } else {
        console.log('   ⚠️  Private posts not accessible');
      }
    }
    
  } catch (error) {
    console.log('   ❌ Error testing with auth:', error.message);
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting Posts API Tests...\n');
  
  // Test server health first
  const isHealthy = await testServerHealth();
  if (!isHealthy) {
    console.log('\n❌ Server is not healthy, stopping tests');
    return;
  }
  
  console.log('\n✅ Server is healthy, proceeding with tests...\n');
  
  // Run tests
  await testPostsAPI();
  await testPostsWithAuth();
  
  console.log('\n✅ All tests completed!');
  console.log('\n📝 Summary:');
  console.log('   - Posts API should handle undefined author gracefully');
  console.log('   - Private posts should require authentication');
  console.log('   - Invalid author IDs should return 400');
  console.log('   - No more 400/403 errors from frontend');
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests };
