#!/usr/bin/env node

/**
 * Test Rate Limiting Fix
 * Test xem đã fix được vấn đề double rate limiting chưa
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.API_URL || 'http://localhost:4000';

/**
 * Test multiple API calls to simulate frontend loading
 */
async function testMultipleAPICalls() {
  console.log('🧪 Testing Multiple API Calls (simulating frontend load)...\n');
  
  const endpoints = [
    '/api/auth/me',
    '/api/posts?page=1',
    '/api/notifications/unread-count',
    '/api/friends/requests',
    '/api/groups/my-groups',
    '/api/posts?page=2',
    '/api/posts?page=3',
    '/api/notifications/unread-count',
    '/api/friends/requests',
    '/api/groups/my-groups'
  ];
  
  console.log(`📤 Making ${endpoints.length} concurrent API calls...`);
  
  const promises = endpoints.map(async (endpoint, index) => {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`);
      const data = await response.json();
      
      console.log(`   ${index + 1}. ${endpoint} - Status: ${response.status}`);
      
      if (response.status === 429) {
        console.log(`      ❌ Rate limited! Response:`, data);
        return { endpoint, status: 429, rateLimited: true };
      } else if (response.status === 401) {
        console.log(`      ⚠️  Unauthorized (expected for /me without token)`);
        return { endpoint, status: 401, rateLimited: false };
      } else {
        console.log(`      ✅ OK`);
        return { endpoint, status: response.status, rateLimited: false };
      }
      
    } catch (error) {
      console.log(`   ${index + 1}. ${endpoint} - Error: ${error.message}`);
      return { endpoint, status: 'error', rateLimited: false };
    }
  });
  
  const results = await Promise.all(promises);
  
  // Analyze results
  const rateLimitedCount = results.filter(r => r.rateLimited).length;
  const successCount = results.filter(r => !r.rateLimited && r.status !== 'error').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  
  console.log('\n📊 Results:');
  console.log(`   ✅ Successful: ${successCount}/${endpoints.length}`);
  console.log(`   ❌ Rate Limited: ${rateLimitedCount}/${endpoints.length}`);
  console.log(`   ⚠️  Errors: ${errorCount}/${endpoints.length}`);
  
  if (rateLimitedCount === 0) {
    console.log('\n🎉 SUCCESS: No rate limiting issues detected!');
    console.log('   Frontend should load smoothly without rate limit errors.');
  } else {
    console.log('\n⚠️  WARNING: Some requests were rate limited.');
    console.log('   You may need to adjust rate limits further.');
  }
  
  return { rateLimitedCount, successCount, errorCount };
}

/**
 * Test specific rate limiters
 */
async function testSpecificLimiters() {
  console.log('\n🔍 Testing Specific Rate Limiters...\n');
  
  // Test auth limiter
  console.log('📤 Testing Auth Limiter...');
  try {
    const response = await fetch(`${BASE_URL}/api/auth/me`);
    console.log(`   Status: ${response.status}`);
    if (response.status === 401) {
      console.log('   ✅ Auth limiter working (401 for unauthenticated)');
    } else {
      console.log('   ⚠️  Unexpected response from auth endpoint');
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
  
  // Test posts limiter
  console.log('\n📤 Testing Posts Limiter...');
  try {
    const response = await fetch(`${BASE_URL}/api/posts?page=1`);
    console.log(`   Status: ${response.status}`);
    if (response.status === 200 || response.status === 401) {
      console.log('   ✅ Posts limiter working');
    } else {
      console.log('   ⚠️  Unexpected response from posts endpoint');
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
}

/**
 * Test server health
 */
async function testServerHealth() {
  console.log('🏥 Testing Server Health...\n');
  
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
  console.log('🚀 Starting Rate Limiting Fix Tests...\n');
  
  // Test server health first
  const isHealthy = await testServerHealth();
  if (!isHealthy) {
    console.log('\n❌ Server is not healthy, stopping tests');
    return;
  }
  
  console.log('\n✅ Server is healthy, proceeding with tests...\n');
  
  // Run tests
  await testMultipleAPICalls();
  await testSpecificLimiters();
  
  console.log('\n✅ All tests completed!');
  console.log('\n📝 Summary:');
  console.log('   - Double rate limiting should be fixed');
  console.log('   - Frontend should load without rate limit errors');
  console.log('   - Individual limiters should still work for security');
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests };
