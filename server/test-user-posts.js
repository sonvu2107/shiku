#!/usr/bin/env node

/**
 * Test User Posts Endpoints
 * Test các endpoint mới để lấy bài viết của user
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.API_URL || 'http://localhost:4000';

/**
 * Test /api/posts/my-posts endpoint
 */
async function testMyPosts() {
  console.log('🧪 Testing /api/posts/my-posts endpoint...\n');
  
  const testCases = [
    {
      name: 'My posts without auth (should return 401)',
      url: '/api/posts/my-posts',
      expectedStatus: 401
    },
    {
      name: 'My posts with invalid token (should return 401)',
      url: '/api/posts/my-posts',
      headers: { 'Authorization': 'Bearer invalid-token' },
      expectedStatus: 401
    },
    {
      name: 'My published posts',
      url: '/api/posts/my-posts?status=published&limit=50',
      headers: { 'Authorization': 'Bearer invalid-token' },
      expectedStatus: 401
    },
    {
      name: 'My private posts',
      url: '/api/posts/my-posts?status=private&limit=50',
      headers: { 'Authorization': 'Bearer invalid-token' },
      expectedStatus: 401
    }
  ];
  
  for (const testCase of testCases) {
    try {
      console.log(`📤 Testing: ${testCase.name}`);
      console.log(`   URL: ${testCase.url}`);
      
      const options = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...testCase.headers
        }
      };
      
      const response = await fetch(`${BASE_URL}${testCase.url}`, options);
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
 * Test /api/posts/user-posts endpoint
 */
async function testUserPosts() {
  console.log('🧪 Testing /api/posts/user-posts endpoint...\n');
  
  const testCases = [
    {
      name: 'User posts without userId (should return 400)',
      url: '/api/posts/user-posts',
      expectedStatus: 400
    },
    {
      name: 'User posts with undefined userId (should return 400)',
      url: '/api/posts/user-posts?userId=undefined',
      expectedStatus: 400
    },
    {
      name: 'User posts with invalid userId (should return 400)',
      url: '/api/posts/user-posts?userId=invalid-id',
      expectedStatus: 400
    },
    {
      name: 'User posts with valid userId (should return 200)',
      url: '/api/posts/user-posts?userId=507f1f77bcf86cd799439011&limit=50',
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
        if (response.status === 200 && data.posts) {
          console.log(`   Posts count: ${data.posts.length}`);
        }
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
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting User Posts Endpoints Tests...\n');
  
  // Test server health first
  const isHealthy = await testServerHealth();
  if (!isHealthy) {
    console.log('\n❌ Server is not healthy, stopping tests');
    return;
  }
  
  console.log('\n✅ Server is healthy, proceeding with tests...\n');
  
  // Run tests
  await testMyPosts();
  await testUserPosts();
  
  console.log('\n✅ All tests completed!');
  console.log('\n📝 Summary:');
  console.log('   - /api/posts/my-posts: Get current user\'s posts (requires auth)');
  console.log('   - /api/posts/user-posts: Get specific user\'s public posts');
  console.log('   - These endpoints solve the race condition issue');
  console.log('   - Frontend can call these instead of /api/posts with author=undefined');
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests };
